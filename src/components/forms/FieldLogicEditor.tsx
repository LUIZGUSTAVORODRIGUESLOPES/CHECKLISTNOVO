import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Zap } from 'lucide-react'
import {
  LOGIC_OPERATORS,
  type LogicOperator,
  type LogicRule,
  type TemplateBlock,
  type TemplateField,
} from '@/types/template'
import { flattenFields } from '@/lib/calculation'

export interface FieldLogicEditorProps {
  field: TemplateField
  /** Todos os blocos do template (para listar campos de origem das regras). */
  blocks: TemplateBlock[]
  /** Id do campo em edição (excluído da lista de origens). */
  selfFieldId: string
  onChange: (fn: (field: TemplateField) => void) => void
}

const newId = () => `trg_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

/**
 * Seção "Gatilhos & Lógica" do painel de propriedades: switch 'Sempre
 * Visível' (alwaysVisible, padrão true) + regras de visibilidade (todas
 * devem ser verdadeiras — AND). Ao criar a primeira regra, 'Sempre Visível'
 * muda automaticamente para false.
 */
export function FieldLogicEditor({ field, blocks, selfFieldId, onChange }: FieldLogicEditorProps) {
  const alwaysVisible = field.alwaysVisible !== false
  const rules = field.triggers ?? []

  const labelOf = (fieldId: string) => {
    for (const block of blocks) {
      const f = block.fields.find((x) => x.id === fieldId)
      if (f) return f.label || 'Campo sem rótulo'
    }
    return 'Campo removido'
  }

  const setAlwaysVisible = (v: boolean) => {
    onChange((f) => {
      f.alwaysVisible = v
    })
  }

  const addRule = () => {
    onChange((f) => {
      // Primeira regra desliga 'Sempre Visível' automaticamente.
      f.alwaysVisible = false
      f.triggers = [
        ...(f.triggers ?? []),
        { id: newId(), sourceFieldId: '', operator: '==', value: '' },
      ]
    })
  }

  const updateRule = (ruleId: string, fn: (rule: LogicRule) => void) => {
    onChange((f) => {
      f.triggers = (f.triggers ?? []).map((r) => {
        if (r.id !== ruleId) return r
        const next = { ...r }
        fn(next)
        return next
      })
    })
  }

  const removeRule = (ruleId: string) => {
    onChange((f) => {
      const remaining = (f.triggers ?? []).filter((r) => r.id !== ruleId)
      f.triggers = remaining
      // Sem regras restantes, o campo volta a ser sempre visível.
      if (remaining.length === 0) f.alwaysVisible = true
    })
  }

  return (
    <div className="space-y-2 border-t border-slate-800 pt-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <Zap className="h-4 w-4 text-amber-400" /> Gatilhos &amp; Lógica
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="prop-always-visible"
          checked={alwaysVisible}
          onCheckedChange={setAlwaysVisible}
        />
        <Label htmlFor="prop-always-visible" className="cursor-pointer font-normal">
          Sempre Visível
        </Label>
      </div>

      <div className="space-y-2">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="space-y-1.5 rounded-md border border-slate-800 bg-slate-950/50 p-2.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Regra de visibilidade
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-red-400 hover:bg-red-950/40 hover:text-red-300"
                title="Remover regra"
                onClick={() => removeRule(rule.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-400">Campo de origem</Label>
              <Select
                value={rule.sourceFieldId || undefined}
                onValueChange={(v) => updateRule(rule.id, (r) => (r.sourceFieldId = v))}
              >
                <SelectTrigger className="h-8 w-full bg-slate-950 text-xs">
                  <SelectValue placeholder="Selecione o campo" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                  {flattenFields(blocks)
                    .filter(({ field: f }) => f.id !== selfFieldId)
                    .map(({ field: f }) => (
                      <SelectItem key={f.id} value={f.id} className="text-xs">
                        {f.label || 'Campo sem rótulo'}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <div className="w-40 space-y-1">
                <Label className="text-[11px] text-slate-400">Operador</Label>
                <Select
                  value={rule.operator}
                  onValueChange={(v) =>
                    updateRule(rule.id, (r) => (r.operator = v as LogicOperator))
                  }
                >
                  <SelectTrigger className="h-8 w-full bg-slate-950 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                    {LOGIC_OPERATORS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-[11px] text-slate-400">Valor de comparação</Label>
                <Input
                  value={rule.value}
                  onChange={(e) => updateRule(rule.id, (r) => (r.value = e.target.value))}
                  placeholder="Ex.: 10 ou Aprovado"
                  className="h-8 bg-slate-950 border-slate-800 text-xs text-slate-100"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Origem: <span className="text-slate-400">{labelOf(rule.sourceFieldId)}</span> — todas
              as regras devem ser verdadeiras para o campo aparecer.
            </p>
          </div>
        ))}
      </div>

      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={addRule}
        className="w-full gap-1 border-slate-700 bg-slate-950 text-xs text-slate-200 hover:bg-slate-800"
      >
        <Plus className="h-3.5 w-3.5" /> Adicionar regra de visibilidade
      </Button>
      <p className="text-[11px] text-slate-500">
        Com “Sempre Visível” desligado, o campo fica oculto até as regras serem atendidas (campo de
        origem vazio = oculto).
      </p>
    </div>
  )
}
