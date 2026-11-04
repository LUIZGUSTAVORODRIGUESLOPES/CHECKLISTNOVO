export type UserRole = 'admin' | 'operator'

export interface ProfileRecord {
  id: string
  user: string
  full_name: string
  email: string
  role: UserRole
  active: boolean
  created: string
  updated: string
}

export interface AuthUser {
  id: string
  email: string
  name?: string
  profile: ProfileRecord | null
}
