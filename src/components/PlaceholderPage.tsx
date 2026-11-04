import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LogOut } from 'lucide-react'

interface PlaceholderPageProps {
  title: string
  subtitle?: string
  description?: string
  moduleTag?: string
}

export function PlaceholderPage({
  title,
  subtitle = 'Módulo em Construção',
  description = 'Esta página é um placeholder da fundação do sistema de auditorias logísticas da Globex (Operação Indaiatuba). O construtor de formulários e funcionalidades detalhadas serão implementados na próxima fase.',
  moduleTag,
}: PlaceholderPageProps) {
  const { logout, profile, role } = useAuth()

  return (
    <div className="flex-1 p-6 lg:p-10 flex flex-col justify-between bg-slate-950 text-slate-100 min-h-screen">
      <div className="space-y-6">
        {/* Cabeçalho da Página com Título e Botão de Logout explícito */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">{title}</h1>
              {moduleTag && (
                <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                  {moduleTag}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
          </div>

          <Button
            variant="outline"
            onClick={() => logout()}
            className="border-red-900/60 bg-red-950/20 text-red-300 hover:bg-red-950/50 hover:text-red-200 self-start sm:self-auto gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </Button>
        </div>

        {/* Card Placeholder */}
        <Card className="border-slate-800 bg-slate-900/50 text-slate-200">
          <CardHeader>
            <CardTitle className="text-lg text-white">{title}</CardTitle>
            <CardDescription className="text-slate-400">
              Perfil ativo:{' '}
              <span className="font-semibold text-slate-300">{profile?.full_name}</span> (
              {role === 'admin' ? 'Gestor / Admin' : 'Fiscal de Pátio / Operador'})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-300">
            <p>{description}</p>
            <div className="p-4 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-400 space-y-1">
              <p>
                • Fundação de autenticação e layout concluída com sucesso no Skip Cloud
                (PocketBase).
              </p>
              <p>• Rotas protegidas via guarda de sessão e restrição de perfis.</p>
              <p>
                • Status do perfil:{' '}
                <span className="text-emerald-400 font-medium">Ativo (active = true)</span>.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="pt-8 text-xs text-slate-400 border-t border-slate-800/80 text-center sm:text-left">
        Globex Multimodal — Sistema de Gestão de Auditorias Logísticas
      </div>
    </div>
  )
}
