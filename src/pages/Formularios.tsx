import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormBuilder, type BuilderSubmitPayload } from '@/components/forms/FormBuilder'
import { SubjectsDialog } from '@/components/forms/SubjectsDialog'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { useAuth } from '@/contexts/AuthContext'
import { listDepartments } from '@/services/departments'
import {
  createTemplate,
  deleteTemplate,
  getResponsesCount,
  listTemplates,
  updateTemplate,
} from '@/services/templates'
import { listSubjects } from '@/services/subjects'
import type { DepartmentRecord } from '@/types/department'
import type { SubjectRecord } from '@/types/subject'
import type { TemplateRecord } from '@/types/template'
import { buildBlocksPayload } from '@/lib/templateConfig'
import { FileText, FolderCog, Pencil, Plus, Search } from 'lucide-react'

type View = 'list' | 'builder'

export default function Formularios() {
  const { profile } = useAuth()
  const { toast } = useToast()

  const [view, setView] = useState<View>('list')
  const [templates, setTemplates] = useState<TemplateRecord[]>([])
  const [subjects, setSubjects] = useState<SubjectRecord[]>([])
  const [departments, setDepartments] = useState<DepartmentRecord[]>([])
  const [responsesCounts, setResponsesCounts] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // filtros da lista
  const [search, setSearch] = useState('')
  const [filterDepartment, setFilterDepartment] = useState('all')
  const [filterSubject, setFilterSubject] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // modal de assuntos
  const [subjectsOpen, setSubjectsOpen] = useState(false)

  // construtor
  const [editingTemplate, setEditingTemplate] = useState<TemplateRecord | null>(null)
  const [responsesCount, setResponsesCount] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const loadAll = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const [tpls, subs, depts] = await Promise.all([
        listTemplates(),
        listSubjects(),
        listDepartments(),
      ])
      setTemplates(tpls)
      setSubjects(subs)
      setDepartments(depts)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // Contadores de respostas (rota server-side; a coleção responses tem regras null).
  // A listagem server-side já devolve responses_count; este efeito cobre o fallback
  // do SDK (sem contagem) buscando a contagem dedicada por template.
  useEffect(() => {
    const pending = templates.filter((t) => t.responses_count === undefined)
    if (pending.length === 0) return
    let cancelled = false
    const loadCounts = async () => {
      const entries = await Promise.all(
        pending.map(async (t) => {
          try {
            const n = await getResponsesCount(t.id)
            return [t.id, n ?? 0] as const
          } catch {
            return [t.id, 0] as const
          }
        }),
      )
      if (!cancelled) {
        setResponsesCounts((prev) => ({ ...prev, ...Object.fromEntries(entries) }))
      }
    }
    loadCounts()
    return () => {
      cancelled = true
    }
  }, [templates])

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase()
    return templates.filter((t) => {
      if (q && !t.name.toLowerCase().includes(q)) return false
      if (filterDepartment !== 'all' && (t.department_id ?? '') !== filterDepartment) return false
      if (filterSubject !== 'all' && (t.subject_id ?? '') !== filterSubject) return false
      if (statusFilter === 'active' && !t.active) return false
      if (statusFilter === 'inactive' && t.active) return false
      return true
    })
  }, [templates, search, filterDepartment, filterSubject, statusFilter])

  const departmentName = useCallback(
    (id?: string) => departments.find((d) => d.id === id)?.name ?? '',
    [departments],
  )
  const subjectName = useCallback(
    (id?: string) => subjects.find((s) => s.id === id)?.name ?? '',
    [subjects],
  )

  // ---------- construtor ----------
  const openNewTemplate = () => {
    setEditingTemplate(null)
    setResponsesCount(null)
    setView('builder')
  }

  const openEditTemplate = async (t: TemplateRecord) => {
    setEditingTemplate(t)
    // Contagem de respostas para o modo de edição segura (null = ainda consultando).
    setResponsesCount(t.responses_count ?? (await getResponsesCount(t.id)))
    setView('builder')
  }

  const handleBuilderSubmit = async (payload: BuilderSubmitPayload) => {
    if (!profile) {
      toast({
        title: 'Sessão expirada',
        description: 'Faça login novamente para salvar o formulário.',
        variant: 'destructive',
      })
      return
    }
    setIsSaving(true)
    try {
      // Atribuições + Design do PDF viajam DENTRO do JSON blocks (sem colunas novas).
      const payloadWithConfig = {
        ...payload,
        blocks: buildBlocksPayload(payload.blocks, payload.assignments, payload.pdfDesign),
      }
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, payloadWithConfig)
      } else {
        await createTemplate(payloadWithConfig)
      }
      toast({
        title: editingTemplate ? 'Formulário atualizado' : 'Formulário criado',
        description: `“${payload.name}” foi salvo com sucesso.`,
      })
      setView('list')
      setEditingTemplate(null)
      await loadAll()
    } catch (err) {
      toast({
        title: 'Erro ao salvar formulário',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // ---------- assuntos ----------
  const handleDeleteTemplate = async (t: TemplateRecord) => {
    try {
      await deleteTemplate(t.id)
      toast({ title: 'Formulário excluído', description: `“${t.name}” foi removido.` })
      await loadAll()
    } catch (err) {
      toast({
        title: 'Não foi possível excluir',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  if (view === 'builder') {
    return (
      <FormBuilder
        departments={departments}
        subjects={subjects}
        template={editingTemplate}
        responsesCount={responsesCount}
        isSaving={isSaving}
        onCancel={() => {
          setView('list')
          setEditingTemplate(null)
        }}
        onSubmit={handleBuilderSubmit}
      />
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-10 bg-slate-950 min-h-screen">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Formulários &amp; Checklists
          </h1>
          <p className="text-sm text-slate-400">
            Modelos de formulários organizados em blocos, com assuntos e departamentos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSubjectsOpen(true)}>
            <FolderCog className="mr-2 h-4 w-4" /> Gerenciar Assuntos
          </Button>
          <Button onClick={openNewTemplate}>
            <Plus className="mr-2 h-4 w-4" /> Novo Formulário
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar formulário por nome…"
              className="pl-9 bg-slate-950 border-slate-800 text-slate-100"
            />
          </div>
          <Select value={filterDepartment} onValueChange={setFilterDepartment}>
            <SelectTrigger className="w-full md:w-52 bg-slate-950 border-slate-800 text-slate-100">
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
              <SelectItem value="all">Todos os departamentos</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-full md:w-48 bg-slate-950 border-slate-800 text-slate-100">
              <SelectValue placeholder="Assunto" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
              <SelectItem value="all">Todos os assuntos</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-40 bg-slate-950 border-slate-800 text-slate-100">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Lista de templates */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full bg-slate-900" />
          ))}
        </div>
      ) : error ? (
        <Card className="border-red-900/60 bg-red-950/20">
          <CardContent className="p-4 text-sm text-red-300">{error}</CardContent>
        </Card>
      ) : filteredTemplates.length === 0 ? (
        <Card className="border-dashed border-slate-800 bg-slate-900/30">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center text-slate-400">
            <FileText className="h-10 w-10" />
            <p className="text-sm">
              {templates.length === 0
                ? 'Nenhum formulário cadastrado ainda. Clique em “Novo Formulário” para começar.'
                : 'Nenhum formulário corresponde aos filtros aplicados.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTemplates.map((t) => {
            const count = t.responses_count ?? responsesCounts[t.id] ?? 0
            return (
              <Card
                key={t.id}
                className="border-slate-800 bg-slate-900/50 text-slate-200 hover:border-slate-700 transition-colors"
              >
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-white">{t.name}</span>
                      <Badge
                        variant="outline"
                        className={
                          t.active
                            ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800 text-[10px]'
                            : 'bg-slate-800/60 text-slate-400 border-slate-700 text-[10px]'
                        }
                      >
                        {t.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                      {count > 0 && (
                        <Badge
                          variant="outline"
                          className="bg-blue-950/50 text-blue-300 border-blue-800 text-[10px]"
                        >
                          {count} resposta{count === 1 ? '' : 's'}
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-slate-400">
                      {[
                        departmentName(t.department_id) || 'Sem departamento',
                        subjectName(t.subject_id) || 'Sem assunto',
                        `${(t.blocks ?? []).length} bloco(s)`,
                        `${(t.blocks ?? []).reduce((acc, b) => acc + (b.fields?.length ?? 0), 0)} campo(s)`,
                      ].join(' · ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditTemplate(t)}
                      className="border-slate-700 bg-slate-950/60 text-slate-200 hover:bg-slate-800"
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTemplate(t)}
                      disabled={count > 0}
                      title={
                        count > 0 ? 'Formulário com respostas não pode ser excluído' : 'Excluir'
                      }
                      className="text-red-400 hover:text-red-300 hover:bg-red-950/40"
                    >
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <SubjectsDialog
        open={subjectsOpen}
        onOpenChange={setSubjectsOpen}
        departments={departments}
        onSubjectsChanged={() => {
          listSubjects()
            .then(setSubjects)
            .catch(() => undefined)
        }}
      />
    </div>
  )
}
