export type BackgroundRequest =
  | { type: 'auth/status' }
  | { type: 'auth/device/start' }
  | { type: 'auth/device/get' }
  | { type: 'auth/device/clear' }
  | { type: 'auth/device/poll'; device_code: string }
  | { type: 'auth/logout' }
  | { type: 'repos/list' }

export type BackgroundResponse =
  | { ok: true; type: 'auth/status'; authenticated: boolean }
  | {
      ok: true
      type: 'auth/device/start'
      verification_uri: string
      user_code: string
      device_code: string
      interval: number
      expires_in: number
    }
  | {
      ok: true
      type: 'auth/device/get'
      session:
        | {
            verification_uri: string
            user_code: string
            device_code: string
            interval: number
            expires_in: number
            created_at: number
          }
        | null
    }
  | { ok: true; type: 'auth/device/clear' }
  | {
      ok: true
      type: 'auth/device/poll'
      authenticated: boolean
      pending: boolean
      reason?: 'authorization_pending' | 'slow_down'
      next_interval?: number
    }
  | { ok: true; type: 'auth/logout'; authenticated: false }
  | { ok: true; type: 'repos/list'; repos: GitHubRepo[] }
  | { ok: false; error: string }

export type GitHubRepo = {
  id: number
  full_name: string
  private: boolean
  html_url: string
}

