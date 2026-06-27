import { create } from 'zustand'

export const getUserIdFromToken = (token: string | null): string | undefined => {
  if (!token) return undefined
  try {
    return JSON.parse(atob(token.split('.')[1])).userId
  } catch {
    return undefined
  }
}

interface AuthState {
  token: string | null
  isAuthenticated: boolean
  userId: string | undefined
  setToken: (token: string | null) => void
  logout: () => void
}

const initialToken = localStorage.getItem('token')

export const useAuthStore = create<AuthState>((set) => ({
  token: initialToken,
  isAuthenticated: !!initialToken,
  userId: getUserIdFromToken(initialToken),
  setToken: (token) => {
    if (token) {
      localStorage.setItem('token', token)
    } else {
      localStorage.removeItem('token')
    }
    set({ token, isAuthenticated: !!token, userId: getUserIdFromToken(token) })
  },
  logout: () => {
    localStorage.removeItem('token')
    set({ token: null, isAuthenticated: false, userId: undefined })
  },
}))
