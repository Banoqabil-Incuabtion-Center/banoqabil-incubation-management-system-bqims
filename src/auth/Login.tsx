import React, { useState, useEffect } from "react"
import { message } from "antd"
import { CiUnread, CiRead } from "react-icons/ci"
import { userRepo } from "../repositories/userRepo"
import { Button } from "../components/ui/button"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "./useAuthStore"
import Loader from "@/components/Loader"

const Login: React.FC = () => {
  const navigate = useNavigate()
  const { setAuth, isAuthenticated } = useAuthStore()  // ✅ setAuth use karo
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({ username: "", password: "" })

  // 🚀 Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) navigate("/")
  }, [isAuthenticated, navigate])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }))
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setErrors({})

    try {
      const data = await userRepo.loginAdmin(formData)
      // ✅ Dono ek saath set karo
      setAuth(data.user, data.token)
      message.success("Login successful")
      navigate("/", { replace: true })
    } catch (err: any) {
      const errMsg = err.response?.data?.message || "Login failed"
      message.error(errMsg)
      setErrors({ username: errMsg, password: errMsg })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) handleSubmit()
  }

  return (
    <div className="max-w-md mx-auto p-6 mt-10 rounded-lg border shadow bg-white dark:bg-neutral-900">
      <h2 className="text-2xl font-bold mb-6 text-center">Admin Login</h2>

      <div className="space-y-5 mb-6">
        <div>
          <label htmlFor="username" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            Username
          </label>
          <input
            type="text"
            name="username"
            id="username"
            placeholder="Enter username"
            value={formData.username}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            className={`block w-full rounded-md border px-3 py-2 text-gray-900 dark:text-white dark:bg-neutral-800 
              focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none transition
              ${errors.username ? "border-red-500" : "border-gray-300 dark:border-gray-600"}`}
          />
          {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
        </div>

        <div>
          <label htmlFor="password" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              id="password"
              placeholder="Enter password"
              value={formData.password}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              className={`block w-full rounded-md border px-3 py-2 text-gray-900 dark:text-white dark:bg-neutral-800 
                focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none transition
                ${errors.password ? "border-red-500" : "border-gray-300 dark:border-gray-600"}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-gray-500 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
            >
              {showPassword ? <CiUnread size={20} /> : <CiRead size={20} />}
            </button>
          </div>
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
        </div>
      </div>

      <Button className="w-full h-11 text-lg font-medium" onClick={handleSubmit} disabled={isLoading}>
        {isLoading ? <Loader /> : "Login"}
      </Button>
    </div>
  )
}

export default Login
