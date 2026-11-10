import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  MessageSquare,
  ClipboardList,
  Zap,
  Paperclip,
  ArrowDown,
  ArrowUp,
  Plus,
  Archive,
  Trash2,
  RotateCcw,
} from 'lucide-react'
import type { FieldOption } from '@/types/template'
import { normalizeOption } from '@/types/template'

interface FieldOptionsEditorProps {
  options: (string | FieldOption)[]
  onChange: (options: FieldOption[]) => void
  /** Modo de edição segura: opções antigas só podem ser inativadas. */
  safeMode?: boolean
}

const COMPLEMENT_TOGGLES = [
  {
    value: 'comment',
    label: 'Exige Comentário',
    icon: MessageSquare,
    activeCls: 'bg-blue-600 text-white border-blue-500',
  },
  {
    value: 'action_plan',
    label: 'Exige Plano de Ação',
    icon: ClipboardList,
    activeCls: 'bg-purple-600 text-white border-purple-500',
  },
  {
    value: 'action',
    label: 'Exige Ação',
    icon: Zap,
    activeCls: 'bg-amber-600 text-white border-amber-500',
  },
  {
    value: 'attachment',
    label: 'Exige Anexo',
    icon: Paperclip,
    activeCls: 'bg-emerald-600 text-white border-emerald-500',
  },
] as const

/**
 * Editor de "Opções da Lista Suspensa" de campos select/multiselect.
 * Trabalha sempre com arrays novos (imutabilidade) — cada clique em
 * "Adicionar opção" cria UMA opção distinta, e editar o texto de uma
 * opção não afeta as demais. Cada opção tem peso numérico (ou "Não se
 * aplica") e 4 toggles de complemento obrigatório. A lista é o array
 * `options` do campo, persistido no JSON blocks do template.
 */
export function FieldOptionsEditor({ options, onChange, safeMode }: FieldOptionsEditorProps) {
  // Texto em digitação da opção recém-criada: mantido localmente para que
  // cada nova opção comece com um placeholder distinto e editável.
  const [draft, setDraft] = useState('')
  // Foco automático (com texto selecionado) na opção recém-adicionada.
  const lastInputRef = useRef<HTMLInputElement | null>(null)
  const focusRequest = useRef<number | null>(null)
  useEffect(() => {
    if (focusRequest.current === null) return
    const el = lastInputRef.current
    if (el) {
      el.focus()
      el.select()
      focusRequest.current = null
    }
  })

  const normalized: FieldOption[] = options.map(normalizeOption)

  const addOption = () => {
    const text = draft.trim()
    // Sem texto digitado: cria uma opção padrão distinta (Opção 2, 3, …),
    // garantindo que cliques repetidos não recriem o mesmo valor.
    let label = text
    if (!label) {
      const base = 'Opção'
      const existing = new Set(normalized.map((o) => o.label.trim().toLowerCase()))
      let n = normalized.length + 1
      while (existing.has(`${base} ${n}`.toLowerCase())) n += 1
      label = `${base} ${n}`
    }
    // Bloqueia duplicatas (case-insensitive) — feedback via limpeza do draft.
    if (normalized.some((o) => o.label.trim().toLowerCase() === label.toLowerCase())) {
      setDraft('')
      return
    }
    focusRequest.current = normalized.length
    onChange([...normalized, { label, weight: null, required_complements: [], active: true }])
    setDraft('')
  }

  const updateOption = (index: number, patch: Partial<FieldOption>) => {
    // Sempre um array novo — nunca muta a entrada anterior.
    onChange(normalized.map((o, i) => (i === index ? { ...o, ...patch } : o)))
  }

  /**
   * Em modo seguro, opção antiga NUNCA é excluída: é apenas inativada
   * (active=false, permanece no JSON para preservar respostas antigas).
   * No modo livre, remove de fato (não há respostas a preservar).
   */
  const toggleOptionActive = (index: number, active: boolean) => {
    updateOption(index, { active })
  }

  /** Modo livre: exclusão real da opção. */
  const deactivateOption = (index: number) => {
    onChange(normalized.filter((_, i) => i !== index))
  }

  const moveOption = (index: number, dir: -1 | 1) => {
    const to = index + dir
    if (to < 0 || to >= normalized.length) return
    const next = [...normalized]
    const [item] = next.splice(index, 1)
    next.splice(to, 0, item)
    onChange(next)
  }

  return (
    <div className="space-y-1">
      <Label>Opções da Lista Suspensa</Label>
      {normalized.length === 0 && (
        <p className="rounded-md border border-dashed border-slate-800 px-3 py-2 text-xs text-slate-500">
          Nenhuma opção ainda. Adicione ao menos uma.
        </p>
      )}
      <div className="space-y-1.5">
        {normalized.map((opt, index) => (
          <div
            key={index}
            className={`rounded-md border border-slate-800 bg-slate-950/50 px-2 py-2 ${
              opt.active === false ? 'opacity-50' : ''
            }`}
          >
            <div className="flex items-center gap-1">
              <span className="w-5 shrink-0 text-right text-xs text-slate-500">{index + 1}.</span>
              <Input
                ref={(el) => {
                  if (focusRequest.current === index) lastInputRef.current = el
                }}
                value={opt.label}
                disabled={opt.active === false}
                onChange={(e) => updateOption(index, { label: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addOption()
                  }
                }}
                onFocus={(e) => e.target.select()}
                placeholder={`Opção ${index + 1}`}
                className="h-8 bg-slate-950 border-slate-800 text-slate-100 text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-slate-500 hover:text-slate-200"
                title="Mover opção para cima"
                disabled={index === 0}
                onClick={() => moveOption(index, -1)}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-slate-500 hover:text-slate-200"
                title="Mover opção para baixo"
                disabled={index === normalized.length - 1}
                onClick={() => moveOption(index, 1)}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-red-400 hover:text-red-300 hover:bg-red-950/40"
                title={safeMode ? 'Inativar opção' : 'Remover opção'}
                disabled={safeMode ? opt.active === false : normalized.length <= 1}
                onClick={() =>
                  safeMode ? toggleOptionActive(index, false) : deactivateOption(index)
                }
              >
                {safeMode ? (
                  <Archive className="h-3.5 w-3.5" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
              {safeMode && opt.active === false && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40"
                  title="Reativar opção"
                  onClick={() => toggleOptionActive(index, true)}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              )}
              {opt.active === false && (
                <span className="ml-1 text-[10px] font-medium uppercase tracking-wide text-amber-400">
                  Inativada
                </span>
              )}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 pl-6">
              <Input
                type="number"
                value={opt.weight ?? ''}
                onChange={(e) =>
                  updateOption(index, {
                    weight: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                onFocus={(e) => e.target.select()}
                placeholder="Peso (opcional)"
                title="Peso numérico da opção — vazio = Não se aplica"
                className="h-7 w-28 bg-slate-950 border-slate-800 text-slate-100 text-xs"
              />
              <span className="text-[10px] text-slate-500">Não se aplica</span>
              <div className="ml-auto flex items-center gap-0.5">
                {COMPLEMENT_TOGGLES.map(({ value, label, icon: Icon, activeCls }) => {
                  const active = opt.required_complements.includes(value)
                  return (
                    <Button
                      key={value}
                      type="button"
                      variant="outline"
                      size="icon"
                      title={label}
                      aria-pressed={active}
                      className={`h-7 w-7 ${
                        active
                          ? activeCls
                          : 'border-slate-800 bg-slate-950 text-slate-500 hover:text-slate-200'
                      }`}
                      onClick={() =>
                        updateOption(index, {
                          required_complements: active
                            ? opt.required_complements.filter((c) => c !== value)
                            : [...opt.required_complements, value],
                        })
                      }
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </Button>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-1.5">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addOption()
            }
          }}
          placeholder="Nova opção…"
          className="h-8 bg-slate-950 border-slate-800 text-slate-100 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 border-blue-900/60 bg-blue-950/30 text-blue-200 hover:bg-blue-950/60"
          onClick={addOption}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar opção
        </Button>
      </div>
    </div>
  )
}
