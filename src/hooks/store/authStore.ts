// hooks/store/authStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AdminUser {
    _id: string
    username: string
    role?: 'admin' | 'superadmin'
}

interface AuthState {
    user: AdminUser | null
    isAuthenticated: boolean
    isLoading: boolean
    setUser: (user: AdminUser | null) => void
    setLoading: (loading: boolean) => void
    logout: () => void
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            isLoading: true,
            setUser: (user) =>
                set({
                    user,
                    isAuthenticated: !!user,
                    isLoading: false,
                }),
            setLoading: (loading) => set({ isLoading: loading }),
            logout: () => {
                // Clear tokens
                localStorage.removeItem("token");
                sessionStorage.removeItem("token");
                set({
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                });
            },
        }),
        {
            name: 'admin-auth-storage',
        }
    )
)
