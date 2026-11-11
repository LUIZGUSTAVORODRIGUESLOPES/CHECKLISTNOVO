import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'
import {
  CALC_OPERATORS,
  type CalcOperator,
  type FormulaTerm,
  type TemplateBlock,
  type TemplateField,
} from '@/types/template'
import { flattenFields } from '@/lib/calculation'

export interface CalculationEditorProps {
  field: TemplateField
  /** Todos os blocos do template (para listar campos numéricos de origem). */
  blocks: TemplateBlock[]
  /** Id do campo em edição (excluído da lista de origens). */
  selfFieldId: string
  onChange: (fn: (field: TemplateField) => void) => void
}

/**
 * Editor da fórmula do campo 'Calculadora / Fórmula': escolha de campos
 * numéricos de origem e operadores (+ - * /), com remoção/limpeza de termos.
 * Persistido no JSON blocks (field.formula).
 */
export function CalculationEditor({
  field,
  blocks,
  selfFieldId,
  onChange,
}: CalculationEditorProps) {
  const formula = field.formula ?? []
  const [nextKind, setNextKind] = useState<'field' | 'op'>('field')

  // Campos numéricos de origem possíveis (number de qualquer bloco, exceto ele mesmo).
  const numericFields = flattenFields(blocks).filter(
    ({ field: f }) => f.type === 'number' && f.id !== selfFieldId,
  )
  const labelOf = (fieldId: string) => {
    for (const block of blocks) {
      const f = block.fields.find((x) => x.id === fieldId)
      if (f) return f.label || 'Campo sem rótulo'
    }
    return 'Campo removido'
  }

  const canAdd = nextKind === 'field' ? numericFields.length > 0 : formula.length > 0

  const addTerm = (term: FormulaTerm) => {
    onChange((f) => {
      f.formula = [...(f.formula ?? []), term]
    })
  }

  const removeTerm = (index: number) => {
    onChange((f) => {
      f.formula = (f.formula ?? []).filter((_, i) => i !== index)
    })
  }

  const clearFormula = () => {
    onChange((f) => {
      f.formula = []
    })
  }

  return (
    <div className="space-y-2 rounded-md border border-slate-800 bg-slate-950/50 p-2.5">
      <div className="text-xs font-medium text-slate-300">Fórmula</div>
      <p className="text-[11px] text-slate-500">
        Monte a expressão com campos numéricos e operadores (+ − × ÷). Valores vazios contam como 0;
        divisão por zero mostra “--”.
      </p>

      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-slate-800 bg-slate-950/60 p-2 min-h-[36px]">
        {formula.length === 0 ? (
          <span className="text-xs text-slate-500">Nenhum termo adicionado.</span>
        ) : (
          formula.map((term, i) =>
            term.kind === 'field' ? (
              <button
                key={`${term.fieldId}-${i}`}
                type="button"
                title="Remover termo"
                onClick={() => removeTerm(i)}
                className="rounded-full border border-blue-500/70 bg-blue-950/50 px-2 py-0.5 text-[11px] text-blue-200 hover:border-red-500 hover:text-red-200"
              >
                {labelOf(term.fieldId ?? '')}
              </button>
            ) : (
              <button
                key={`op-${i}`}
                type="button"
                title="Remover operador"
                onClick={() => removeTerm(i)}
                className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[11px] font-semibold text-slate-200 hover:border-red-500 hover:text-red-200"
              >
                {term.op === '*' ? '×' : term.op === '/' ? '÷' : term.op}
              </button>
            ),
          )
        )}
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <Label className="text-[11px] text-slate-400">
            {nextKind === 'field' ? 'Campo de origem' : 'Operador'}
          </Label>
          {nextKind === 'field' ? (
            <Select
              value=""
              onValueChange={(v) => {
                if (!v) return
                addTerm({ kind: 'field', fieldId: v })
                setNextKind('op')
              }}
            >
              <SelectTrigger className="h-8 w-full bg-slate-950 text-xs">
                <SelectValue placeholder="Selecione um campo numérico" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                {numericFields.map(({ field: f }) => (
                  <SelectItem key={f.id} value={f.id} className="text-xs">
                    {f.label || 'Campo sem rótulo'}
                  </SelectItem>
                ))}
                {numericFields.length === 0 && (
                  <div className="px-3 py-2 text-xs text-slate-500">
                    Nenhum campo Número no formulário.
                  </div>
                )}
              </SelectContent>
            </Select>
          ) : (
            <Select
              value=""
              onValueChange={(v) => {
                if (!v) return
                addTerm({ kind: 'op', op: v as CalcOperator })
                setNextKind('field')
              }}
            >
              <SelectTrigger className="h-8 w-full bg-slate-950 text-xs">
                <SelectValue placeholder="Selecione o operador" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                {CALC_OPERATORS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!canAdd}
          onClick={() => setNextKind((k) => (k === 'field' ? 'op' : 'field'))}
          className="h-8 shrink-0 gap-1 border-slate-700 bg-slate-950 text-xs hover:bg-slate-800"
        >
          <Plus className="h-3.5 w-3.5" /> Alternar
        </Button>
        {formula.length > 0 && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={clearFormula}
            className="h-8 shrink-0 gap-1 border-red-900/60 bg-slate-950 text-xs text-red-300 hover:bg-red-950/40"
          >
            <Trash2 className="h-3.5 w-3.5" /> Limpar
          </Button>
        )}
      </div>
      {formula.length > 0 && (
        <Input
          readOnly
          value={formula
            .map((t) => (t.kind === 'field' ? labelOf(t.fieldId ?? '') : (t.op ?? '')))
            .join(' ')}
          className="h-8 border-dashed border-slate-700 bg-slate-950/60 text-xs text-slate-300"
          aria-label="Expressão montada"
        />
      )}
      {nextKind === 'op' && formula.length > 0 && formula[formula.length - 1].kind === 'field' && (
        <p className="text-[11px] text-slate-500">
          Próximo passo: escolha um operador — ou clique em “Alternar” para encerrar a fórmula.
        </p>
      )}
    </div>
  )
}
