import React from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  LayoutDashboard,
  Truck,
  ClipboardList,
  FileBarChart,
  Users,
  LogOut,
  ShieldCheck,
  UserCheck,
  Menu,
  X,
} from 'lucide-react'

interface NavigationItem {
  title: string
  path: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}

const NAV_ITEMS: NavigationItem[] = [
  {
    title: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Pátio',
    path: '/patio',
    icon: Truck,
  },
  {
    title: 'Formulários',
    path: '/formularios',
    icon: ClipboardList,
    adminOnly: true,
  },
  {
    title: 'Relatórios',
    path: '/relatorios',
    icon: FileBarChart,
  },
  {
    title: 'Usuários',
    path: '/usuarios',
    icon: Users,
    adminOnly: true,
  },
]

export default function DashboardLayout() {
  const { profile, role, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  // Filtragem dos itens de navegação baseada no perfil
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly && role !== 'admin') {
      return false
    }
    return true
  })

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      {/* Botão de Menu Mobile */}
      <div className="lg:hidden fixed top-4 right-4 z-50">
        <Button
          variant="outline"
          size="icon"
          className="bg-slate-900 border-slate-700 text-slate-100"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar Lateral */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Identificação da Operação / Globex */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-base text-white tracking-tight leading-tight">
                Globex
              </h1>
              <p className="text-xs text-slate-400">Op. Indaiatuba</p>
            </div>
          </div>
        </div>

        {/* Informações do Usuário Conectado */}
        <div className="px-6 py-4 bg-slate-950/40 border-b border-slate-800/80">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Usuário Conectado
            </span>
            <Badge
              variant="outline"
              className={
                role === 'admin'
                  ? 'bg-amber-950/50 text-amber-300 border-amber-800 text-[10px]'
                  : 'bg-blue-950/50 text-blue-300 border-blue-800 text-[10px]'
              }
            >
              {role === 'admin' ? (
                <ShieldCheck className="w-3 h-3 mr-1 inline" />
              ) : (
                <UserCheck className="w-3 h-3 mr-1 inline" />
              )}
              {role === 'admin' ? 'ADMIN' : 'OPERATOR'}
            </Badge>
          </div>
          <p className="text-sm font-semibold text-white truncate">
            {profile?.full_name || 'Usuário'}
          </p>
          <p className="text-xs text-slate-400 truncate">{profile?.email}</p>
        </div>

        {/* Menus da Sidebar */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Navegação
          </div>
          {visibleNavItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.title}</span>
                {item.adminOnly && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                    Admin
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Rodapé da Sidebar com Botão de Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-950/30 gap-2 text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair do Sistema</span>
          </Button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
