export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  private: boolean
  language: string | null
  default_branch: string
  updated_at: string
  pushed_at: string | null
}

export interface GitHubUser {
  id: number
  login: string
  name: string | null
  email: string | null
  avatar_url: string
}

export interface GitHubWebhookPayload {
  action?: string
  repository?: {
    id: number
    name: string
    full_name: string
  }
  commits?: Array<{
    id: string
    message: string
    added: string[]
    modified: string[]
    removed: string[]
  }>
  ref?: string
  head_commit?: {
    id: string
    message: string
  }
}

