import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../utils/api'

interface User {
  id: string
  mobile: string
  email?: string
  first_name: string
  last_name?: string
  preferred_language: string
  is_verified: boolean
  farm_location?: {
    address?: string
    lat?: number
    lng?: number
  }
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (identifier: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  sendOTP: (mobile: string) => Promise<void>
  verifyOTP: (mobile: string, otp: string) => Promise<void>
  logout: () => void
  updateProfile: (data: Partial<User>) => Promise<void>
}

interface RegisterData {
  mobile: string
  email?: string
  password?: string
  first_name: string
  last_name?: string
  preferred_language: string
  farm_location?: {
    address?: string
    lat?: number
    lng?: number
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Check if user is authenticated on app load
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      fetchUserProfile()
    } else {
      setIsLoading(false)
    }
  }, [])

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/users/profile')
      setUser(response.data)
    } catch (error) {
      localStorage.removeItem('token')
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (identifier: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { mobile: identifier, password })
      const { access_token, user_id } = response.data
      
      localStorage.setItem('token', access_token)
      localStorage.setItem('user_id', user_id)
      
      await fetchUserProfile()
      navigate('/app')
      toast.success('Login successful!')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Login failed')
      throw error
    }
  }

  const register = async (data: RegisterData) => {
    try {
      const response = await api.post('/auth/register', data)
      const { access_token, user_id } = response.data

      localStorage.setItem('token', access_token)
      localStorage.setItem('user_id', user_id)

      await fetchUserProfile()
      toast.success('Registration successful!')
      navigate('/app')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Registration failed')
      throw error
    }
  }

  const sendOTP = async (mobile: string) => {
    try {
      await api.post('/auth/send-otp', { mobile })
      toast.success('OTP sent successfully!')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP')
      throw error
    }
  }

  const verifyOTP = async (mobile: string, otp: string) => {
    try {
      const response = await api.post('/auth/verify-otp', { mobile, otp_code: otp })
      const { access_token, user_id, is_new_user } = response.data
      
      localStorage.setItem('token', access_token)
      localStorage.setItem('user_id', user_id)
      
      await fetchUserProfile()
      
      if (is_new_user) {
        navigate('/register')
      } else {
        navigate('/app')
      }
      
      toast.success('OTP verified successfully!')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'OTP verification failed')
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user_id')
    setUser(null)
    queryClient.clear()
    navigate('/')
    toast.success('Logged out successfully!')
  }

  const updateProfile = async (data: Partial<User>) => {
    try {
      const response = await api.put('/users/profile', data)
      setUser(response.data)
      toast.success('Profile updated successfully!')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Profile update failed')
      throw error
    }
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    sendOTP,
    verifyOTP,
    logout,
    updateProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
