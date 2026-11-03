import React, { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  IconCircleCheck,
  IconCircleX,
  IconDownload,
  IconInbox,
  IconSearch,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import Loader from "@/components/Loader"
import {
  registrationRepo,
  APPLICATION_STATUSES,
  type Application,
  type ApplicationList,
  type ApplicationStatus,
} from "@/repositories/registrationRepo"

const PAGE_SIZE = 20

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  New: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-none",
  Shortlisted: "bg-green-500/10 text-green-600 dark:text-green-400 border-none",
  Rejected: "bg-red-500/10 text-red-600 dark:text-red-400 border-none",
}

// Order of fields in the detail panel and the CSV
const FIELDS: { key: keyof Application; label: string }[] = [
  { key: "fullName", label: "Full name" },
  { key: "fatherOrGuardianName", label: "Father/Guardian name" },
  { key: "cnicNumber", label: "CNIC" },
  { key: "dateOfBirth", label: "Date of birth" },
  { key: "gender", label: "Gender" },
  { key: "emailAddress", label: "Email" },
  { key: "phoneNumber", label: "Phone" },
  { key: "guardianNumber", label: "Guardian number" },
  { key: "address", label: "Address" },
  { key: "course", label: "Course" },
  { key: "teacherName", label: "Teacher" },
  { key: "campus", label: "Campus" },
  { key: "obtainedMarks", label: "Obtained marks" },
  { key: "aboutYou", label: "About" },
]

const statusOf = (a: Application): ApplicationStatus => a.status || "New"

// New submissions store "3001234567"; older ones may already contain spaces
const formatPhone = (phone?: string) => {
  if (!phone) return ""
  const digits = phone.replace(/\D/g, "")
  return digits.length === 10 ? `+92 ${digits.slice(0, 3)} ${digits.slice(3)}` : phone
}

const formatDate = (value?: string, withTime = false) => {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString("en-PK", withTime
    ? { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }
    : { day: "numeric", month: "short", year: "numeric" })
}

const displayValue = (a: Application, key: keyof Application) => {
  if (key === "phoneNumber" || key === "guardianNumber") return formatPhone(a[key] as string)
  if (key === "dateOfBirth") return formatDate(a.dateOfBirth)
  const v = a[key]
  return v === undefined || v === null ? "" : String(v)
}

// Quote every cell, and neutralise leading = + - @ so spreadsheets don't run them as formulas
const csvCell = (value: unknown) => {
  let s = value === undefined || value === null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

const downloadCsv = (rows: Application[]) => {
  const dynamicKeys = Array.from(new Set(rows.flatMap((r) => Object.keys(r.dynamicData || {}))))
  const header = [...FIELDS.map((f) => f.label), ...dynamicKeys, "Status", "Submitted"]
  const lines = rows.map((r) => [
    ...FIELDS.map((f) => displayValue(r, f.key)),
    ...dynamicKeys.map((k) => r.dynamicData?.[k]),
    statusOf(r),
    formatDate(r.createdAt, true),
  ].map(csvCell).join(","))
  // BOM so Excel opens it as UTF-8
  const blob = new Blob(["﻿" + [header.map(csvCell).join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `applications-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

const Applications: React.FC = () => {
  const [rows, setRows] = useState<Application[]>([])
  const [pagination, setPagination] = useState<ApplicationList["pagination"] | null>(null)
  const [counts, setCounts] = useState<ApplicationList["statusCounts"]>({ New: 0, Shortlisted: 0, Rejected: 0 })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [filters, setFilters] = useState({ course: "all", campus: "all", status: "all" })
  const [options, setOptions] = useState<{ courses: string[]; campuses: string[] }>({ courses: [], campuses: [] })
  const [selected, setSelected] = useState<Application | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Application | null>(null)
  const [savingStatus, setSavingStatus] = useState(false)
  const [exporting, setExporting] = useState(false)

  const activeFilters = useMemo(() => ({ search: debouncedSearch, ...filters }), [debouncedSearch, filters])

  const load = useCallback(async (targetPage: number) => {
    setLoading(true)
    try {
      const res = await registrationRepo.list(targetPage, PAGE_SIZE, activeFilters)
      setRows(res.data || [])
      setPagination(res.pagination)
      setCounts(res.statusCounts)
    } catch {
      toast.error("Could not load applications")
    } finally {
      setLoading(false)
    }
  }, [activeFilters])

  useEffect(() => {
    load(page)
  }, [load, page])

  // Debounce typing; a new search starts from page 1
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    registrationRepo.getFilterOptions().then(setOptions).catch(() => {})
  }, [])

  const setFilter = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const changeStatus = async (status: ApplicationStatus) => {
    if (!selected || statusOf(selected) === status) return
    setSavingStatus(true)
    try {
      const updated = await registrationRepo.updateStatus(selected._id, status)
      setSelected(updated)
      toast.success(`Marked as ${status}`)
      load(page)
    } catch {
      toast.error("Could not update status")
    } finally {
      setSavingStatus(false)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      await registrationRepo.remove(pendingDelete._id)
      toast.success("Application deleted")
      setPendingDelete(null)
      setSelected(null)
      // Last row on a later page: step back instead of showing an empty page
      if (rows.length === 1 && page > 1) setPage(page - 1)
      else load(page)
    } catch {
      toast.error("Could not delete application")
    }
  }

  const exportCsv = async () => {
    setExporting(true)
    try {
      const all = await registrationRepo.exportAll(activeFilters)
      if (all.length === 0) {
        toast.info("Nothing to export for these filters")
        return
      }
      downloadCsv(all)
      toast.success(`Exported ${all.length} application${all.length === 1 ? "" : "s"}`)
    } catch {
      toast.error("Export failed")
    } finally {
      setExporting(false)
    }
  }

  const total = counts.New + counts.Shortlisted + counts.Rejected
  const statCards = [
    { label: "Total applications", value: total, status: "all", icon: IconUsers, tone: "blue" },
    { label: "New", value: counts.New, status: "New", icon: IconInbox, tone: "orange" },
    { label: "Shortlisted", value: counts.Shortlisted, status: "Shortlisted", icon: IconCircleCheck, tone: "green" },
    { label: "Rejected", value: counts.Rejected, status: "Rejected", icon: IconCircleX, tone: "red" },
  ] as const
  const toneClasses: Record<(typeof statCards)[number]["tone"], string> = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    green: "bg-green-500/10 text-green-600 dark:text-green-400",
    red: "bg-red-500/10 text-red-600 dark:text-red-400",
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Applications</h1>
          <p className="text-muted-foreground mt-1">Internship registrations submitted on banoqabil.online.</p>
        </div>
        <Button onClick={exportCsv} disabled={exporting} variant="outline" className="gap-2">
          <IconDownload size={18} />
          {exporting ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card
            key={card.label}
            role="button"
            tabIndex={0}
            onClick={() => setFilter("status", card.status)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setFilter("status", card.status)}
            className={`shadow-none cursor-pointer transition-colors hover:bg-muted/40 ${filters.status === card.status ? "ring-2 ring-primary/40" : ""}`}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-2.5 rounded-xl ${toneClasses[card.tone]}`}>
                <card.icon size={22} />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight">{card.value}</p>
                <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-sm bg-muted/20">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="Search by name, CNIC, phone or email..."
                className="pl-10 bg-background h-10 border-none shadow-none focus-visible:ring-1"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Select value={filters.course} onValueChange={(v) => setFilter("course", v)}>
                <SelectTrigger className="h-10 bg-background border-none shadow-none focus-visible:ring-1 w-full lg:w-[180px]">
                  <SelectValue placeholder="Course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All courses</SelectItem>
                  {options.courses.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.campus} onValueChange={(v) => setFilter("campus", v)}>
                <SelectTrigger className="h-10 bg-background border-none shadow-none focus-visible:ring-1 w-full lg:w-[180px]">
                  <SelectValue placeholder="Campus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All campuses</SelectItem>
                  {options.campuses.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.status} onValueChange={(v) => setFilter("status", v)}>
                <SelectTrigger className="h-10 bg-background border-none shadow-none focus-visible:ring-1 w-full lg:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {APPLICATION_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-none shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[260px]">Applicant</TableHead>
                <TableHead>CNIC</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Campus</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center"><Loader /></TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">No applications found.</TableCell>
                </TableRow>
              ) : (
                rows.map((a) => (
                  <TableRow
                    key={a._id}
                    tabIndex={0}
                    onClick={() => setSelected(a)}
                    onKeyDown={(e) => e.key === "Enter" && setSelected(a)}
                    className="cursor-pointer hover:bg-muted/30"
                  >
                    <TableCell>
                      <div className="font-medium">{a.fullName}</div>
                      <div className="text-xs text-muted-foreground">{a.emailAddress}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{a.cnicNumber}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatPhone(a.phoneNumber)}</TableCell>
                    <TableCell className="max-w-[180px] truncate" title={a.course}>{a.course}</TableCell>
                    <TableCell className="max-w-[180px] truncate" title={a.campus}>{a.campus}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(a.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={STATUS_STYLES[statusOf(a)]}>{statusOf(a)}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {pagination && pagination.total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Page {pagination.currentPage} of {Math.max(pagination.totalPages, 1)} · {pagination.total} result{pagination.total === 1 ? "" : "s"}
          </p>
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => page > 1 && setPage(page - 1)}
                  className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  onClick={() => pagination.hasMore && setPage(page + 1)}
                  className={!pagination.hasMore ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.fullName}</SheetTitle>
                <SheetDescription>Submitted {formatDate(selected.createdAt, true)}</SheetDescription>
              </SheetHeader>

              <div className="px-4 flex items-center gap-2">
                <Select value={statusOf(selected)} onValueChange={(v) => changeStatus(v as ApplicationStatus)} disabled={savingStatus}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPLICATION_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" className="gap-2 text-destructive ml-auto" onClick={() => setPendingDelete(selected)}>
                  <IconTrash size={16} />
                  Delete
                </Button>
              </div>

              <dl className="px-4 pb-6 grid grid-cols-1 gap-3">
                {FIELDS.map(({ key, label }) => {
                  const value = displayValue(selected, key)
                  if (!value) return null
                  return (
                    <div key={key} className="rounded-lg border p-3">
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="text-sm mt-0.5 whitespace-pre-wrap break-words">{value}</dd>
                    </div>
                  )
                })}
                {Object.entries(selected.dynamicData || {}).map(([key, value]) => (
                  <div key={key} className="rounded-lg border p-3">
                    <dt className="text-xs text-muted-foreground">{key}</dt>
                    <dd className="text-sm mt-0.5 whitespace-pre-wrap break-words">
                      {Array.isArray(value) ? value.join(", ") : String(value ?? "")}
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this application?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.fullName} ({pendingDelete?.cnicNumber}) will be removed from the list. The same CNIC can then apply again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default Applications
