import axios from 'axios'

// Ensure API URL includes /api prefix
let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
if (apiUrl && !apiUrl.endsWith('/api')) {
  // If VITE_API_URL doesn't end with /api, append it
  apiUrl = apiUrl.replace(/\/$/, '') + '/api'
}
const API_BASE_URL = apiUrl

export { API_BASE_URL }

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: any) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: any) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response: any) => response,
  (error: any) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user_id')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Weather API endpoints
export const getWeatherData = (params?: { location?: string; lat?: number; lon?: number }) => api.get('/weather/current', { params })

export default api
