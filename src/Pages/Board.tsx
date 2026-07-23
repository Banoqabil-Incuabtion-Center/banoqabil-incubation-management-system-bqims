import { useCallback, useEffect, useRef, useState } from "react"
import axios from "axios"
import { toast } from "sonner"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable"

import UrlBreadcrumb from "@/components/UrlBreadcrumb"
import Loader from "@/components/Loader"
import { BoardColumn } from "@/components/board/BoardColumn"
import { TaskCard } from "@/components/board/TaskCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  taskRepo,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "@/repositories/taskRepo"
import { projectRepo } from "@/repositories/projectRepo"
import { userRepo } from "@/repositories/userRepo"

type Board = Record<TaskStatus, Task[]>

interface ProjectOption {
  _id: string
  title: string
}

interface StudentOption {
  _id: string
  name: string
}

const emptyBoard = (): Board =>
  TASK_STATUSES.reduce((acc, status) => ({ ...acc, [status]: [] }), {} as Board)

const isStatus = (id: string): id is TaskStatus =>
  (TASK_STATUSES as readonly string[]).includes(id)

// <input type="date"> wants YYYY-MM-DD, the API hands back an ISO timestamp.
const toDateInput = (value: string | null) => (value ? value.slice(0, 10) : "")

const BoardPage = () => {
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [projectId, setProjectId] = useState<string>("")
  const [students, setStudents] = useState<StudentOption[]>([])

  const [board, setBoard] = useState<Board>(emptyBoard)
  const [loading, setLoading] = useState(true)
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "Backlog" as TaskStatus,
    priority: "Medium" as TaskPriority,
    dueDate: "",
    assignees: [] as string[],
  })

  // handleDragEnd needs the board as it stands *after* handleDragOver has
  // already moved the card across columns, so read it from a ref rather than
  // the render closure.
  const boardRef = useRef<Board>(board)
  useEffect(() => {
    boardRef.current = board
  }, [board])

  const sensors = useSensors(
    // A small distance threshold keeps the edit/delete buttons clickable.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const fetchBoard = useCallback(async (id: string) => {
    if (!id) return
    setLoading(true)
    try {
      const data = await taskRepo.getBoard(id)
      const next = emptyBoard()
      data.columns.forEach((column) => {
        next[column.status] = column.tasks
      })
      setBoard(next)
    } catch {
      toast.error("Failed to fetch board")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const projectData = await projectRepo.getAllProjects()
        const list: ProjectOption[] = projectData?.data ?? projectData ?? []
        setProjects(list)
        if (list.length > 0) setProjectId(list[0]._id)
        else setLoading(false)
      } catch {
        toast.error("Failed to fetch projects")
        setLoading(false)
      }

      try {
        const studentData = await userRepo.getAllUsers(1, 200)
        setStudents(studentData?.data ?? studentData ?? [])
      } catch {
        // Assignee picker degrades to empty; the board itself still works.
        toast.error("Failed to fetch students")
      }
    }
    bootstrap()
  }, [])

  useEffect(() => {
    if (projectId) fetchBoard(projectId)
  }, [projectId, fetchBoard])

  const findContainer = (id: string): TaskStatus | null => {
    if (isStatus(id)) return id
    return (
      TASK_STATUSES.find((status) =>
        boardRef.current[status].some((task) => task._id === id)
      ) ?? null
    )
  }

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id)
    const container = findContainer(id)
    if (!container) return
    setActiveTask(boardRef.current[container].find((task) => task._id === id) ?? null)
  }

  // Moves the card between columns mid-drag so the drop target reads correctly.
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    const from = findContainer(activeId)
    const to = findContainer(overId)
    if (!from || !to || from === to) return

    setBoard((prev) => {
      const fromItems = prev[from]
      const toItems = prev[to]
      const activeIndex = fromItems.findIndex((task) => task._id === activeId)
      if (activeIndex === -1) return prev

      const moved = { ...fromItems[activeIndex], status: to }

      // Dropping onto the column itself (not a card) appends to the end.
      const overIndex = isStatus(overId)
        ? toItems.length
        : toItems.findIndex((task) => task._id === overId)
      const insertAt = overIndex === -1 ? toItems.length : overIndex

      return {
        ...prev,
        [from]: fromItems.filter((task) => task._id !== activeId),
        [to]: [...toItems.slice(0, insertAt), moved, ...toItems.slice(insertAt)],
      }
    })
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    // After handleDragOver, the card already sits in its destination column.
    const container = findContainer(activeId)
    if (!container) return

    let finalBoard = boardRef.current

    if (!isStatus(overId) && activeId !== overId) {
      const items = finalBoard[container]
      const oldIndex = items.findIndex((task) => task._id === activeId)
      const newIndex = items.findIndex((task) => task._id === overId)
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        finalBoard = { ...finalBoard, [container]: arrayMove(items, oldIndex, newIndex) }
        boardRef.current = finalBoard
        setBoard(finalBoard)
      }
    }

    const orderedIds = finalBoard[container].map((task) => task._id)
    if (orderedIds.length === 0) return

    try {
      await taskRepo.moveTask(activeId, container, orderedIds)
    } catch {
      toast.error("Failed to move task")
      fetchBoard(projectId) // resync from the server rather than guess
    }
  }

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      status: "Backlog",
      priority: "Medium",
      dueDate: "",
      assignees: [],
    })
    setEditingId(null)
  }

  const openCreateModal = (status: TaskStatus) => {
    resetForm()
    setFormData((prev) => ({ ...prev, status }))
    setIsModalOpen(true)
  }

  const openEditModal = (task: Task) => {
    setFormData({
      title: task.title,
      description: task.description ?? "",
      status: task.status,
      priority: task.priority,
      dueDate: toDateInput(task.dueDate),
      assignees: task.assignees?.map((a) => a._id) ?? [],
    })
    setEditingId(task._id)
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!projectId) return
    setSaving(true)
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        dueDate: formData.dueDate || null,
        assignees: formData.assignees,
      }

      if (editingId) {
        await taskRepo.updateTask(editingId, payload)
        toast.success("Task updated successfully")
      } else {
        await taskRepo.createTask({ ...payload, project: projectId })
        toast.success("Task created successfully")
      }

      setIsModalOpen(false)
      resetForm()
      fetchBoard(projectId)
    } catch (error) {
      // The zod validator middleware returns { field, message } on a 400.
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined
      toast.error(message || "Action failed")
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      await taskRepo.deleteTask(deleteId)
      setBoard((prev) => {
        const next = { ...prev }
        TASK_STATUSES.forEach((status) => {
          next[status] = next[status].filter((task) => task._id !== deleteId)
        })
        return next
      })
      toast.success("Task deleted successfully")
    } catch {
      toast.error("Failed to delete task")
    } finally {
      setDeleteId(null)
    }
  }

  const toggleAssignee = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      assignees: prev.assignees.includes(id)
        ? prev.assignees.filter((a) => a !== id)
        : [...prev.assignees, id],
    }))
  }

  return (
    <div className="p-6">
      <UrlBreadcrumb />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Task Board</h1>

        <div className="flex items-center gap-3">
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Select a Project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project._id} value={project._id}>
                  {project.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={() => openCreateModal("Backlog")} disabled={!projectId}>
            Add Task
          </Button>
        </div>
      </div>

      {projects.length === 0 && !loading ? (
        <p className="text-gray-500">
          No projects yet — assign a project first, then its board appears here.
        </p>
      ) : loading ? (
        <Loader />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {TASK_STATUSES.map((status) => (
              <BoardColumn
                key={status}
                status={status}
                tasks={board[status]}
                onAdd={openCreateModal}
                onEdit={openEditModal}
                onDelete={setDeleteId}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask && (
              <div className="rotate-2">
                <TaskCard task={activeTask} onEdit={() => {}} onDelete={() => {}} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Create / Edit */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="mb-3 text-center text-xl font-semibold">
              {editingId ? "Edit Task" : "Add Task"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="What needs doing?"
                autoComplete="off"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Optional detail"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>Column</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, status: value as TaskStatus }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, priority: value as TaskPriority }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_PRIORITIES.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priority}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dueDate">Due date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, dueDate: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Assignees</Label>
              <div className="max-h-40 overflow-y-auto rounded-md border p-3">
                {students.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No students available</p>
                ) : (
                  students.map((student) => (
                    <label
                      key={student._id}
                      className="flex cursor-pointer items-center gap-2 py-1 text-sm"
                    >
                      <Checkbox
                        checked={formData.assignees.includes(student._id)}
                        onCheckedChange={() => toggleAssignee(student._id)}
                      />
                      {student.name}
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              className="h-11 w-full text-lg font-medium shadow-sm transition hover:shadow-md"
              onClick={handleSave}
              disabled={saving || formData.title.trim().length < 3}
            >
              {editingId ? "Update Task" : "Add Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the task.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default BoardPage
