import axios from 'axios'

export async function withFallback(apiCall, fallbackCall) {
  try {
    return await apiCall()
  } catch (error) {
    if (!error?.response || error?.response?.status >= 500 || error?.response?.status === 503 || error?.response?.status === 404) {
      return fallbackCall()
    }
    throw error
  }
}

export const opsHttp = axios.create({
  baseURL: '/api/operations',
  timeout: 10000,
})
