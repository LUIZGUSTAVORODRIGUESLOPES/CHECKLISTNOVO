import { useEffect, useState } from 'react'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Pencil, Trash2 } from 'lucide-react'
import type { DepartmentRecord } from '@/types/department'
import type { SubjectRecord } from '@/types/subject'
import { createSubject, deleteSubject, listSubjects, updateSubject } from '@/services/subjects'
import { getErrorMessage } from '@/lib/pocketbase/errors'

interface SubjectsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  departments: DepartmentRecord[]
  /** Recarrega a lista de assuntos na tela principal ao fechar com mudanças. */
  onSubjectsChanged: () => void
}

const selectAuto = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
  e.target.select()

export function SubjectsDialog({
  open,
  onOpenChange,
  departments,
  onSubjectsChanged,
}: SubjectsDialogProps) {
  const [subjects, setSubjects] = useState<SubjectRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const [editing, setEditing] = useState<SubjectRecord | null>(null)
  const [form, setForm] = useState({ name: '', description: '', active: true })
  const [deleteTarget, setDeleteTarget] = useState<SubjectRecord | null>(null)

  const loadSubjects = async () => {
    setIsLoading(true)
    setError('')
    try {
      setSubjects(await listSubjects())
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      setEditing(null)
      setForm({ name: '', description: '', active: true })
      setDeleteTarget(null)
      loadSubjects()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Informe o nome do assunto.')
      return
    }
    setIsSaving(true)
    setError('')
    try {
      if (editing) {
        await updateSubject(editing.id, form)
      } else {
        await createSubject(form)
      }
      setEditing(null)
      setForm({ name: '', description: '', active: true })
      await loadSubjects()
      onSubjectsChanged()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActive = async (subject: SubjectRecord) => {
    setError('')
    try {
      await updateSubject(subject.id, { active: !subject.active })
      await loadSubjects()
      onSubjectsChanged()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setError('')
    try {
      await deleteSubject(deleteTarget.id)
      setDeleteTarget(null)
      await loadSubjects()
      onSubjectsChanged()
    } catch (err) {
      setError(getErrorMessage(err))
      setDeleteTarget(null)
    }
  }

  const departmentName = (id: string) =>
    departments.find((d) => d.id === id)?.name || 'Departamento removido'

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl bg-slate-900 border-slate-800 text-slate-100 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar Assuntos</DialogTitle>
            <DialogDescription className="text-slate-400">
              Categorias usadas para organizar os modelos de formulários.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          {/* Formulário de criação/edição */}
          <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
            <div className="text-sm font-medium text-slate-200">
              {editing ? `Editando: ${editing.name}` : 'Novo Assunto'}
            </div>
            <div className="space-y-1">
              <Label htmlFor="subject-name">Nome *</Label>
              <Input
                id="subject-name"
                value={form.name}
                onFocus={selectAuto}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex.: Controle de Pátio"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="subject-description">Descrição</Label>
              <Textarea
                id="subject-description"
                value={form.description}
                onFocus={selectAuto}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descrição opcional do assunto"
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="subject-active"
                checked={form.active}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, active: checked }))}
              />
              <Label htmlFor="subject-active">Ativo</Label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isSaving} size="sm">
                {editing ? 'Salvar Alterações' : 'Criar Assunto'}
              </Button>
              {editing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(null)
                    setForm({ name: '', description: '', active: true })
                  }}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </div>

          {/* Lista */}
          <div className="space-y-2">
            {isLoading ? (
              <p className="py-4 text-center text-sm text-slate-400">Carregando assuntos…</p>
            ) : subjects.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">
                Nenhum assunto cadastrado ainda.
              </p>
            ) : (
              subjects.map((subject) => (
                <div
                  key={subject.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-slate-100">
                        {subject.name}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          subject.active
                            ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800 text-[10px]'
                            : 'bg-slate-800/60 text-slate-400 border-slate-700 text-[10px]'
                        }
                      >
                        {subject.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-slate-400">
                      {subject.department_id
                        ? departmentName(subject.department_id)
                        : 'Sem departamento'}
                      {subject.description ? ` — ${subject.description}` : ''}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-slate-100"
                    title="Editar"
                    onClick={() => {
                      setEditing(subject)
                      setForm({
                        name: subject.name,
                        description: subject.description || '',
                        active: subject.active,
                      })
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Switch
                    checked={subject.active}
                    onCheckedChange={() => handleToggleActive(subject)}
                    aria-label="Alternar status do assunto"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-950/40"
                    title="Excluir"
                    onClick={() => setDeleteTarget(subject)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir assunto?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              O assunto “{deleteTarget?.name}” será excluído permanentemente. Formulários vinculados
              impedem a exclusão — nesse caso, inative o assunto.
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
                handleDelete()
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
