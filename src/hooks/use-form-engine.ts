import { useMemo } from 'react'
import { flattenFields, evaluateCalculation, type CalculationResult } from '@/lib/calculation'
import { evaluateFieldVisibility } from '@/lib/logic'
import type { FormulaTerm, TemplateBlock } from '@/types/template'

/**
 * Motores do Preview/Executor: cálculo (campo calculation read-only,
 * recalculado em tempo real) e gatilhos (visibilidade conditiva por regras
 * AND). Funções puras de src/lib/calculation.ts e src/lib/logic.ts — nada
 * é salvo e templates antigos sem triggers/formula ficam visíveis/padrão.
 */

/** Visibilidade por chave (blockId:fieldId) — motor de gatilhos. */
export function useFormVisibility(blocks: TemplateBlock[], values: Record<string, unknown>) {
  return useMemo(() => evaluateFieldVisibility(blocks, values), [blocks, values])
}

/** Resultado do cálculo por fieldId — motor da calculadora. */
export function useFormCalculations(
  blocks: TemplateBlock[],
  values: Record<string, unknown>,
): Map<string, CalculationResult> {
  return useMemo(() => {
    const map = new Map<string, CalculationResult>()
    for (const b of blocks) {
      for (const f of b.fields) {
        if (f.archived || f.type !== 'calculation') continue
        map.set(f.id, evaluateCalculation(f.formula, valuesByFieldId(blocks, values)))
      }
    }
    return map
  }, [blocks, values])
}

/** Valores indexados por fieldId (a fórmula referencia campos por id). */
function valuesByFieldId(
  blocks: TemplateBlock[],
  values: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const { field, key } of flattenFields(blocks)) {
    out[field.id] = values[key]
  }
  return out
}

/** Fórmula de um campo calculation (helper para o preview). */
export const formulaOf = (field: { formula?: FormulaTerm[] }) => field.formula
