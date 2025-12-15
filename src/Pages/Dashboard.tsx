import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { message } from "antd"
import { SectionCards } from "@/components/section-cards"
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import { useEffect, useState } from "react"
import { userRepo } from "@/repositories/userRepo"
import SimplePagination from "@/components/simple-pagination"
import Loader from "@/components/Loader"

interface User {
  _id: string
  name: string
  bq_id: string
  email: string
  phone: string
  CNIC: string
  course: string
}



export default function Page() {
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const [limit] = useState(10)

  const fetchUsers = async (page = 1) => {
    setLoading(true)
    try {
      // Fetch users with pagination
      const usersResponse = await userRepo.getAllUsers(page, limit)

      // Fetch status data with same pagination


      // Extract data from paginated response
      setUsers(usersResponse.data || [])
      
      setTotalPages(usersResponse.pagination?.totalPages || 1)
      setTotalUsers(usersResponse.pagination?.total || 0)
      setCurrentPage(usersResponse.pagination?.currentPage || page)
      console.log(totalUsers);
      
    } catch (error) {
      message.error("Failed to fetch users or attendance")
      console.error("Fetch error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    fetchUsers(page)
  }

  useEffect(() => {
    fetchUsers()
  }, [])
  return (

    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <SectionCards />
          <div className="px-4 lg:px-6">
            <ChartAreaInteractive />
            
            <div className="rounded-lg border shadow-sm bg-white dark:bg-neutral-900 mt-4">
              {loading ? (
                <div className="flex justify-center items-center h-40">
                  <Loader />
                </div>
                
              ) : (
                <div >
                  
                  <Table >
                    <TableHeader className="bg-neutral-100 dark:bg-neutral-800">
                      <TableRow>
                        <TableHead className="w-12 text-center">#</TableHead>
                        <TableHead>BQ Id</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>CNIC</TableHead>
                        <TableHead>Course</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length > 0 ? (
                        users.map((user, index) => (
                          <TableRow key={user._id}>
                            <TableCell className="text-center">{index + 1}</TableCell>
                            <TableCell>{user.bq_id}</TableCell>
                            <TableCell>{user.name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{user.phone}</TableCell>
                            <TableCell>{user.CNIC}</TableCell>
                            <TableCell>{user.course}</TableCell>

                          </TableRow>
                          
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                            No users found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {totalPages > 1 && (
                                <div className="p-4 border-t">
                                  <SimplePagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={handlePageChange}
                                  />
                                </div>
                              )}
                </div>

              )}
            </div>
          </div>
          

          {/* <DataTable  /> */}
        </div>
      </div>
    </div>

  )
}
