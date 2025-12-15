// src/repositories/attendanceRepo.ts
import api from "../lib/axios"

export class AttendanceRepo {
  // ✅ Get today's status of all users
  async getAllUserStatus(page = 1, limit = 10) {
    const res = await api.get(`/api/attendance/status?page=${page}&limit=${limit}`)
    return res.data
  }

  // ✅ Get full attendance history (all users)
  async getAttendanceHistory(page = 1, limit = 10) {
    const res = await api.get(`/api/attendance/history?page=${page}&limit=${limit}`)
    return res.data
  }

  // ✅ Get specific user history
  async getUserHistoryByName(name: string) {
    const res = await api.get(`/api/attendance/history/by-name/${name}`)
    return res.data
  }

  // ✅ Update attendance record (admin)
  async updateAttendanceRecord(attendanceId: string, data: any) {
    const res = await api.put(`/api/attendance/update/${attendanceId}`, data)
    return res.data
  }

  // ✅ Delete attendance record (admin)
  async deleteAttendanceRecord(attendanceId: string) {
    const res = await api.delete(`/api/attendance/delete/${attendanceId}`)
    return res.data
  }


}

export const attendanceRepo = new AttendanceRepo()
