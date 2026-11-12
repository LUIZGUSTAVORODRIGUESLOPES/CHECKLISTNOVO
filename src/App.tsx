/* Main App Component - Handles routing (using react-router-dom), query client and other providers */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/AuthContext'
import { AuthGuard, RoleGuard } from '@/components/Guards'
import DashboardLayout from '@/components/DashboardLayout'

// Páginas
import Index from './pages/Index'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Patio from './pages/Patio'
import Formularios from './pages/Formularios'
import CadastrosMestres from './pages/CadastrosMestres'
import Relatorios from './pages/Relatorios'
import Usuarios from './pages/Usuarios'
import NotFound from './pages/NotFound'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          {/* Rota raiz com redirecionamento baseado no status de autenticação */}
          <Route path="/" element={<Index />} />

          {/* Rota pública de autenticação */}
          <Route path="/login" element={<Login />} />

          {/* Rotas Protegidas dentro do DashboardLayout */}
          <Route element={<AuthGuard />}>
            <Route element={<DashboardLayout />}>
              {/* Módulos acessíveis por qualquer usuário ativo autenticado */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/patio" element={<Patio />} />
              <Route path="/relatorios" element={<Relatorios />} />

              {/* Módulos restritos exclusivamente a ADMIN (Gestores) */}
              <Route element={<RoleGuard allowedRoles={['admin']} />}>
                <Route path="/formularios" element={<Formularios />} />
                <Route path="/cadastros-mestres" element={<CadastrosMestres />} />
                <Route path="/usuarios" element={<Usuarios />} />
              </Route>
            </Route>
          </Route>

          {/* Rota 404 e fallback */}
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
