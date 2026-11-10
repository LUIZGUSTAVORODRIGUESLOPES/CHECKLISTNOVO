import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'

interface FieldOptionsEditorProps {
  options: string[]
  onChange: (options: string[]) => void
}

/**
 * Editor de "Opções da Lista Suspensa" de campos select/multiselect.
 * Trabalha sempre com arrays novos (imutabilidade) — cada clique em
 * "Adicionar opção" cria UMA opção distinta, e editar o texto de uma
 * opção não afeta as demais. A lista é o array `options` do campo,
 * persistido no JSON blocks do template.
 */
export function FieldOptionsEditor({ options, onChange }: FieldOptionsEditorProps) {
  // Texto em digitação da opção recém-criada: mantido localmente para que
  // cada nova opção comece com um placeholder distinto e editável.
  const [draft, setDraft] = useState('')

  const addOption = () => {
    const text = draft.trim()
    if (!text) {
      // Sem texto digitado: cria uma opção padrão distinta (Opção 2, 3, …),
      // garantindo que cliques repetidos não recriem o mesmo valor.
      const base = 'Opção'
      const existing = new Set(options.map((o) => o.trim().toLowerCase()))
      let n = options.length + 1
      while (existing.has(`${base} ${n}`.toLowerCase())) n += 1
      onChange([...options, `${base} ${n}`])
      return
    }
    // Bloqueia duplicatas exatas (case-insensitive) — feedback via seleção.
    if (options.some((o) => o.trim().toLowerCase() === text.toLowerCase())) {
      setDraft('')
      return
    }
    onChange([...options, text])
    setDraft('')
  }

  const renameOption = (index: number, value: string) => {
    // Sempre um array novo — nunca muta a entrada anterior.
    const next = options.map((o, i) => (i === index ? value : o))
    onChange(next)
  }

  const removeOption = (index: number) => {
    onChange(options.filter((_, i) => i !== index))
  }

  const moveOption = (index: number, dir: -1 | 1) => {
    const to = index + dir
    if (to < 0 || to >= options.length) return
    const next = [...options]
    const [item] = next.splice(index, 1)
    next.splice(to, 0, item)
    onChange(next)
  }

  return (
    <div className="space-y-1">
      <Label>Opções da Lista Suspensa</Label>
      {options.length === 0 && (
        <p className="rounded-md border border-dashed border-slate-800 px-3 py-2 text-xs text-slate-500">
          Nenhuma opção ainda. Adicione ao menos uma.
        </p>
      )}
      <div className="space-y-1.5">
        {options.map((opt, index) => (
          <div key={index} className="flex items-center gap-1">
            <span className="w-5 shrink-0 text-right text-xs text-slate-500">{index + 1}.</span>
            <Input
              value={opt}
              onChange={(e) => renameOption(index, e.target.value)}
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
              disabled={index === options.length - 1}
              onClick={() => moveOption(index, 1)}
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-red-400 hover:text-red-300 hover:bg-red-950/40"
              title="Remover opção"
              disabled={options.length <= 1}
              onClick={() => removeOption(index)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
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
