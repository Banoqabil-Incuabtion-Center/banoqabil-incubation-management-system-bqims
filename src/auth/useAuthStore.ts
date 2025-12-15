import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

interface AuthState {
  user: any | null
  token: string | null
  isAuthenticated: boolean
  setUser: (user: any) => void
  setToken: (token: string) => void
  setAuth: (user: any, token: string) => void  // ✅ New combined method
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      
      // ✅ Use this instead - both ko ek saath set karo
      setAuth: (user, token) => set({ 
        user, 
        token, 
        isAuthenticated: !!(user && token) 
      }),
      
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage), 
    }
  )
)