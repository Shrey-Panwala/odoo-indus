import axios from 'axios'

const TOKEN_KEY = 'auth_token'

export const opsHttp = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// Attach JWT token to every request
opsHttp.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-logout on 401
opsHttp.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem('auth_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)
