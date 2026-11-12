import {
  DATE_FORMATS,
  FIELD_COMPLEMENTS,
  REGISTRY_MASKS,
  UNIT_CATEGORIES,
  normalizeOption,
  type DateFormat,
  type FieldComplement,
  type NumberPattern,
  type TemplateField,
} from '@/types/template'
import type { EntityDefinitionWithEntries } from '@/services/masterData'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CheckCircle2,
  Circle,
  Frown,
  Laugh,
  Meh,
  Smile,
  ThumbsDown,
  ThumbsUp,
  Timer,
  XCircle,
} from 'lucide-react'
import { RegistryInput } from '@/components/forms/RegistryInput'
import {
  GpsInput,
  MasterDataInput,
  PhotoInput,
  SignatureInput,
} from '@/components/forms/EvidenceInputs'

/** Valor do campo gps no JSON de respostas (coordenadas reais do dispositivo). */
export interface GpsValue {
  latitude: number
  longitude: number
  accuracy: number
  capturedAt: string
}

/** Valor do campo photo no JSON de respostas (metadata do arquivo local). */
export interface PhotoValue {
  fileName: string
  size: number
  mimeType: string
  /** Object URL da miniatura local — usado apenas na sessão de preenchimento. */
  _localUrl?: string
}

/** Valor do campo signature no JSON de respostas. */
export interface SignatureValue {
  strokes: number
  signedAt: string
}

export type EvidenceValue = GpsValue | PhotoValue | SignatureValue

export type PreviewValues = Record<string, string | string[] | number | null | EvidenceValue>

const smileyOptions: { value: number; label: string; icon: typeof Frown; className: string }[] = [
  { value: 1, label: 'Muito Insatisfeito', icon: Frown, className: 'text-red-400' },
  { value: 2, label: 'Insatisfeito', icon: Meh, className: 'text-orange-400' },
  { value: 3, label: 'Neutro', icon: Meh, className: 'text-yellow-400' },
  { value: 4, label: 'Satisfeito', icon: Smile, className: 'text-lime-400' },
  { value: 5, label: 'Muito Satisfeito', icon: Laugh, className: 'text-green-400' },
]

const conformityOptions = [
  { value: 'conforme', label: 'Conforme', icon: CheckCircle2, className: 'text-green-400' },
  { value: 'nao_conforme', label: 'Não Conforme', icon: XCircle, className: 'text-red-400' },
  { value: 'na', label: 'Não se Aplica', icon: Circle, className: 'text-slate-500' },
]

const dateInputType: Record<DateFormat, 'time' | 'date' | 'month'> = {
  time24: 'time',
  time24s: 'time',
  time12: 'time',
  time12s: 'time',
  date_ddmmyyyy: 'date',
  date_mmyyyy: 'month',
}

function numberPlaceholder(pattern: NumberPattern) {
  switch (pattern) {
    case 'decimal':
      return '0,00'
    case 'currency':
      return 'R$ 0,00'
    case 'percentage':
      return '0,0%'
    default:
      return '0'
  }
}

export function ComplementsRow({
  complements,
  fieldKey,
  values,
  onValue,
}: {
  complements: FieldComplement[]
  fieldKey: string
  values: PreviewValues
  onValue: (key: string, value: PreviewValues[string]) => void
}) {
  if (complements.length === 0) return null
  return (
    <div className="space-y-2 border-t border-slate-800/70 pt-2">
      {complements.map((c) => {
        const cKey = `${fieldKey}:c:${c}`
        const cValue = (values[cKey] as string) ?? ''
        return (
          <div key={c} className="space-y-1">
            <Label className="text-[11px] font-medium text-slate-400">
              {FIELD_COMPLEMENTS.find((f) => f.value === c)?.label ?? c}
            </Label>
            {c === 'attachment' ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 w-full justify-start gap-2 border-slate-700 bg-slate-900/60 text-xs text-slate-300 hover:bg-slate-800"
              >
                <Circle className="h-3 w-3" /> Anexar arquivo
              </Button>
            ) : (
              <Textarea
                rows={2}
                value={cValue}
                onChange={(e) => onValue(cKey, e.target.value)}
                placeholder={
                  c === 'comment'
                    ? 'Observação (opcional)'
                    : c === 'action_plan'
                      ? 'Plano de ação (opcional)'
                      : 'Ação (opcional)'
                }
                className="min-h-[56px] border-slate-800 bg-slate-950/60 text-xs text-slate-200 placeholder:text-slate-600"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export function PreviewInput({
  field,
  value,
  fieldUnit,
  invalid,
  onValue,
  masterEntities,
}: {
  field: TemplateField
  value: PreviewValues[string] | null
  fieldUnit?: string
  /** true quando a checagem de submissão marcou o campo com erro. */
  invalid?: boolean
  onValue: (value: PreviewValues[string]) => void
  /** Entidades ativas dos cadastros mestres (campo master_data). */
  masterEntities?: EntityDefinitionWithEntries[]
}) {
  const inputClass = invalid
    ? 'border-red-500/80 bg-slate-950/60 text-sm text-slate-100 placeholder:text-slate-600 focus-visible:ring-red-500/40'
    : 'border-slate-800 bg-slate-950/60 text-sm text-slate-100 placeholder:text-slate-600'
  const activeOptions = (field.options ?? []).map(normalizeOption).filter((o) => o.active !== false)
  const selected: string[] = Array.isArray(value) ? value : []
  const toggleMulti = (optLabel: string) => {
    onValue(
      selected.includes(optLabel)
        ? selected.filter((v) => v !== optLabel)
        : [...selected, optLabel],
    )
  }

  switch (field.type) {
    case 'text':
      return (
        <Input
          value={(value as string) ?? ''}
          onChange={(e) => onValue(e.target.value)}
          placeholder={field.instructions || 'Digite aqui…'}
          className={inputClass}
        />
      )

    case 'number':
      return (
        <div className="flex items-center gap-2">
          {field.number_pattern === 'currency' && (
            <span className="text-sm font-medium text-slate-400">R$</span>
          )}
          <Input
            type="number"
            value={(value as number | null) ?? ''}
            onChange={(e) => onValue(e.target.value === '' ? null : Number(e.target.value))}
            placeholder={numberPlaceholder(field.number_pattern ?? 'quantity')}
            className={inputClass}
          />
          {fieldUnit ? <span className="text-xs text-slate-500">{fieldUnit}</span> : null}
          {field.number_pattern === 'percentage' && (
            <span className="text-sm font-medium text-slate-400">%</span>
          )}
        </div>
      )

    case 'date': {
      const fmt = field.date_format ?? 'date_ddmmyyyy'
      const fmtLabel = DATE_FORMATS.find((f) => f.value === fmt)?.label ?? fmt
      return (
        <div className="space-y-1">
          <Input
            type={dateInputType[fmt]}
            value={(value as string) ?? ''}
            onChange={(e) => onValue(e.target.value)}
            className={inputClass}
          />
          <p className="text-[11px] text-slate-500">Formato configurado: {fmtLabel}</p>
        </div>
      )
    }

    case 'select':
      return (
        <Select value={(value as string) ?? undefined} onValueChange={(v) => onValue(v)}>
          <SelectTrigger className={`w-full ${inputClass}`}>
            <SelectValue placeholder="Selecione uma opção" />
          </SelectTrigger>
          <SelectContent className="border-slate-800 bg-slate-900 text-slate-100">
            {activeOptions.map((o) => (
              <SelectItem key={o.label} value={o.label}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )

    case 'multiselect': {
      const allSelected = selected.length === activeOptions.length && activeOptions.length > 0
      return (
        <div className="space-y-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onValue(allSelected ? [] : activeOptions.map((o) => o.label))}
            className="h-7 justify-start gap-2 border-slate-700 bg-slate-950/60 text-xs text-slate-300 hover:bg-slate-800"
          >
            <Timer className="h-3 w-3" />
            {allSelected ? 'Limpar seleção' : 'Selecionar todas as opções'}
          </Button>
          <div className="rounded-md border border-slate-800 bg-slate-950/50 p-2">
            {activeOptions.length === 0 ? (
              <p className="text-xs text-slate-500">Nenhuma opção configurada.</p>
            ) : (
              activeOptions.map((o) => {
                const isSel = selected.includes(o.label)
                return (
                  <label
                    key={o.label}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-slate-200 hover:bg-slate-900"
                  >
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => toggleMulti(o.label)}
                      className="h-3.5 w-3.5 accent-blue-500"
                    />
                    {o.label}
                  </label>
                )
              })
            )}
          </div>
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {selected.map((s) => (
                <Badge key={s} variant="secondary" className="text-[10px]">
                  {s}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )
    }

    case 'registry': {
      const mask = field.registry_mask ?? 'email'
      return (
        <div className="space-y-1">
          <RegistryInput
            mask={mask}
            value={(value as string) ?? ''}
            onChange={(masked) => onValue(masked)}
            className={inputClass}
            forceError={invalid}
          />
          <p className="text-[11px] text-slate-500">
            Máscara: {REGISTRY_MASKS.find((m) => m.value === mask)?.label ?? mask}
          </p>
        </div>
      )
    }

    case 'evaluative': {
      const scale = field.evaluative_scale ?? 'smiley'
      if (scale === 'smiley') {
        return (
          <div className="flex flex-wrap items-center justify-between gap-2">
            {smileyOptions.map((opt) => {
              const Icon = opt.icon
              const isSel = value === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  title={opt.label}
                  aria-pressed={isSel}
                  onClick={() => onValue(isSel ? null : opt.value)}
                  className={`flex flex-col items-center gap-1 rounded-lg border px-3 py-2 transition-colors ${
                    isSel
                      ? 'border-blue-500 bg-blue-950/40'
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-600'
                  }`}
                >
                  <Icon className={`h-6 w-6 ${opt.className}`} />
                  <span className="text-[10px] text-slate-400">{opt.label}</span>
                </button>
              )
            })}
          </div>
        )
      }
      if (scale === 'conformity') {
        return (
          <div className="flex flex-wrap items-center gap-2">
            {conformityOptions.map((opt) => {
              const Icon = opt.icon
              const isSel = value === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={isSel}
                  onClick={() => onValue(isSel ? null : opt.value)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    isSel
                      ? 'border-blue-500 bg-blue-950/40 text-blue-100'
                      : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isSel ? '' : opt.className}`} />
                  {opt.label}
                </button>
              )
            })}
          </div>
        )
      }
      // yes_no
      const ynWeight = field.yes_no_weights
      return (
        <div className="flex flex-wrap items-center gap-2">
          {(['yes', 'no'] as const).map((side) => {
            const isSel = value === side
            const w = ynWeight?.[side]
            const Icon = side === 'yes' ? ThumbsUp : ThumbsDown
            return (
              <button
                key={side}
                type="button"
                aria-pressed={isSel}
                onClick={() => onValue(isSel ? null : side)}
                className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                  isSel
                    ? 'border-blue-500 bg-blue-950/40 text-blue-100'
                    : side === 'yes'
                      ? 'border-green-900/60 bg-slate-950/40 text-green-300 hover:border-green-600'
                      : 'border-red-900/60 bg-slate-950/40 text-red-300 hover:border-red-600'
                }`}
              >
                <Icon className="h-4 w-4" />
                {side === 'yes' ? 'Sim' : 'Não'}
                {typeof w === 'number' ? (
                  <Badge variant="secondary" className="ml-1 text-[10px]">
                    peso {w}
                  </Badge>
                ) : null}
              </button>
            )
          })}
        </div>
      )
    }

    case 'master_data':
      return (
        <MasterDataInput
          field={field}
          value={value}
          invalid={invalid}
          onValue={onValue}
          entities={masterEntities}
        />
      )

    case 'gps':
      return <GpsInput value={value} invalid={invalid} onValue={onValue} />

    case 'photo':
      return <PhotoInput value={value} invalid={invalid} onValue={onValue} />

    case 'signature':
      return <SignatureInput value={value} invalid={invalid} onValue={onValue} />

    default:
      return null
  }
}
