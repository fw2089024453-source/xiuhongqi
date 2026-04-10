import axios from 'axios'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  withCredentials: false,
})

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('xhq-token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.message || error.response?.data?.error || '请求失败，请稍后重试'

    return Promise.reject(new Error(message))
  },
)

export default request
