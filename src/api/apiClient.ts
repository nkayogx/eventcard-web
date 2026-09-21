// One small helper for talking to the backend.
// It adds the login token to every request and turns error answers
// into an ApiError that screens can show to the user.

export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8181'

const TOKEN_KEY = 'eventcard.token'

export function getSavedToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function saveToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

/** An error answer from the backend, e.g. { message: "This email is already registered", field: "email" } */
export class ApiError extends Error {
  readonly status: number
  readonly field?: string

  constructor(status: number, message: string, field?: string) {
    super(message)
    this.status = status
    this.field = field
  }
}

/** Called when the backend says "please log in" (401), so the app can go to the login page. */
let whenLoggedOut: () => void = () => {}
export function onLoggedOut(callback: () => void) {
  whenLoggedOut = callback
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  const token = getSavedToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  // Files (FormData) are sent as they are; everything else is sent as JSON
  let payload: BodyInit | undefined
  if (body instanceof FormData) {
    payload = body
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let response: Response
  try {
    response = await fetch(API_URL + path, { method, headers, body: payload })
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Please check your internet connection.')
  }

  const answer = await response.json().catch(() => null)

  if (!response.ok) {
    if (response.status === 401 && token) {
      whenLoggedOut()
    }
    const message = answer?.message ?? 'Something went wrong. Please try again.'
    throw new ApiError(response.status, message, answer?.field)
  }
  return answer as T
}

/** Downloads a file (e.g. the guest list template) and asks the browser to save it. */
async function downloadFile(path: string, fileName: string) {
  const token = getSavedToken()
  const response = await fetch(API_URL + path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) {
    throw new ApiError(response.status, 'Could not download the file. Please try again.')
  }
  const file = await response.blob()
  const link = document.createElement('a')
  link.href = URL.createObjectURL(file)
  link.download = fileName
  link.click()
  URL.revokeObjectURL(link.href)
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
  downloadFile,
}
