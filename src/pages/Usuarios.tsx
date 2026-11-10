import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Building2,
  Plus,
  Pencil,
  RefreshCw,
  Users as UsersIcon,
  ShieldCheck,
  UserCheck,
  Trash2,
  ImagePlus,
  X,
} from 'lucide-react'
import type { DepartmentRecord } from '@/types/department'
import { listDepartments, createDepartment, updateDepartment } from '@/services/departments'
import {
  listProfilesWithDepartment,
  createUserWithProfile,
  updateUserWithProfile,
  uploadUserAvatar,
  deleteUser,
  deactivateUser,
  avatarUrl,
  type ProfileWithDepartment,
} from '@/services/users'
import { getErrorMessage } from '@/lib/pocketbase/errors'

const MIN_PASSWORD = 6

/** Aviso EXATO exigido para usuários com histórico operacional vinculado. */
const LINKED_HISTORY_WARNING =
  'Este usuário possui histórico operacional vinculado e não pode ser excluído por segurança de auditoria. Utilize a opção de Inativar.'

type FieldErrors = Record<string, string>

/** Destaque de erro por campo: borda vermelha + mensagem logo abaixo. */
const fieldBorderClass = (hasError: boolean) =>
  hasError ? 'border-red-500 focus-visible:ring-red-500' : ''

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-red-500 mt-1">{message}</p>
}

export default function Usuarios() {
  const { toast } = useToast()

  // ---------- Dados ----------
  const [departments, setDepartments] = useState<DepartmentRecord[]>([])
  const [profiles, setProfiles] = useState<ProfileWithDepartment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // ---------- Modal de Departamentos ----------
  const [departmentDialogOpen, setDepartmentDialogOpen] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<DepartmentRecord | null>(null)
  const [departmentForm, setDepartmentForm] = useState({ name: '', description: '', active: true })
  const [departmentErrors, setDepartmentErrors] = useState<FieldErrors>({})

  // ---------- Modal de Usuários ----------
  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<ProfileWithDepartment | null>(null)
  const [userForm, setUserForm] = useState({
    full_name: '',
    email: '',
    role: 'operator' as 'admin' | 'operator',
    active: true,
    department_id: '',
    password: '',
    passwordConfirm: '',
  })
  const [userErrors, setUserErrors] = useState<FieldErrors>({})

  // ---------- Avatar (form) ----------
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // ---------- Exclusão / Inativação ----------
  const [deleteTarget, setDeleteTarget] = useState<ProfileWithDepartment | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeactivatingId, setIsDeactivatingId] = useState<string | null>(null)

  const activeDepartments = useMemo(() => departments.filter((d) => d.active), [departments])
  const departmentNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const d of departments) map.set(d.id, d.name)
    return map
  }, [departments])

  const loadAll = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const [deps, profs] = await Promise.all([listDepartments(), listProfilesWithDepartment()])
      setDepartments(deps)
      setProfiles(profs)
    } catch (err) {
      toast({
        title: 'Erro ao carregar dados',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // ====================== Avatar ======================

  const resetAvatarState = () => {
    setAvatarFile(null)
    setAvatarPreview('')
    if (avatarInputRef.current) avatarInputRef.current.value = ''
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setUserErrors((prev) => ({ ...prev, avatar: 'Formato inválido. Use PNG, JPG ou WEBP.' }))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setUserErrors((prev) => ({ ...prev, avatar: 'A imagem deve ter no máximo 5 MB.' }))
      return
    }
    setUserErrors((prev) => {
      const next = { ...prev }
      delete next.avatar
      return next
    })
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const removeAvatarSelection = () => {
    resetAvatarState()
    setUserErrors((prev) => {
      const next = { ...prev }
      delete next.avatar
      return next
    })
  }

  // ====================== Departamentos ======================

  const openNewDepartment = () => {
    setEditingDepartment(null)
    setDepartmentForm({ name: '', description: '', active: true })
    setDepartmentErrors({})
    setDepartmentDialogOpen(true)
  }

  const openEditDepartment = (dept: DepartmentRecord) => {
    setEditingDepartment(dept)
    setDepartmentForm({
      name: dept.name,
      description: dept.description || '',
      active: dept.active,
    })
    setDepartmentErrors({})
    setDepartmentDialogOpen(true)
  }

  const validateDepartment = (): boolean => {
    const errors: FieldErrors = {}
    if (!departmentForm.name.trim()) {
      errors.name = 'Informe o nome do departamento.'
    }
    setDepartmentErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleDepartmentSubmit = async () => {
    if (!validateDepartment()) return
    setIsSaving(true)
    try {
      const data = {
        name: departmentForm.name.trim(),
        description: departmentForm.description.trim(),
        active: departmentForm.active,
      }
      if (editingDepartment) {
        await updateDepartment(editingDepartment.id, data)
        toast({ title: 'Departamento atualizado com sucesso.' })
      } else {
        await createDepartment(data)
        toast({ title: 'Departamento criado com sucesso.' })
      }
      setDepartmentDialogOpen(false)
      await loadAll()
    } catch (err) {
      toast({
        title: 'Erro ao salvar departamento',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const toggleDepartmentActive = async (dept: DepartmentRecord) => {
    try {
      await updateDepartment(dept.id, { active: !dept.active })
      await loadAll()
      toast({
        title: dept.active
          ? `Departamento "${dept.name}" inativado.`
          : `Departamento "${dept.name}" ativado.`,
      })
    } catch (err) {
      toast({
        title: 'Erro ao alterar status',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  // ====================== Usuários ======================

  const openNewUser = () => {
    setEditingProfile(null)
    setUserForm({
      full_name: '',
      email: '',
      role: 'operator',
      active: true,
      department_id: '',
      password: '',
      passwordConfirm: '',
    })
    setUserErrors({})
    resetAvatarState()
    setUserDialogOpen(true)
  }

  const openEditUser = (profile: ProfileWithDepartment) => {
    setEditingProfile(profile)
    setUserForm({
      full_name: profile.full_name,
      email: profile.email,
      role: profile.role,
      active: profile.active,
      department_id: profile.department_id || '',
      password: '',
      passwordConfirm: '',
    })
    setUserErrors({})
    // Pré-visualização parte da foto já salva (ou vazia se não há).
    setAvatarFile(null)
    setAvatarPreview(avatarUrl(profile))
    if (avatarInputRef.current) avatarInputRef.current.value = ''
    setUserDialogOpen(true)
  }

  const validateUser = (): boolean => {
    const errors: FieldErrors = {}

    if (!userForm.full_name.trim()) {
      errors.full_name = 'Informe o nome completo.'
    }
    if (!userForm.email.trim()) {
      errors.email = 'Informe o e-mail.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.email.trim())) {
      errors.email = 'Informe um e-mail válido.'
    }

    if (editingProfile) {
      // Na edição, senha é opcional — só valida quando preenchida.
      if (userForm.password || userForm.passwordConfirm) {
        if (userForm.password.length < MIN_PASSWORD) {
          errors.password = `A senha deve ter no mínimo ${MIN_PASSWORD} caracteres.`
        } else if (userForm.password !== userForm.passwordConfirm) {
          errors.passwordConfirm = 'As senhas não coincidem.'
        }
      }
    } else {
      if (!userForm.password) {
        errors.password = 'Defina uma senha.'
      } else if (userForm.password.length < MIN_PASSWORD) {
        errors.password = `A senha deve ter no mínimo ${MIN_PASSWORD} caracteres.`
      } else if (userForm.password !== userForm.passwordConfirm) {
        errors.passwordConfirm = 'As senhas não coincidem.'
      }
    }

    setUserErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleUserSubmit = async () => {
    if (!validateUser()) return

    // A sessão do admin logado no authStore NUNCA é tocada aqui:
    // nenhum caminho de criação/edição usa authWithPassword ou authStore.clear.
    setIsSaving(true)
    try {
      if (editingProfile) {
        await updateUserWithProfile(editingProfile, {
          userId: editingProfile.user,
          full_name: userForm.full_name.trim(),
          email: userForm.email.trim(),
          role: userForm.role,
          active: userForm.active,
          department_id: userForm.department_id || undefined,
          password: userForm.password || undefined,
          passwordConfirm: userForm.passwordConfirm || undefined,
        })
        toast({ title: 'Usuário atualizado com sucesso.' })
        if (avatarFile) {
          await uploadUserAvatar(editingProfile.id, avatarFile)
        }
      } else {
        const newProfileId = await createUserWithProfile({
          full_name: userForm.full_name.trim(),
          email: userForm.email.trim(),
          role: userForm.role,
          active: userForm.active,
          department_id: userForm.department_id || undefined,
          password: userForm.password,
          passwordConfirm: userForm.passwordConfirm,
        })
        if (avatarFile && newProfileId) {
          await uploadUserAvatar(newProfileId, avatarFile)
        }
        toast({ title: 'Usuário criado com sucesso.' })
      }
      setUserDialogOpen(false)
      await loadAll()
    } catch (err) {
      toast({
        title: 'Erro ao salvar usuário',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // ====================== Exclusão / Inativação ======================

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteUser(deleteTarget.id)
      toast({ title: 'Usuário excluído definitivamente.' })
      setDeleteTarget(null)
      await loadAll()
    } catch (err) {
      toast({
        title: 'Não foi possível excluir',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeactivate = async (profile: ProfileWithDepartment) => {
    setIsDeactivatingId(profile.id)
    try {
      await deactivateUser(profile.id)
      toast({ title: `"${profile.full_name}" foi inativado.` })
      await loadAll()
    } catch (err) {
      toast({
        title: 'Erro ao inativar usuário',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setIsDeactivatingId(null)
    }
  }

  // ====================== Render ======================

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Usuários</h1>
          <p className="text-sm text-slate-400 mt-1">
            Gestão de acessos e perfis de fiscais e gestores — Operação Indaiatuba.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800"
          onClick={loadAll}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </header>

      <Tabs defaultValue="usuarios" className="w-full">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="usuarios" className="gap-2">
            <UsersIcon className="w-4 h-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="departamentos" className="gap-2">
            <Building2 className="w-4 h-4" />
            Departamentos
          </TabsTrigger>
        </TabsList>

        {/* ============ Aba Usuários ============ */}
        <TabsContent value="usuarios" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={openNewUser}
              disabled={isSaving}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Usuário
            </Button>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400 w-16">Foto</TableHead>
                  <TableHead className="text-slate-400">Nome Completo</TableHead>
                  <TableHead className="text-slate-400">E-mail</TableHead>
                  <TableHead className="text-slate-400">Departamento</TableHead>
                  <TableHead className="text-slate-400">Nível de Acesso</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-slate-400 py-10">
                      Carregando usuários…
                    </TableCell>
                  </TableRow>
                ) : profiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-slate-400 py-10">
                      Nenhum usuário cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  profiles.map((profile) => {
                    const hasLinks = !!profile.has_operational_links
                    const initials = profile.full_name
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase() || '')
                      .join('')

                    return (
                      <TableRow key={profile.id} className="border-slate-800">
                        <TableCell>
                          <Avatar className="h-10 w-10 border border-slate-700">
                            {profile.avatar && (
                              <AvatarImage
                                src={avatarUrl(profile)}
                                alt={`Foto de ${profile.full_name}`}
                              />
                            )}
                            <AvatarFallback className="bg-slate-800 text-slate-300 text-xs font-semibold">
                              {initials || '?'}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-medium text-white">
                          {profile.full_name}
                        </TableCell>
                        <TableCell className="text-slate-300">{profile.email}</TableCell>
                        <TableCell className="text-slate-300">
                          {profile.department_id
                            ? departmentNameById.get(profile.department_id) || '—'
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              profile.role === 'admin'
                                ? 'bg-amber-950/50 text-amber-300 border-amber-800'
                                : 'bg-blue-950/50 text-blue-300 border-blue-800'
                            }
                          >
                            {profile.role === 'admin' ? (
                              <ShieldCheck className="w-3 h-3 mr-1 inline" />
                            ) : (
                              <UserCheck className="w-3 h-3 mr-1 inline" />
                            )}
                            {profile.role === 'admin' ? 'ADMIN' : 'OPERATOR'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              profile.active
                                ? 'bg-green-950/60 text-green-400 border border-green-800'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }
                          >
                            {profile.active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800"
                                onClick={() => openEditUser(profile)}
                              >
                                <Pencil className="w-4 h-4 mr-1" />
                                Editar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-red-950/60 border-red-900 text-red-300 hover:bg-red-900/60 disabled:opacity-40"
                                disabled={hasLinks}
                                title={
                                  hasLinks ? LINKED_HISTORY_WARNING : 'Excluir definitivamente'
                                }
                                onClick={() => setDeleteTarget(profile)}
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Excluir
                              </Button>
                            </div>
                            {hasLinks && (
                              <div className="flex flex-col items-end gap-1.5 max-w-[340px]">
                                <p className="text-[11px] leading-snug text-amber-300/90 text-right">
                                  {LINKED_HISTORY_WARNING}
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-amber-950/60 border-amber-800 text-amber-200 hover:bg-amber-900/60"
                                  disabled={
                                    profile.active === false || isDeactivatingId === profile.id
                                  }
                                  onClick={() => handleDeactivate(profile)}
                                >
                                  <UserCheck className="w-4 h-4 mr-1" />
                                  {isDeactivatingId === profile.id
                                    ? 'Inativando…'
                                    : 'Inativar Usuário'}
                                </Button>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ============ Aba Departamentos ============ */}
        <TabsContent value="departamentos" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={openNewDepartment}
              disabled={isSaving}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Departamento
            </Button>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Nome</TableHead>
                  <TableHead className="text-slate-400">Descrição</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-slate-400 py-10">
                      Carregando departamentos…
                    </TableCell>
                  </TableRow>
                ) : departments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-slate-400 py-10">
                      Nenhum departamento cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  departments.map((dept) => (
                    <TableRow key={dept.id} className="border-slate-800">
                      <TableCell className="font-medium text-white">{dept.name}</TableCell>
                      <TableCell className="text-slate-300">{dept.description || '—'}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            dept.active
                              ? 'bg-green-950/60 text-green-400 border border-green-800'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }
                        >
                          {dept.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Switch
                            checked={dept.active}
                            onCheckedChange={() => toggleDepartmentActive(dept)}
                            aria-label={`Alternar status do departamento ${dept.name}`}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800"
                            onClick={() => openEditDepartment(dept)}
                          >
                            <Pencil className="w-4 h-4 mr-1" />
                            Editar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* ============ Modal: Novo/Editar Departamento ============ */}
      <Dialog open={departmentDialogOpen} onOpenChange={setDepartmentDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingDepartment ? 'Editar Departamento' : 'Novo Departamento'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Departamentos inativos não aparecem no cadastro de novos usuários.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="department-name">Nome *</Label>
              <Input
                id="department-name"
                value={departmentForm.name}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setDepartmentForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex.: Expedição"
                className={`bg-slate-950 border-slate-700 text-slate-100 ${fieldBorderClass(!!departmentErrors.name)}`}
              />
              <FieldError message={departmentErrors.name} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="department-description">Descrição</Label>
              <Textarea
                id="department-description"
                value={departmentForm.description}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setDepartmentForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descrição opcional do setor"
                className="bg-slate-950 border-slate-700 text-slate-100 min-h-[80px]"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3">
              <Label htmlFor="department-active" className="text-slate-200">
                Departamento Ativo
              </Label>
              <Switch
                id="department-active"
                checked={departmentForm.active}
                onCheckedChange={(checked) => setDepartmentForm((f) => ({ ...f, active: checked }))}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 mt-2">
            <Button
              variant="outline"
              className="bg-slate-950 border-slate-700 text-slate-200 hover:bg-slate-800"
              onClick={() => setDepartmentDialogOpen(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleDepartmentSubmit}
              disabled={isSaving}
            >
              {isSaving ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ Modal: Novo/Editar Usuário ============ */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingProfile ? 'Editar Usuário' : 'Novo Usuário'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingProfile
                ? 'Deixe a senha em branco para manter a senha atual.'
                : 'Preencha os dados de acesso do novo usuário.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Avatar */}
            <div className="space-y-1.5">
              <Label>Foto de Perfil</Label>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border border-slate-700">
                  {avatarPreview ? (
                    <AvatarImage src={avatarPreview} alt="Pré-visualização da foto" />
                  ) : null}
                  <AvatarFallback className="bg-slate-800 text-slate-300 font-semibold">
                    <ImagePlus className="w-5 h-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1.5">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="bg-slate-950 border-slate-700 text-slate-200 hover:bg-slate-800"
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      <ImagePlus className="w-4 h-4 mr-1" />
                      {avatarPreview ? 'Trocar foto' : 'Selecionar foto'}
                    </Button>
                    {avatarFile && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="bg-slate-950 border-slate-700 text-slate-400 hover:bg-slate-800"
                        onClick={removeAvatarSelection}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Remover
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">PNG, JPG ou WEBP — até 5 MB.</p>
                </div>
              </div>
              <FieldError message={userErrors.avatar} />
            </div>

            {/* Switch Usuário Ativo */}
            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3">
              <Label htmlFor="user-active" className="text-slate-200">
                Usuário Ativo
              </Label>
              <Switch
                id="user-active"
                checked={userForm.active}
                onCheckedChange={(checked) => setUserForm((f) => ({ ...f, active: checked }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-fullname">Nome Completo *</Label>
              <Input
                id="user-fullname"
                value={userForm.full_name}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setUserForm((f) => ({ ...f, full_name: e.target.value }))}
                placeholder="Ex.: João da Silva"
                className={`bg-slate-950 border-slate-700 text-slate-100 ${fieldBorderClass(!!userErrors.full_name)}`}
              />
              <FieldError message={userErrors.full_name} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-email">E-mail *</Label>
              <Input
                id="user-email"
                type="email"
                value={userForm.email}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="nome@globex.com"
                className={`bg-slate-950 border-slate-700 text-slate-100 ${fieldBorderClass(!!userErrors.email)}`}
              />
              <FieldError message={userErrors.email} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="user-role">Nível de Acesso</Label>
                <Select
                  value={userForm.role}
                  onValueChange={(value) =>
                    setUserForm((f) => ({ ...f, role: value as 'admin' | 'operator' }))
                  }
                >
                  <SelectTrigger
                    id="user-role"
                    className="bg-slate-950 border-slate-700 text-slate-100"
                  >
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                    <SelectItem value="operator">OPERATOR</SelectItem>
                    <SelectItem value="admin">ADMIN</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="user-department">Departamento</Label>
                <Select
                  value={userForm.department_id || undefined}
                  onValueChange={(value) => setUserForm((f) => ({ ...f, department_id: value }))}
                >
                  <SelectTrigger
                    id="user-department"
                    className="bg-slate-950 border-slate-700 text-slate-100"
                  >
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                    {activeDepartments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="user-password">Senha {editingProfile ? '' : '*'}</Label>
                <Input
                  id="user-password"
                  type="password"
                  value={userForm.password}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder={
                    editingProfile ? 'Deixe em branco para manter a senha atual' : '••••••'
                  }
                  className={`bg-slate-950 border-slate-700 text-slate-100 ${fieldBorderClass(!!userErrors.password)}`}
                />
                <FieldError message={userErrors.password} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="user-password-confirm">
                  Confirmar Senha {editingProfile ? '' : '*'}
                </Label>
                <Input
                  id="user-password-confirm"
                  type="password"
                  value={userForm.passwordConfirm}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setUserForm((f) => ({ ...f, passwordConfirm: e.target.value }))}
                  placeholder={
                    editingProfile ? 'Deixe em branco para manter a senha atual' : '••••••'
                  }
                  className={`bg-slate-950 border-slate-700 text-slate-100 ${fieldBorderClass(!!userErrors.passwordConfirm)}`}
                />
                <FieldError message={userErrors.passwordConfirm} />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 mt-2">
            <Button
              variant="outline"
              className="bg-slate-950 border-slate-700 text-slate-200 hover:bg-slate-800"
              onClick={() => setUserDialogOpen(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleUserSubmit}
              disabled={isSaving}
            >
              {isSaving ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ AlertDialog: confirmar exclusão definitiva ============ */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {deleteTarget && (
                <>
                  <span className="text-slate-200">{deleteTarget.full_name}</span> será excluído
                  <span className="font-semibold text-red-300"> definitivamente</span> — o perfil e
                  a conta de acesso serão removidos do banco e esta ação não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              className="bg-slate-950 border-slate-700 text-slate-200 hover:bg-slate-800"
              disabled={isDeleting}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault()
                handleConfirmDelete()
              }}
            >
              {isDeleting ? 'Excluindo…' : 'Excluir definitivamente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
