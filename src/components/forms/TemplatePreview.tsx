import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Eye, Info } from 'lucide-react'
import { UNIT_CATEGORIES, type TemplateBlock } from '@/types/template'
import { ComplementsRow, PreviewInput, type PreviewValues } from '@/components/forms/PreviewInput'

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
}

/** Diálogo amplo que exibe o formulário como o operador o verá na execução. */
export function TemplatePreview({ open, onOpenChange, header, blocks }: TemplatePreviewProps) {
  const [values, setValues] = useState<PreviewValues>({})
  const setValue = (key: string, value: PreviewValues[string]) =>
    setValues((prev) => ({ ...prev, [key]: value }))

  const activeBlocks = useMemo(
    () => blocks.filter((b) => b.fields.some((f) => !f.archived)),
    [blocks],
  )
  const totalFields = activeBlocks.reduce(
    (acc, b) => acc + b.fields.filter((f) => !f.archived).length,
    0,
  )

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
              Modo de visualização. As interações aqui não salvam dados nem validam campos
              obrigatórios.
            </span>
          </div>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {activeBlocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 bg-slate-900/30 p-10 text-center text-slate-400">
              <Eye className="mb-3 h-10 w-10" />
              <p className="text-sm">
                Nenhum bloco/campo ativo para visualizar. Monte o formulário primeiro.
              </p>
            </div>
          ) : (
            activeBlocks.map((block) => (
              <PreviewBlock key={block.id} block={block} values={values} onValue={setValue} />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function PreviewBlock({
  block,
  values,
  onValue,
}: {
  block: TemplateBlock
  values: PreviewValues
  onValue: (key: string, value: PreviewValues[string]) => void
}) {
  const activeFields = block.fields.filter((f) => !f.archived)
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
            const value = values[fieldKey] ?? null
            const fieldUnit = field.type === 'number' ? unitLabel(field.unit) : undefined
            return (
              <div
                key={field.id}
                className={`space-y-1.5 rounded-md border border-slate-800 bg-slate-950/40 p-3 ${
                  field.type === 'evaluative' ? 'md:col-span-2 xl:col-span-3' : ''
                }`}
              >
                <Label className="text-xs text-slate-300">
                  {field.label || 'Campo sem rótulo'}
                  {field.required && <span className="ml-1 font-semibold text-red-400">*</span>}
                </Label>
                {field.instructions ? (
                  <p className="text-[11px] text-slate-500">{field.instructions}</p>
                ) : null}
                <PreviewInput
                  field={field}
                  value={value}
                  fieldUnit={fieldUnit}
                  onValue={(v) => onValue(fieldKey, v)}
                />
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
