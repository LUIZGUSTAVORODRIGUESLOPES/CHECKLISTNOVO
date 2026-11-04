import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import type { ProfileRecord } from '@/types/auth'
import {
  getProfileByUserId,
  loginWithEmailAndPassword,
  logoutUser,
  INACTIVE_USER_MESSAGE,
} from '@/services/auth'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  user: { id: string; email: string; name?: string } | null
  profile: ProfileRecord | null
  role: 'admin' | 'operator' | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  error: string | null
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [profile, setProfile] = useState<ProfileRecord | null>(null)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  const logout = useCallback(() => {
    logoutUser()
    setProfile(null)
  }, [])

  // Carrega e valida o perfil da sessão atual
  const validateSessionAndLoadProfile = useCallback(async () => {
    if (!pb.authStore.isValid || !pb.authStore.record) {
      setProfile(null)
      setIsLoading(false)
      return
    }

    try {
      const currentUserId = pb.authStore.record.id
      const userProfile = await getProfileByUserId(currentUserId)

      // Validação crítica de status: se inativo, força logout imediato
      if (!userProfile || userProfile.active === false) {
        logoutUser()
        setProfile(null)
        setError(INACTIVE_USER_MESSAGE)
        setIsLoading(false)
        return
      }

      setProfile(userProfile)
    } catch (err) {
      console.error('Falha ao validar sessão inicial:', err)
      logoutUser()
      setProfile(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    validateSessionAndLoadProfile()

    // Ouve alterações no store do PocketBase
    const unsubscribe = pb.authStore.onChange((token, model) => {
      if (!token || !model) {
        setProfile(null)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [validateSessionAndLoadProfile])

  const login = async (email: string, password: string) => {
    setError(null)
    try {
      const { profile: loggedProfile } = await loginWithEmailAndPassword(email, password)
      setProfile(loggedProfile)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao realizar login.'
      setError(message)
      throw err
    }
  }

  const currentUser = pb.authStore.record
    ? {
        id: pb.authStore.record.id,
        email: pb.authStore.record.email || '',
        name: pb.authStore.record.name || profile?.full_name,
      }
    : null

  const value: AuthContextType = {
    isAuthenticated: !!pb.authStore.isValid && !!profile && profile.active === true,
    isLoading,
    user: currentUser,
    profile,
    role: profile?.role ?? null,
    login,
    logout,
    error,
    clearError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider')
  }
  return context
}
