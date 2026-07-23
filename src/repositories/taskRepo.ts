import api from "../lib/axios"

export const TASK_STATUSES = ["Backlog", "In Progress", "Review", "Done"] as const
export const TASK_PRIORITIES = ["Low", "Medium", "High"] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export interface TaskAssignee {
  _id: string
  name: string
  avatar?: string | null
  incubation_id?: string
}

export interface Task {
  _id: string
  project: string
  title: string
  description: string
  status: TaskStatus
  order: number
  assignees: TaskAssignee[]
  dueDate: string | null
  priority: TaskPriority
  attachments: string[]
  createdAt: string
  updatedAt: string
}

export interface BoardColumn {
  status: TaskStatus
  tasks: Task[]
}

export interface BoardResponse {
  project: {
    _id: string
    title: string
    description: string
    teamName?: { _id: string; teamName: string }
    PM?: { _id: string; name: string }
  }
  columns: BoardColumn[]
}

export interface TaskPayload {
  title: string
  description?: string
  status?: TaskStatus
  assignees?: string[]
  dueDate?: string | null
  priority?: TaskPriority
  attachments?: string[]
}

export class TaskRepo {
  async getBoard(projectId: string) {
    const response = await api.get<BoardResponse>(`/api/admin/task/board/${projectId}`)
    return response.data
  }

  async createTask(taskData: TaskPayload & { project: string }) {
    const response = await api.post("/api/admin/task", taskData)
    return response.data
  }

  async updateTask(id: string, taskData: TaskPayload) {
    const response = await api.put(`/api/admin/task/${id}`, taskData)
    return response.data
  }

  // orderedIds is the destination column's full id list *after* the drop —
  // the server writes each index straight to `order`.
  async moveTask(id: string, status: TaskStatus, orderedIds: string[]) {
    const response = await api.patch(`/api/admin/task/${id}/move`, { status, orderedIds })
    return response.data
  }

  async deleteTask(id: string) {
    const response = await api.delete(`/api/admin/task/${id}`)
    return response.data
  }
}

export const taskRepo = new TaskRepo()
