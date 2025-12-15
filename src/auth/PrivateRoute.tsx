import { Navigate } from "react-router-dom"
import { useAuthStore } from "./useAuthStore"
import Loader from "@/components/Loader"
import React from "react"

interface PrivateRouteProps {
  children: React.ReactNode
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const { isAuthenticated, token } = useAuthStore()
  const [isChecking, setIsChecking] = React.useState(true)

  // Wait for Zustand persist to load
  React.useEffect(() => {
    const timer = setTimeout(() => setIsChecking(false), 100) // small delay
    return () => clearTimeout(timer)
  }, [])

  if (isChecking) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader />
      </div>
    )
  }

  if (!isAuthenticated || !token) {
    return <Navigate to="/admin/login" replace />
  }

  return <>{children}</>
}

export default PrivateRoute
