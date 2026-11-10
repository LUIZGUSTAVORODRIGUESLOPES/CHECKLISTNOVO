import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  AlertTriangle,
  Archive,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  FileText,
  GripVertical,
  LayoutTemplate,
  Lock,
  Plus,
  Settings2,
  Trash2,
} from 'lucide-react'
import type { DepartmentRecord } from '@/types/department'
import type { SubjectRecord } from '@/types/subject'
import {
  FIELD_TYPE_LABELS,
  type FieldType,
  type TemplateBlock,
  type TemplateField,
  type TemplateRecord,
} from '@/types/template'

const selectAuto = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
  e.target.select()

const newId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

const newBlock = (index: number): TemplateBlock => ({
  id: newId('blk'),
  title: `Novo Bloco ${index}`,
  instructions: '',
  fields: [],
})

const newField = (type: FieldType, index: number): TemplateField => ({
  id: newId('fld'),
  type,
  label:
    type === 'select' || type === 'multiselect' ? `Nova Opção ${index}` : `Novo Campo ${index}`,
  instructions: '',
  required: false,
  options: type === 'select' || type === 'multiselect' ? ['Opção 1'] : undefined,
})

const TOOLBOX_ITEMS: { type: FieldType; icon: React.ReactNode }[] = [
  { type: 'text', icon: <FileText className="h-4 w-4" /> },
  { type: 'number', icon: <Settings2 className="h-4 w-4" /> },
  { type: 'date', icon: <LayoutTemplate className="h-4 w-4" /> },
  { type: 'select', icon: <ChevronDown className="h-4 w-4" /> },
  { type: 'multiselect', icon: <ChevronUp className="h-4 w-4" /> },
]

export interface BuilderSubmitPayload {
  name: string
  description: string
  department_id: string
  subject_id: string
  blocks: TemplateBlock[]
  active: boolean
}

interface FormBuilderProps {
  departments: DepartmentRecord[]
  subjects: SubjectRecord[]
  /** Template em edição (null = novo formulário). */
  template: TemplateRecord | null
  /** Contagem de respostas; null = ainda não consultada. */
  responsesCount: number | null
  isSaving: boolean
  onCancel: () => void
  onSubmit: (payload: BuilderSubmitPayload) => Promise<void>
}

/**
 * Construtor de formulários em 3 colunas (cabeçalho / toolbox / blocos)
 * com painel de propriedades e modo de edição segura baseado em respostas.
 */
export function FormBuilder({
  departments,
  subjects,
  template,
  responsesCount,
  isSaving,
  onCancel,
  onSubmit,
}: FormBuilderProps) {
  const [name, setName] = useState(template?.name ?? '')
  const [description, setDescription] = useState(template?.description ?? '')
  const [departmentId, setDepartmentId] = useState(template?.department_id ?? '')
  const [subjectId, setSubjectId] = useState(template?.subject_id ?? '')
  const [active, setActive] = useState(template ? template.active : true)
  const [blocks, setBlocks] = useState<TemplateBlock[]>(
    template ? template.blocks.map((b) => ({ ...b, fields: b.fields.map((f) => ({ ...f })) })) : [],
  )
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [confirmDeleteField, setConfirmDeleteField] = useState<TemplateField | null>(null)
  const confirmDeleteContextRef = useRef<{ blockId: string } | null>(null)

  const hasResponses = (responsesCount ?? 0) > 0
  // Edição segura: com respostas, tipo do campo é travado e exclusão vira arquivamento.
  const safeMode = !!template && hasResponses

  // Foco automático: título do bloco recém-adicionado / rótulo do campo recém-adicionado.
  const blockTitleRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const fieldLabelRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const focusRequest = useRef<{ kind: 'block' | 'field'; id: string } | null>(null)
  useEffect(() => {
    const req = focusRequest.current
    if (!req) return
    const el =
      req.kind === 'block' ? blockTitleRefs.current[req.id] : fieldLabelRefs.current[req.id]
    if (el) {
      el.focus()
      el.select()
      focusRequest.current = null
    }
  })

  const selectedBlock = useMemo(
    () => blocks.find((b) => b.id === selectedBlockId) ?? null,
    [blocks, selectedBlockId],
  )
  const selectedField = useMemo(() => {
    if (!selectedBlock || !selectedFieldId) return null
    return selectedBlock.fields.find((f) => f.id === selectedFieldId) ?? null
  }, [selectedBlock, selectedFieldId])

  // ---------- helpers de mutação ----------
  const updateBlocks = (fn: (draft: TemplateBlock[]) => void) => {
    setBlocks((prev) => {
      const draft = prev.map((b) => ({ ...b, fields: b.fields.map((f) => ({ ...f })) }))
      fn(draft)
      return draft
    })
  }

  const updateBlock = (blockId: string, fn: (block: TemplateBlock) => void) => {
    updateBlocks((draft) => {
      const block = draft.find((b) => b.id === blockId)
      if (block) fn(block)
    })
  }

  const updateField = (blockId: string, fieldId: string, fn: (field: TemplateField) => void) => {
    updateBlocks((draft) => {
      const block = draft.find((b) => b.id === blockId)
      const field = block?.fields.find((f) => f.id === fieldId)
      if (field) fn(field)
    })
  }

  // ---------- ações do construtor ----------
  const handleAddBlock = () => {
    const block = newBlock(blocks.length + 1)
    setBlocks((prev) => [...prev, block])
    setSelectedBlockId(block.id)
    setSelectedFieldId(null)
    focusRequest.current = { kind: 'block', id: block.id }
  }

  /** Adiciona campo no bloco selecionado (ou cria o primeiro bloco). */
  const handleAddField = (type: FieldType) => {
    let targetBlockId = selectedBlockId
    if (!targetBlockId || !blocks.some((b) => b.id === targetBlockId)) {
      if (blocks.length > 0) {
        targetBlockId = blocks[0].id
        setSelectedBlockId(targetBlockId)
      } else {
        const block = newBlock(1)
        setBlocks((prev) => [...prev, block])
        targetBlockId = block.id
        setSelectedBlockId(block.id)
        focusRequest.current = { kind: 'block', id: block.id }
      }
    }
    const field = newField(type, 1)
    const blockId = targetBlockId!
    updateBlock(blockId, (block) => {
      block.fields.push(field)
    })
    setSelectedFieldId(field.id)
    focusRequest.current = { kind: 'field', id: field.id }
  }

  const handleDeleteBlock = (blockId: string) => {
    updateBlocks((draft) => {
      const idx = draft.findIndex((b) => b.id === blockId)
      if (idx !== -1) draft.splice(idx, 1)
    })
    if (selectedBlockId === blockId) setSelectedBlockId(null)
    setSelectedFieldId(null)
  }

  const handleDeleteField = (blockId: string, fieldId: string) => {
    updateBlock(blockId, (block) => {
      block.fields = block.fields.filter((f) => f.id !== fieldId)
    })
    if (selectedFieldId === fieldId) setSelectedFieldId(null)
  }

  const handleArchiveField = (blockId: string, fieldId: string) => {
    updateField(blockId, fieldId, (field) => {
      field.archived = true
    })
  }

  const handleMoveBlock = (blockId: string, dir: -1 | 1) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === blockId)
      const to = idx + dir
      if (idx === -1 || to < 0 || to >= prev.length) return prev
      const next = [...prev]
      const [item] = next.splice(idx, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  const handleMoveField = (blockId: string, fieldId: string, dir: -1 | 1) => {
    updateBlock(blockId, (block) => {
      const idx = block.fields.findIndex((f) => f.id === fieldId)
      const to = idx + dir
      if (idx === -1 || to < 0 || to >= block.fields.length) return
      const [item] = block.fields.splice(idx, 1)
      block.fields.splice(to, 0, item)
    })
  }

  const handleSubmit = async () => {
    if (!name.trim()) return
    await onSubmit({
      name: name.trim(),
      description,
      department_id: departmentId,
      subject_id: subjectId,
      blocks,
      active,
    })
  }

  const activeSubjects = subjects.filter((s) => s.active || s.id === subjectId)

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-10 bg-slate-950 min-h-screen">
      {/* Cabeçalho da tela do construtor */}
      <div className="flex flex-col gap-2 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {template ? 'Editar Formulário' : 'Novo Formulário'}
          </h1>
          <p className="text-sm text-slate-400">
            {template
              ? `Modo ${safeMode ? 'de edição segura' : 'de edição livre'} — ${template.name}`
              : 'Monte o checklist em blocos com os tipos de campo disponíveis'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || !name.trim()}>
            {isSaving ? 'Salvando…' : 'Salvar Formulário'}
          </Button>
        </div>
      </div>

      {/* Aviso de modo de edição segura */}
      {safeMode && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-900/60 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Modo de edição segura</p>
            <p className="text-amber-200/80">
              Este formulário já possui {responsesCount} resposta(s) vinculada(s). É possível criar
              campos e editar rótulos e instruções, mas o tipo dos campos existentes está bloqueado
              e excluir campos foi substituído por “Arquivar Campo”, para preservar as respostas
              antigas.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
        {/* ============ Coluna 1: Cabeçalho + Toolbox ============ */}
        <div className="space-y-4">
          <Card className="border-slate-800 bg-slate-900/50 text-slate-200">
            <CardContent className="space-y-4 p-4">
              <div className="text-sm font-semibold text-white">Cabeçalho do Formulário</div>
              <div className="space-y-1">
                <Label htmlFor="tpl-name">Nome do Formulário *</Label>
                <Input
                  id="tpl-name"
                  value={name}
                  onFocus={selectAuto}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Checklist de Recebimento"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tpl-description">Descrição</Label>
                <Textarea
                  id="tpl-description"
                  value={description}
                  onFocus={selectAuto}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o objetivo do formulário"
                  rows={3}
                />
              </div>
              <div className="space-y-1">
                <Label>Departamento</Label>
                <Select
                  value={departmentId || 'none'}
                  onValueChange={(v) => setDepartmentId(v === 'none' ? '' : v)}
                >
                  <SelectTrigger className="w-full bg-slate-950">
                    <SelectValue placeholder="Selecione (opcional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                    <SelectItem value="none">Sem departamento</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Assunto</Label>
                <Select
                  value={subjectId || undefined}
                  onValueChange={(v) => setSubjectId(v === 'none' ? '' : v)}
                >
                  <SelectTrigger className="w-full bg-slate-950">
                    <SelectValue placeholder="Selecione (opcional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                    <SelectItem value="none">Sem assunto</SelectItem>
                    {activeSubjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="tpl-active" checked={active} onCheckedChange={setActive} />
                <Label htmlFor="tpl-active">Formulário Ativo</Label>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/50 text-slate-200">
            <CardContent className="space-y-2 p-4">
              <div className="text-sm font-semibold text-white">Caixa de Ferramentas</div>
              <Button
                variant="outline"
                onClick={handleAddBlock}
                className="w-full justify-start gap-2 border-blue-900/60 bg-blue-950/30 text-blue-200 hover:bg-blue-950/60"
              >
                <Plus className="h-4 w-4" /> Adicionar Bloco
              </Button>
              <div className="pt-1 text-xs font-medium uppercase tracking-wider text-slate-400">
                Tipos de Campo
              </div>
              {TOOLBOX_ITEMS.map((item) => (
                <Button
                  key={item.type}
                  variant="outline"
                  onClick={() => handleAddField(item.type)}
                  className="w-full justify-start gap-2 border-slate-700 bg-slate-950/60 text-slate-200 hover:bg-slate-800"
                >
                  {item.icon}
                  {FIELD_TYPE_LABELS[item.type]}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* ============ Coluna 2: blocos com campos ============ */}
        <div className="space-y-4">
          {blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 bg-slate-900/30 p-10 text-center text-slate-400">
              <LayoutTemplate className="mb-3 h-10 w-10" />
              <p className="text-sm">
                Nenhum bloco ainda. Use{' '}
                <strong className="text-slate-200">+ Adicionar Bloco</strong> ou clique em um tipo
                de campo na Caixa de Ferramentas — o primeiro bloco é criado automaticamente.
              </p>
            </div>
          ) : (
            blocks.map((block, blockIndex) => {
              const isBlockSelected = block.id === selectedBlockId
              return (
                <div
                  key={block.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedBlockId(block.id)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setSelectedBlockId(block.id)
                  }}
                  className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                    isBlockSelected
                      ? 'border-blue-500 bg-slate-900/70 shadow-[0_0_0_1px_rgba(59,130,246,0.4)]'
                      : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                  }`}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <GripVertical className="h-4 w-4 shrink-0 text-slate-500" />
                    <Input
                      ref={(el) => {
                        blockTitleRefs.current[block.id] = el
                      }}
                      value={block.title}
                      onFocus={(e) => {
                        e.target.select()
                        setSelectedBlockId(block.id)
                      }}
                      onChange={(e) => updateBlock(block.id, (b) => (b.title = e.target.value))}
                      className="h-8 border-transparent bg-transparent px-1 text-sm font-semibold text-white hover:border-slate-700"
                      placeholder="Título do bloco"
                    />
                    <Badge
                      variant="outline"
                      className="border-slate-700 text-[10px] text-slate-400"
                    >
                      {block.fields.length} campo{block.fields.length === 1 ? '' : 's'}
                    </Badge>
                    <div className="ml-auto flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-slate-100"
                        title="Mover bloco para cima"
                        disabled={blockIndex === 0}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMoveBlock(block.id, -1)
                        }}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-slate-100"
                        title="Mover bloco para baixo"
                        disabled={blockIndex === blocks.length - 1}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMoveBlock(block.id, 1)
                        }}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-950/40"
                        title="Excluir bloco"
                        disabled={safeMode}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteBlock(block.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {block.fields.length === 0 ? (
                    <p className="rounded border border-dashed border-slate-800 px-3 py-4 text-center text-xs text-slate-500">
                      Bloco vazio — selecione-o e adicione um campo pela Caixa de Ferramentas.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {block.fields.map((field, fieldIndex) => {
                        const isFieldSelected = isBlockSelected && field.id === selectedFieldId
                        return (
                          <div
                            key={field.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedBlockId(block.id)
                              setSelectedFieldId(field.id)
                            }}
                            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                              isFieldSelected
                                ? 'border-blue-400 bg-blue-950/20'
                                : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                            } ${field.archived ? 'opacity-50' : ''}`}
                          >
                            <span className="w-24 shrink-0 truncate text-xs text-slate-400">
                              {FIELD_TYPE_LABELS[field.type]}
                            </span>
                            <Input
                              ref={(el) => {
                                fieldLabelRefs.current[field.id] = el
                              }}
                              value={field.label}
                              onFocus={(e) => {
                                e.target.select()
                                setSelectedBlockId(block.id)
                                setSelectedFieldId(field.id)
                              }}
                              onChange={(e) =>
                                updateField(block.id, field.id, (f) => (f.label = e.target.value))
                              }
                              className="h-7 flex-1 border-transparent bg-transparent px-1 text-sm text-slate-100 hover:border-slate-700"
                              placeholder="Rótulo do campo"
                            />
                            {field.archived && (
                              <Archive className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                            )}
                            {field.required && !field.archived && (
                              <span className="text-xs font-semibold text-red-400">*</span>
                            )}
                            <div className="ml-auto flex items-center gap-0.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-slate-500 hover:text-slate-200"
                                title="Mover campo para cima"
                                disabled={fieldIndex === 0}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleMoveField(block.id, field.id, -1)
                                }}
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-slate-500 hover:text-slate-200"
                                title="Mover campo para baixo"
                                disabled={fieldIndex === block.fields.length - 1}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleMoveField(block.id, field.id, 1)
                                }}
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </Button>
                              {safeMode ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-amber-400 hover:text-amber-300 hover:bg-amber-950/40"
                                  title="Arquivar Campo"
                                  disabled={field.archived}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleArchiveField(block.id, field.id)
                                  }}
                                >
                                  <Archive className="h-3.5 w-3.5" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-950/40"
                                  title="Excluir campo"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setConfirmDeleteField(field)
                                    // guarda o contexto do campo a excluir
                                    confirmDeleteContextRef.current = { blockId: block.id }
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* ============ Coluna 3: painel de propriedades ============ */}
        <div>
          <Card className="sticky top-6 border-slate-800 bg-slate-900/50 text-slate-200">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Settings2 className="h-4 w-4" /> Propriedades
              </div>
              {!selectedField ? (
                <p className="text-sm text-slate-400">
                  Clique em um campo dentro de um bloco para editar suas propriedades.
                </p>
              ) : (
                <>
                  <div className="space-y-1">
                    <Label htmlFor="prop-label">Rótulo do Campo</Label>
                    <Input
                      id="prop-label"
                      value={selectedField.label}
                      onFocus={selectAuto}
                      onChange={(e) =>
                        updateField(selectedBlock!.id, selectedField.id, (f) => {
                          f.label = e.target.value
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="prop-type">Tipo de Campo</Label>
                    {safeMode ? (
                      <div className="flex items-center gap-2 rounded-md border border-amber-900/60 bg-amber-950/20 px-3 py-2 text-xs text-amber-200">
                        <Lock className="h-3.5 w-3.5" />
                        <span>
                          {FIELD_TYPE_LABELS[selectedField.type]} — bloqueado: o formulário já
                          possui respostas.
                        </span>
                      </div>
                    ) : (
                      <Select
                        value={selectedField.type}
                        onValueChange={(v) =>
                          updateField(selectedBlock!.id, selectedField.id, (f) => {
                            const type = v as FieldType
                            f.type = type
                            if (type === 'select' || type === 'multiselect') {
                              if (!f.options || f.options.length === 0) f.options = ['Opção 1']
                            }
                          })
                        }
                      >
                        <SelectTrigger className="w-full bg-slate-950">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                          {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="prop-instructions">Instruções</Label>
                    <Textarea
                      id="prop-instructions"
                      value={selectedField.instructions ?? ''}
                      onFocus={selectAuto}
                      onChange={(e) =>
                        updateField(selectedBlock!.id, selectedField.id, (f) => {
                          f.instructions = e.target.value
                        })
                      }
                      placeholder="Orientação exibida ao operador (opcional)"
                      rows={2}
                    />
                  </div>
                  {safeMode && (
                    <p className="rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
                      Em modo de edição segura, rótulos e instruções continuam editáveis; tipo e
                      exclusão são limitados para preservar as respostas.
                    </p>
                  )}
                  {selectedField.archived && (
                    <p className="rounded-md border border-amber-900/60 bg-amber-950/20 px-3 py-2 text-xs text-amber-200">
                      Este campo está arquivado e não será exibido para novos preenchimentos; as
                      respostas antigas permanecem preservadas.
                    </p>
                  )}
                </>
              )}
              {selectedBlock && (
                <div className="space-y-1 border-t border-slate-800 pt-4">
                  <Label htmlFor="prop-block-title">Título do Bloco</Label>
                  <Input
                    id="prop-block-title"
                    value={selectedBlock.title}
                    onFocus={selectAuto}
                    onChange={(e) =>
                      updateBlock(selectedBlock.id, (b) => {
                        b.title = e.target.value
                      })
                    }
                  />
                  <Label htmlFor="prop-block-instructions" className="pt-2">
                    Instruções do Bloco
                  </Label>
                  <Textarea
                    id="prop-block-instructions"
                    value={selectedBlock.instructions ?? ''}
                    onFocus={selectAuto}
                    onChange={(e) =>
                      updateBlock(selectedBlock.id, (b) => {
                        b.instructions = e.target.value
                      })
                    }
                    placeholder="Opcional"
                    rows={2}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmação de exclusão de campo (modo livre) */}
      <AlertDialog
        open={!!confirmDeleteField}
        onOpenChange={(o) => {
          if (!o) {
            setConfirmDeleteField(null)
            confirmDeleteContextRef.current = null
          }
        }}
      >
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir campo?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              O campo “{confirmDeleteField?.label}” será removido do formulário. O formulário ainda
              não possui respostas, portanto a exclusão é segura.
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
                const ctx = confirmDeleteContextRef.current
                if (confirmDeleteField && ctx) {
                  handleDeleteField(ctx.blockId, confirmDeleteField.id)
                }
                setConfirmDeleteField(null)
                confirmDeleteContextRef.current = null
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
