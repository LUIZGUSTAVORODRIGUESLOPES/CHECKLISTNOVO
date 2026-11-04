import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ShieldAlert, Truck, Lock, Mail, Loader2 } from 'lucide-react'

export default function Login() {
  const { login, isAuthenticated, error, clearError, isLoading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  if (!authLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    clearError()

    if (!email.trim() || !password) {
      setLocalError('Por favor, informe seu e-mail e senha.')
      return
    }

    setSubmitting(true)
    try {
      await login(email, password)
      // O redirecionamento acontecerá via o guard/estado do contexto
    } catch (err: unknown) {
      // O erro 'Este usuário está inativo. Entre em contato com o administrador.' é lançado pelo serviço
      const message =
        err instanceof Error ? err.message : 'Falha na autenticação. Verifique os dados.'
      setLocalError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const displayedError = localError || error

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Cabeçalho da Marca / Operação */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-blue-600/10 text-blue-400 rounded-2xl border border-blue-500/20 mb-2">
            <Truck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Globex Multimodal</h1>
          <p className="text-sm text-slate-400">
            Operação Indaiatuba — Gestão de Auditorias Logísticas
          </p>
        </div>

        {/* Card de Login */}
        <Card className="border-slate-800 bg-slate-950/80 backdrop-blur shadow-xl text-slate-100">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-white">Acessar Sistema</CardTitle>
            <CardDescription className="text-slate-400">
              Entre com suas credenciais de fiscal ou gestor
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {displayedError && (
                <Alert variant="destructive" className="bg-red-950/50 border-red-800 text-red-200">
                  <ShieldAlert className="h-4 w-4 text-red-400" />
                  <AlertTitle>Atenção</AlertTitle>
                  <AlertDescription className="text-sm font-medium">
                    {displayedError}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200">
                  E-mail institucional
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu.email@globex.com"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (displayedError) {
                        setLocalError(null)
                        clearError()
                      }
                    }}
                    className="pl-9 bg-slate-900/60 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-200">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (displayedError) {
                        setLocalError(null)
                        clearError()
                      }
                    }}
                    className="pl-9 bg-slate-900/60 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 pt-2">
              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validando autenticação...
                  </>
                ) : (
                  'Entrar no Sistema'
                )}
              </Button>

              <div className="text-xs text-slate-400 text-center border-t border-slate-800 pt-3 w-full">
                Contas disponíveis para validação:
                <div className="mt-1 text-slate-300 font-mono text-[11px] space-y-0.5">
                  <p>admin@globex.com (Gestor)</p>
                  <p>operador@globex.com (Fiscal de Pátio)</p>
                  <p>inativo@globex.com (Usuário Inativo)</p>
                  <p className="text-slate-400 italic">Senha padrão: Password123!</p>
                </div>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
