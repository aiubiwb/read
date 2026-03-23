import axios from 'axios'

const API_URL = 'http://localhost:3000/api'

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export async function register(username: string, password: string) {
  const response = await axios.get(`${API_URL}/register`, { params: { username, password } })
  return response.data
}

export async function login(username: string, password: string) {
  const response = await axios.get(`${API_URL}/login`, { params: { username, password } })
  if (response.data.token) {
    localStorage.setItem('token', response.data.token)
    localStorage.setItem('username', response.data.username)
    localStorage.setItem('userId', response.data.userId)
  }
  return response.data
}

export function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('username')
  localStorage.removeItem('userId')
}

export function getToken() {
  return localStorage.getItem('token')
}

export function getUsername() {
  return localStorage.getItem('username')
}

export function isLoggedIn() {
  return !!localStorage.getItem('token')
}

export async function getBooksFromServer() {
  const response = await api.get('/books')
  return response.data
}

export async function getBookFromServer(bookId: string) {
  const response = await api.get(`/book/${bookId}`)
  return response.data
}

export async function getChapterFromServer(chapterId: string) {
  const response = await api.get(`/chapter/${chapterId}`)
  return response.data
}

export async function uploadBookToServer(bookName: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('bookName', bookName)
  
  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return response.data
}

export async function deleteBookFromServer(bookId: string) {
  const response = await api.delete(`/book/${bookId}`)
  return response.data
}

export async function getProgressFromServer(bookId: string) {
  const response = await api.get(`/progress/${bookId}`)
  return response.data
}

export async function saveProgressToServer(bookId: string, chapterIndex: number, scrollTop: number) {
  const response = await api.post(`/progress/${bookId}`, {
    chapter_index: chapterIndex,
    scroll_top: scrollTop
  })
  return response.data
}
