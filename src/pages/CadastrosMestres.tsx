import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { useToast } from '@/hooks/use-toast'
import { Building2, Database, Inbox, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import type { EntityDefinitionRecord, MasterDataEntryRecord } from '@/types/masterData'
import {
  createEntity,
  createEntry,
  deleteEntity,
  deleteEntry,
  listEntities,
  listEntries,
  updateEntity,
  updateEntry,
} from '@/services/masterData'
import { getErrorMessage } from '@/lib/pocketbase/errors'

type FieldErrors = Record<string, string>

/** Destaque de erro por campo: borda vermelha + mensagem logo abaixo. */
const fieldBorderClass = (hasError: boolean) =>
  hasError ? 'border-red-500 focus-visible:ring-red-500' : ''

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-red-500 mt-1">{message}</p>
}

const selectAuto = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
  e.target.select()

interface EntityForm {
  name: string
  description: string
  active: boolean
}
interface EntryForm {
  value: string
  description: string
  active: boolean
}

const EMPTY_ENTITY: EntityForm = { name: '', description: '', active: true }
const EMPTY_ENTRY: EntryForm = { value: '', description: '', active: true }

export default function CadastrosMestres() {
  const { toast } = useToast()

  // ---------- Dados ----------
  const [entities, setEntities] = useState<EntityDefinitionRecord[]>([])
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null)
  const [entries, setEntries] = useState<MasterDataEntryRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [entitySearch, setEntitySearch] = useState('')
  const [entrySearch, setEntrySearch] = useState('')

  // ---------- Modais de entidade ----------
  const [entityDialogOpen, setEntityDialogOpen] = useState(false)
  const [editingEntity, setEditingEntity] = useState<EntityDefinitionRecord | null>(null)
  const [entityForm, setEntityForm] = useState<EntityForm>(EMPTY_ENTITY)
  const [entityErrors, setEntityErrors] = useState<FieldErrors>({})
  const [deleteEntityTarget, setDeleteEntityTarget] = useState<EntityDefinitionRecord | null>(null)

  // ---------- Modais de item ----------
  const [entryDialogOpen, setEntryDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<MasterDataEntryRecord | null>(null)
  const [entryForm, setEntryForm] = useState<EntryForm>(EMPTY_ENTRY)
  const [entryErrors, setEntryErrors] = useState<FieldErrors>({})
  const [deleteEntryTarget, setDeleteEntryTarget] = useState<MasterDataEntryRecord | null>(null)

  const selectedEntity = useMemo(
    () => entities.find((e) => e.id === selectedEntityId) ?? null,
    [entities, selectedEntityId],
  )

  const loadEntities = useCallback(async () => {
    setIsLoading(true)
    try {
      const list = await listEntities()
      setEntities(list)
      setSelectedEntityId((prev) =>
        prev && list.some((e) => e.id === prev) ? prev : (list[0]?.id ?? null),
      )
    } catch (err) {
      toast({
        title: 'Erro ao carregar entidades',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  const loadEntries = useCallback(
    async (entityId: string) => {
      try {
        setEntries(await listEntries(entityId))
      } catch (err) {
        toast({
          title: 'Erro ao carregar itens',
          description: getErrorMessage(err),
          variant: 'destructive',
        })
        setEntries([])
      }
    },
    [toast],
  )

  useEffect(() => {
    loadEntities()
  }, [loadEntities])

  useEffect(() => {
    if (selectedEntityId) loadEntries(selectedEntityId)
    else setEntries([])
  }, [selectedEntityId, loadEntries])

  const reloadEntries = useCallback(async () => {
    if (selectedEntityId) await loadEntries(selectedEntityId)
  }, [selectedEntityId, loadEntries])

  // ====================== Entidades ======================

  const openNewEntity = () => {
    setEditingEntity(null)
    setEntityForm(EMPTY_ENTITY)
    setEntityErrors({})
    setEntityDialogOpen(true)
  }

  const openEditEntity = (entity: EntityDefinitionRecord) => {
    setEditingEntity(entity)
    setEntityForm({
      name: entity.name,
      description: entity.description || '',
      active: entity.active,
    })
    setEntityErrors({})
    setEntityDialogOpen(true)
  }

  const validateEntity = (): boolean => {
    const errors: FieldErrors = {}
    if (!entityForm.name.trim()) errors.name = 'Informe o nome da entidade.'
    setEntityErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleEntitySubmit = async () => {
    if (!validateEntity()) return
    setIsSaving(true)
    try {
      const data = {
        name: entityForm.name.trim(),
        description: entityForm.description.trim(),
        active: entityForm.active,
      }
      let newId: string | null = null
      if (editingEntity) {
        await updateEntity(editingEntity.id, data)
        toast({ title: 'Entidade atualizada com sucesso.' })
      } else {
        newId = await createEntity(data)
        toast({ title: 'Entidade criada com sucesso.' })
      }
      setEntityDialogOpen(false)
      setEntityForm(EMPTY_ENTITY)
      setEditingEntity(null)
      if (newId) setSelectedEntityId(newId)
      await loadEntities()
    } catch (err) {
      toast({
        title: 'Erro ao salvar entidade',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const toggleEntityActive = async (entity: EntityDefinitionRecord) => {
    try {
      await updateEntity(entity.id, { active: !entity.active })
      await loadEntities()
      toast({
        title: entity.active
          ? `Entidade "${entity.name}" inativada.`
          : `Entidade "${entity.name}" ativada.`,
      })
    } catch (err) {
      toast({
        title: 'Erro ao alterar status',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  const handleDeleteEntity = async () => {
    if (!deleteEntityTarget) return
    setIsSaving(true)
    try {
      await deleteEntity(deleteEntityTarget.id)
      toast({ title: `Entidade "${deleteEntityTarget.name}" excluída.` })
      setDeleteEntityTarget(null)
      if (selectedEntityId === deleteEntityTarget.id) setSelectedEntityId(null)
      await loadEntities()
    } catch (err) {
      toast({
        title: 'Não foi possível excluir',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
      setDeleteEntityTarget(null)
    } finally {
      setIsSaving(false)
    }
  }

  // ====================== Itens ======================

  const openNewEntry = () => {
    setEditingEntry(null)
    setEntryForm(EMPTY_ENTRY)
    setEntryErrors({})
    setEntryDialogOpen(true)
  }

  const openEditEntry = (entry: MasterDataEntryRecord) => {
    setEditingEntry(entry)
    setEntryForm({
      value: entry.value,
      description: entry.description || '',
      active: entry.active,
    })
    setEntryErrors({})
    setEntryDialogOpen(true)
  }

  const validateEntry = (): boolean => {
    const errors: FieldErrors = {}
    if (!entryForm.value.trim()) errors.value = 'Informe o valor do item.'
    setEntryErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleEntrySubmit = async () => {
    if (!validateEntry() || !selectedEntityId) return
    setIsSaving(true)
    try {
      const data = {
        entity_id: selectedEntityId,
        value: entryForm.value.trim(),
        description: entryForm.description.trim(),
        active: entryForm.active,
      }
      if (editingEntry) {
        await updateEntry(editingEntry.id, data)
        toast({ title: 'Item atualizado com sucesso.' })
      } else {
        await createEntry(data)
        toast({ title: 'Item criado com sucesso.' })
      }
      setEntryDialogOpen(false)
      setEntryForm(EMPTY_ENTRY)
      setEditingEntry(null)
      await reloadEntries()
    } catch (err) {
      toast({
        title: 'Erro ao salvar item',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const toggleEntryActive = async (entry: MasterDataEntryRecord) => {
    try {
      await updateEntry(entry.id, { active: !entry.active })
      await reloadEntries()
    } catch (err) {
      toast({
        title: 'Erro ao alterar status',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  const handleDeleteEntry = async () => {
    if (!deleteEntryTarget) return
    setIsSaving(true)
    try {
      await deleteEntry(deleteEntryTarget.id)
      toast({ title: `Item "${deleteEntryTarget.value}" excluído.` })
      setDeleteEntryTarget(null)
      await reloadEntries()
    } catch (err) {
      toast({
        title: 'Não foi possível excluir',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
      setDeleteEntryTarget(null)
    } finally {
      setIsSaving(false)
    }
  }

  // ====================== Filtros ======================

  const filteredEntities = useMemo(() => {
    const q = entitySearch.trim().toLowerCase()
    if (!q) return entities
    return entities.filter(
      (e) => e.name.toLowerCase().includes(q) || (e.description || '').toLowerCase().includes(q),
    )
  }, [entities, entitySearch])

  const filteredEntries = useMemo(() => {
    const q = entrySearch.trim().toLowerCase()
    if (!q) return entries
    return entries.filter(
      (e) => e.value.toLowerCase().includes(q) || (e.description || '').toLowerCase().includes(q),
    )
  }, [entries, entrySearch])

  const activeEntryCount = useMemo(() => entries.filter((e) => e.active).length, [entries])

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <Database className="h-6 w-6 text-blue-400" /> Cadastros Mestres
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Entidades e registros usados pelo campo “Seleção de Cadastro” do Construtor de
            Formulários. Entidades em uso não podem ser excluídas — apenas inativadas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadEntities}
            disabled={isLoading}
            className="gap-2 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
          <Button size="sm" onClick={openNewEntity} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Entidade
          </Button>
        </div>
      </div>

      {/* Grade: lista de entidades | itens */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {/* Lista de entidades */}
        <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={entitySearch}
              onChange={(e) => setEntitySearch(e.target.value)}
              placeholder="Buscar entidade..."
              className="pl-9 bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600"
            />
          </div>

          {isLoading ? (
            <p className="py-6 text-center text-sm text-slate-400">Carregando entidades…</p>
          ) : filteredEntities.length === 0 ? (
            <p className="flex items-center justify-center gap-2 py-6 text-center text-sm text-slate-400">
              <Inbox className="h-4 w-4" /> Nenhuma entidade encontrada.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredEntities.map((entity) => {
                const isSelected = entity.id === selectedEntityId
                return (
                  <button
                    key={entity.id}
                    type="button"
                    onClick={() => setSelectedEntityId(entity.id)}
                    className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-950/40'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-100">
                        <Building2
                          className={`h-4 w-4 shrink-0 ${isSelected ? 'text-blue-400' : 'text-slate-500'}`}
                        />
                        <span className="truncate">{entity.name}</span>
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          entity.active
                            ? 'shrink-0 bg-emerald-950/50 text-emerald-300 border-emerald-800 text-[10px]'
                            : 'shrink-0 bg-slate-800/60 text-slate-400 border-slate-700 text-[10px]'
                        }
                      >
                        {entity.active ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                    {entity.description && (
                      <p className="mt-0.5 truncate pl-6 text-xs text-slate-400">
                        {entity.description}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Itens da entidade selecionada */}
        <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          {!selectedEntity ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Building2 className="h-8 w-8 text-slate-600" />
              <p className="text-sm text-slate-400">
                Selecione uma entidade à esquerda para gerenciar seus itens — ou crie uma nova
                entidade.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                    <Building2 className="h-5 w-5 text-blue-400" /> {selectedEntity.name}
                  </h2>
                  {selectedEntity.description && (
                    <p className="mt-0.5 max-w-xl text-sm text-slate-400">
                      {selectedEntity.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    {entries.length} item(ns) no total · {activeEntryCount} ativo(s)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditEntity(selectedEntity)}
                    className="gap-2 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar Entidade
                  </Button>
                  <Button size="sm" onClick={openNewEntry} className="gap-2">
                    <Plus className="h-4 w-4" /> Novo Item
                  </Button>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  value={entrySearch}
                  onChange={(e) => setEntrySearch(e.target.value)}
                  placeholder={`Buscar item em ${selectedEntity.name}...`}
                  className="pl-9 bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600"
                />
              </div>

              {filteredEntries.length === 0 ? (
                <p className="flex items-center justify-center gap-2 py-10 text-center text-sm text-slate-400">
                  <Inbox className="h-4 w-4" />
                  {entries.length === 0
                    ? 'Nenhum item cadastrado nesta entidade ainda.'
                    : 'Nenhum item encontrado para a busca.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-slate-100">
                            {entry.value}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              entry.active
                                ? 'shrink-0 bg-emerald-950/50 text-emerald-300 border-emerald-800 text-[10px]'
                                : 'shrink-0 bg-slate-800/60 text-slate-400 border-slate-700 text-[10px]'
                            }
                          >
                            {entry.active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                        {entry.description && (
                          <p className="truncate text-xs text-slate-400">{entry.description}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-slate-100"
                        title="Editar"
                        onClick={() => openEditEntry(entry)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Switch
                        checked={entry.active}
                        onCheckedChange={() => toggleEntryActive(entry)}
                        aria-label="Alternar status do item"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-950/40"
                        title="Excluir"
                        onClick={() => setDeleteEntryTarget(entry)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ====================== Modal de Entidade ====================== */}
      <Dialog open={entityDialogOpen} onOpenChange={setEntityDialogOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle>{editingEntity ? 'Editar Entidade' : 'Nova Entidade'}</DialogTitle>
            <DialogDescription className="text-slate-400">
              A entidade agrupa os registros oferecidos ao campo “Seleção de Cadastro” no Construtor
              de Formulários.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="entity-name">Nome *</Label>
              <Input
                id="entity-name"
                value={entityForm.name}
                onFocus={selectAuto}
                onChange={(e) => setEntityForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex.: Frota de Veículos"
                className={`bg-slate-950 border-slate-800 text-slate-100 ${fieldBorderClass(!!entityErrors.name)}`}
              />
              <FieldError message={entityErrors.name} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="entity-description">Descrição</Label>
              <Textarea
                id="entity-description"
                value={entityForm.description}
                onFocus={selectAuto}
                onChange={(e) => setEntityForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descrição opcional da entidade"
                rows={2}
                className="bg-slate-950 border-slate-800 text-slate-100"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="entity-active"
                checked={entityForm.active}
                onCheckedChange={(checked) => setEntityForm((f) => ({ ...f, active: checked }))}
              />
              <Label htmlFor="entity-active">Ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEntityDialogOpen(false)}
              className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
            >
              Cancelar
            </Button>
            <Button onClick={handleEntitySubmit} disabled={isSaving}>
              {editingEntity ? 'Salvar Alterações' : 'Criar Entidade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====================== Modal de Item ====================== */}
      <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle>{editingEntry ? 'Editar Item' : 'Novo Item'}</DialogTitle>
            <DialogDescription className="text-slate-400">
              Entidade: <strong className="font-medium">{selectedEntity?.name ?? '—'}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="entry-value">Valor *</Label>
              <Input
                id="entry-value"
                value={entryForm.value}
                onFocus={selectAuto}
                onChange={(e) => setEntryForm((f) => ({ ...f, value: e.target.value }))}
                placeholder="Texto exibido ao operador no preenchimento"
                className={`bg-slate-950 border-slate-800 text-slate-100 ${fieldBorderClass(!!entryErrors.value)}`}
              />
              <FieldError message={entryErrors.value} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="entry-description">Descrição</Label>
              <Textarea
                id="entry-description"
                value={entryForm.description}
                onFocus={selectAuto}
                onChange={(e) => setEntryForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descrição opcional do item"
                rows={2}
                className="bg-slate-950 border-slate-800 text-slate-100"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="entry-active"
                checked={entryForm.active}
                onCheckedChange={(checked) => setEntryForm((f) => ({ ...f, active: checked }))}
              />
              <Label htmlFor="entry-active">Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEntryDialogOpen(false)}
              className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
            >
              Cancelar
            </Button>
            <Button onClick={handleEntrySubmit} disabled={isSaving}>
              {editingEntry ? 'Salvar Alterações' : 'Criar Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====================== Confirmação de exclusão (entidade) ====================== */}
      <AlertDialog
        open={!!deleteEntityTarget}
        onOpenChange={(o) => !o && setDeleteEntityTarget(null)}
      >
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir entidade?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              A entidade “{deleteEntityTarget?.name}” será excluída permanentemente. A exclusão é
              recusada quando ela tem itens cadastrados ou é referenciada por algum formulário —
              nesse caso, inative-a.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-500"
              onClick={(e) => {
                e.preventDefault()
                handleDeleteEntity()
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ====================== Confirmação de exclusão (item) ====================== */}
      <AlertDialog
        open={!!deleteEntryTarget}
        onOpenChange={(o) => !o && setDeleteEntryTarget(null)}
      >
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir item?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              O item “{deleteEntryTarget?.value}” será excluído permanentemente da entidade.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-500"
              onClick={(e) => {
                e.preventDefault()
                handleDeleteEntry()
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
