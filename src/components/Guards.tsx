import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2, ShieldX } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Guarda que exige autenticação ativa
 */
export function AuthGuard() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm text-slate-400">Verificando sessão e permissões...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

/**
 * Guarda para páginas que exigem role específica (ex: 'admin')
 */
interface RoleGuardProps {
  allowedRoles: Array<'admin' | 'operator'>
}

export function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const { role, isLoading, logout } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!role || !allowedRoles.includes(role)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-900 min-h-[70vh]">
        <div className="p-4 rounded-full bg-red-950/60 border border-red-800 text-red-400 mb-4">
          <ShieldX className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Acesso Não Autorizado</h2>
        <p className="text-slate-400 max-w-md mb-6 text-sm">
          Seu perfil ({role === 'operator' ? 'Fiscal de Pátio / Operador' : 'Não identificado'}) não
          possui permissão para acessar este módulo. Esta funcionalidade é restrita aos
          Administradores/Gestores.
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="border-slate-700 text-slate-200 hover:bg-slate-800"
            onClick={() => window.history.back()}
          >
            Voltar
          </Button>
          <Button variant="destructive" onClick={() => logout()}>
            Desconectar
          </Button>
        </div>
      </div>
    )
  }

  return <Outlet />
}
