import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Eye, Info, ShieldAlert } from 'lucide-react'
import { UNIT_CATEGORIES, type TemplateBlock } from '@/types/template'
import { ComplementsRow, PreviewInput, type PreviewValues } from '@/components/forms/PreviewInput'
import type { EntityDefinitionWithEntries } from '@/services/masterData'
import {
  findInvalidRegistryFields,
  requiredFieldKey,
  type InvalidRegistryEntry,
} from '@/lib/formValidation'
import { toast } from '@/hooks/use-toast'
import { useFormCalculations, useFormVisibility } from '@/hooks/use-form-engine'
import type { CalculationResult } from '@/lib/calculation'

export interface PreviewHeaderInfo {
  name: string
  description: string
  departmentName: string
  subjectName: string
}

export interface TemplatePreviewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  header: PreviewHeaderInfo
  blocks: TemplateBlock[]
  /** Entidades ativas dos cadastros mestres com itens ativos (campo master_data). */
  masterEntities?: EntityDefinitionWithEntries[]
}

/** Diálogo amplo que exibe o formulário como o operador o verá na execução. */
export function TemplatePreview({
  open,
  onOpenChange,
  header,
  blocks,
  masterEntities,
}: TemplatePreviewProps) {
  const [values, setValues] = useState<PreviewValues>({})
  const [invalidList, setInvalidList] = useState<InvalidRegistryEntry[]>([])
  const setValue = (key: string, value: PreviewValues[string]) =>
    setValues((prev) => ({ ...prev, [key]: value }))

  /**
   * Checagem geral antes de salvar: máscaras registry inválidas + campos
   * obrigatórios vazios/incompletos. Bloqueia a submissão com toast e marca
   * visualmente (borda vermelha) cada campo com problema.
   */
  const checkBeforeSubmit = () => {
    const invalid = findInvalidRegistryFields(blocks, values, requiredFieldKey)
    if (invalid.length > 0) {
      setInvalidList(invalid)
      const missing = invalid.filter((e) => e.missing).length
      toast({
        title: 'Não foi possível salvar',
        description:
          missing > 0
            ? `${invalid.length} campo(s) pendente(s): ${missing} obrigatório(s) não preenchido(s). Corrija os campos destacados.`
            : `Há ${invalid.length} campo(s) com formato inválido. Corrija os campos destacados.`,
        variant: 'destructive',
      })
      return
    }
    setInvalidList([])
    toast({ title: 'Tudo certo', description: 'Formulário válido para envio.' })
  }

  /** Chaves (blockId:fieldId) com erro — usadas para destacar os inputs. */
  const invalidKeys = useMemo(() => {
    const map = new Map<string, string>()
    for (const e of invalidList) {
      const entry = blocks
        .flatMap((b) => b.fields.map((f) => ({ b, f })))
        .find(
          ({ b, f }) =>
            b.title === e.blockTitle && (f.label || 'Campo sem rótulo') === e.fieldLabel,
        )
      if (entry) map.set(`${entry.b.id}:${entry.f.id}`, e.message)
    }
    return map
  }, [invalidList, blocks])

  const activeBlocks = useMemo(
    () => blocks.filter((b) => b.fields.some((f) => !f.archived)),
    [blocks],
  )
  const totalFields = activeBlocks.reduce(
    (acc, b) => acc + b.fields.filter((f) => !f.archived).length,
    0,
  )

  // Motor de gatilhos: visibilidade por chave (blockId:fieldId), recalculada
  // em tempo real a cada digitação. Templates antigos sem triggers: tudo visível.
  const visibility = useFormVisibility(blocks, values)

  // Resultados de cálculo dos campos calculation (memoizados, recalculam a
  // cada digitação — o campo é read-only e mostra o valor instantaneamente).
  const calcResults = useFormCalculations(blocks, values)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden bg-slate-950 text-slate-200 sm:max-w-5xl">
        <DialogHeader className="shrink-0 border-b border-slate-800 pb-3 pr-8">
          <DialogTitle className="flex items-center gap-2 text-lg text-white">
            <Eye className="h-5 w-5 text-blue-400" /> Pré-visualização: {header.name || 'Sem nome'}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-400">
            {header.description || 'Sem descrição'}
          </DialogDescription>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {header.departmentName ? (
              <Badge variant="outline" className="border-slate-700 text-[10px] text-slate-300">
                {header.departmentName}
              </Badge>
            ) : null}
            {header.subjectName ? (
              <Badge variant="outline" className="border-slate-700 text-[10px] text-slate-300">
                {header.subjectName}
              </Badge>
            ) : null}
            <Badge variant="outline" className="border-slate-700 text-[10px] text-slate-300">
              {totalFields} campo{totalFields === 1 ? '' : 's'} ativo
              {totalFields === 1 ? '' : 's'}
            </Badge>
          </div>
          <div className="mt-1 flex items-start gap-2 rounded-md border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <span>
              Modo de visualização: nada é salvo. A checagem abaixo valida máscaras e campos
              obrigatórios antes de “salvar”.
            </span>
          </div>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {invalidList.length > 0 && (
            <div className="rounded-md border border-red-900/60 bg-red-950/30 px-3 py-2 text-xs text-red-200">
              <p className="mb-1 flex items-center gap-1.5 font-semibold">
                <ShieldAlert className="h-3.5 w-3.5" /> Corrija antes de salvar:
              </p>
              <ul className="list-disc pl-4">
                {invalidList.map((e, i) => (
                  <li key={i}>
                    {e.blockTitle} → {e.fieldLabel}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {activeBlocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 bg-slate-900/30 p-10 text-center text-slate-400">
              <Eye className="mb-3 h-10 w-10" />
              <p className="text-sm">
                Nenhum bloco/campo ativo para visualizar. Monte o formulário primeiro.
              </p>
            </div>
          ) : (
            activeBlocks.map((block) => (
              <PreviewBlock
                key={block.id}
                block={block}
                values={values}
                onValue={setValue}
                invalidKeys={invalidKeys}
                visibility={visibility}
                calcResults={calcResults}
                masterEntities={masterEntities}
              />
            ))
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-800 pt-3">
          <p className="text-[11px] text-slate-500">
            Checagem geral antes de salvar (máscaras + obrigatoriedade).
          </p>
          <Button type="button" size="sm" onClick={checkBeforeSubmit}>
            <ShieldAlert className="mr-2 h-4 w-4" /> Verificar e Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function PreviewBlock({
  block,
  values,
  onValue,
  invalidKeys,
  visibility,
  calcResults,
  masterEntities,
}: {
  block: TemplateBlock
  values: PreviewValues
  onValue: (key: string, value: PreviewValues[string]) => void
  /** Chaves (blockId:fieldId) com erro após a checagem de submissão. */
  invalidKeys: Map<string, string>
  /** Visibilidade por chave (blockId:fieldId) — motor de gatilhos. */
  visibility: Record<string, boolean>
  /** Resultado do cálculo por fieldId (campos calculation). */
  calcResults: Map<string, CalculationResult>
  /** Entidades ativas dos cadastros mestres (campo master_data). */
  masterEntities?: EntityDefinitionWithEntries[]
}) {
  // Campos ativos E visíveis conforme os gatilhos (motor de lógica reativa).
  const activeFields = block.fields.filter(
    (f) => !f.archived && visibility[`${block.id}:${f.id}`] !== false,
  )
  if (activeFields.length === 0) return null
  const key = (fieldId: string) => `${block.id}:${fieldId}`
  const unitLabel = (unit: string | undefined) =>
    UNIT_CATEGORIES.flatMap((c) => c.units).find((u) => u.value === unit)?.label ?? unit

  return (
    <Card className="border-slate-800 bg-slate-900/50 text-slate-200">
      <CardContent className="space-y-4 p-4">
        <div>
          <h3 className="text-sm font-semibold text-white">{block.title}</h3>
          {block.instructions ? (
            <p className="mt-0.5 text-xs text-slate-400">{block.instructions}</p>
          ) : null}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {activeFields.map((field) => {
            const fieldKey = key(field.id)
            const fieldUnit = field.type === 'number' ? unitLabel(field.unit) : undefined
            const errorMessage = invalidKeys.get(fieldKey)
            // Campo calculation: read-only, recalculado em tempo real pelo motor.
            const calc = field.type === 'calculation' ? calcResults.get(field.id) : undefined
            return (
              <div
                key={field.id}
                className={`space-y-1.5 rounded-md border p-3 ${
                  errorMessage
                    ? 'border-red-500/70 bg-red-950/20'
                    : 'border-slate-800 bg-slate-950/40'
                } ${
                  field.type === 'evaluative' ||
                  field.type === 'photo' ||
                  field.type === 'signature'
                    ? 'md:col-span-2 xl:col-span-3'
                    : ''
                }`}
              >
                <Label className="text-xs text-slate-300">
                  {field.label || 'Campo sem rótulo'}
                  {field.required && <span className="ml-1 font-semibold text-red-400">*</span>}
                </Label>
                {field.instructions ? (
                  <p className="text-[11px] text-slate-500">{field.instructions}</p>
                ) : null}
                {field.type === 'calculation' ? (
                  <div className="space-y-1">
                    <div
                      className={`flex h-9 items-center rounded-md border border-slate-700 bg-slate-900/70 px-3 text-sm font-medium ${
                        calc && calc.state === 'ok' ? 'text-emerald-300' : 'text-slate-400'
                      }`}
                    >
                      {calc?.display ?? '--'}
                    </div>
                    {calc && calc.message && (
                      <p className="text-[11px] text-amber-400/90">{calc.message}</p>
                    )}
                  </div>
                ) : (
                  <PreviewInput
                    field={field}
                    value={values[fieldKey] ?? null}
                    fieldUnit={fieldUnit}
                    invalid={!!errorMessage}
                    onValue={(v) => onValue(fieldKey, v)}
                    masterEntities={masterEntities}
                  />
                )}
                {errorMessage && (
                  <p className="text-[11px] font-medium text-red-400">{errorMessage}</p>
                )}
                <ComplementsRow
                  complements={field.complements ?? []}
                  fieldKey={fieldKey}
                  values={values}
                  onValue={onValue}
                />
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
