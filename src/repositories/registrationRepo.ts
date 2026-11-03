import api from "../lib/axios"

// Internship applications submitted from the banoqabil.online landing form

export const APPLICATION_STATUSES = ["New", "Shortlisted", "Rejected"] as const
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

export interface Application {
  _id: string
  fullName: string
  dateOfBirth: string
  gender: string
  address: string
  emailAddress: string
  phoneNumber: string
  guardianNumber?: string
  cnicNumber: string
  fatherOrGuardianName: string
  course: string
  teacherName: string
  campus: string
  obtainedMarks: string
  aboutYou: string
  dynamicData?: Record<string, unknown>
  // Absent on submissions made before review statuses existed; treat as "New"
  status?: ApplicationStatus
  createdAt: string
}

export interface ApplicationFilters {
  search?: string
  course?: string
  campus?: string
  status?: string
}

export interface ApplicationList {
  data: Application[]
  pagination: {
    total: number
    currentPage: number
    totalPages: number
    limit: number
    hasMore: boolean
  }
  statusCounts: Record<ApplicationStatus, number>
}

// The backend caps one page at 100 rows
const EXPORT_PAGE_SIZE = 100

export class RegistrationRepo {
  async list(page = 1, limit = 20, filters: ApplicationFilters = {}): Promise<ApplicationList> {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() })
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "all") params.set(key, value)
    })
    const response = await api.get(`/api/registration?${params.toString()}`)
    return response.data
  }

  async getById(id: string): Promise<Application> {
    const response = await api.get(`/api/registration/${id}`)
    return response.data.data
  }

  async updateStatus(id: string, status: ApplicationStatus): Promise<Application> {
    const response = await api.patch(`/api/registration/${id}/status`, { status })
    return response.data.data
  }

  async remove(id: string): Promise<void> {
    await api.delete(`/api/registration/${id}`)
  }

  // Every application matching the filters, for CSV export
  async exportAll(filters: ApplicationFilters = {}): Promise<Application[]> {
    const rows: Application[] = []
    let page = 1
    for (;;) {
      const res = await this.list(page, EXPORT_PAGE_SIZE, filters)
      rows.push(...res.data)
      if (!res.pagination.hasMore) break
      page += 1
    }
    return rows
  }

  // Course and campus choices come from the same form-config the landing form renders
  async getFilterOptions(): Promise<{ courses: string[]; campuses: string[] }> {
    const response = await api.get("/api/form-config")
    const fields = Object.values(response.data?.data || {}).flat() as { name: string; options?: string[] }[]
    const optionsOf = (name: string) => fields.find((f) => f.name === name)?.options || []
    return { courses: optionsOf("course"), campuses: optionsOf("campus") }
  }
}

export const registrationRepo = new RegistrationRepo()
