import type { LogicOperator, LogicRule, TemplateBlock, TemplateField } from '@/types/template'

/** Mapa de valores do formulário: blockId:fieldId → valor do campo. */
export type LogicValues = Record<string, unknown>

/** Chave padrão de um campo no mapa de valores (mesma do preview/executor). */
export const logicFieldKey = (blockId: string, fieldId: string) => `${blockId}:${fieldId}`

/** Campos do template achatados, com a chave de valores de cada um. */
export interface FlatField {
  blockId: string
  field: TemplateField
  /** Chave usada no mapa de valores. */
  key: string
}

/** Achata os blocos (ignorando campos arquivados) com a chave de valores. */
export function flattenFieldsWithKeys(blocks: TemplateBlock[]): FlatField[] {
  const out: FlatField[] = []
  for (const block of blocks) {
    for (const field of block.fields) {
      if (!field.archived)
        out.push({ blockId: block.id, field, key: logicFieldKey(block.id, field.id) })
    }
  }
  return out
}

/** Valor vazio: null, undefined ou string em branco. */
export function isEmptyLogicValue(raw: unknown): boolean {
  return raw === null || raw === undefined || (typeof raw === 'string' && raw.trim() === '')
}

/**
 * Interpreta o valor digitado pelo construtor como número, quando possível.
 * Aceita vírgula decimal. Retorna null quando não é numérico.
 */
function toComparableNumber(text: string): number | null {
  const normalized = text.replace(',', '.').trim()
  if (normalized === '') return null
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

/**
 * Avalia UMA regra de visibilidade contra o valor atual do campo de origem.
 *
 * Estado inicial oculto: valor de origem vazio (null, undefined ou "") →
 * a condição retorna false, independentemente do operador.
 *
 * Comparação numérica quando AMBOS os lados forem numéricos; textual
 * (case-insensitive) caso contrário.
 */
export function evaluateLogicRule(rule: LogicRule, sourceValue: unknown): boolean {
  // Estado inicial oculto: origem vazia nunca satisfaz a condição.
  if (isEmptyLogicValue(sourceValue)) return false

  if (rule.operator === 'contains') {
    const hay = Array.isArray(sourceValue)
      ? sourceValue.map((v) => String(v).toLowerCase())
      : String(sourceValue).toLowerCase()
    return hay.includes(rule.value.trim().toLowerCase())
  }

  const cmpNumber = toComparableNumber(String(sourceValue))
  const ruleNumber = toComparableNumber(rule.value)
  if (cmpNumber !== null && ruleNumber !== null) {
    switch (rule.operator) {
      case '==':
        return cmpNumber === ruleNumber
      case '!=':
        return cmpNumber !== ruleNumber
      case '>':
        return cmpNumber > ruleNumber
      case '<':
        return cmpNumber < ruleNumber
      case '>=':
        return cmpNumber >= ruleNumber
      case '<=':
        return cmpNumber <= ruleNumber
      default:
        return false
    }
  }

  // Textual: igualdade/diferença exatas (case-insensitive); ordinais usam
  // comparação lexicográfica simples.
  const left = String(sourceValue).trim().toLowerCase()
  const right = rule.value.trim().toLowerCase()
  switch (rule.operator) {
    case '==':
      return left === right
    case '!=':
      return left !== right
    case '>':
      return left > right
    case '<':
      return left < right
    case '>=':
      return left >= right
    case '<=':
      return left <= right
    default:
      return false
  }
}

/**
 * Motor de gatilhos: dado o template e os valores atuais, retorna o mapa de
 * visibilidade por chave (blockId:fieldId). Campos sem regras (ou
 * alwaysVisible ≠ false) ficam visíveis. Regras múltiplas = AND.
 *
 * Função pura — o Executor de preenchimento futuro reutiliza sem alterações.
 */
export function evaluateFieldVisibility(
  blocks: TemplateBlock[],
  values: LogicValues,
): Record<string, boolean> {
  const flat = flattenFieldsWithKeys(blocks)
  const byId = new Map(flat.map(({ field, key }) => [field.id, { field, key }]))
  const visibility: Record<string, boolean> = {}
  for (const { field, key } of flat) {
    // Sem regras (ou sempre visível): campo aparece. Templates antigos sem
    // alwaysVisible/triggers continuam funcionando (defaults).
    if (field.alwaysVisible !== false || !field.triggers || field.triggers.length === 0) {
      visibility[key] = true
      continue
    }
    let visible = true
    for (const rule of field.triggers) {
      // Origem removida do template ou sem valor → regra falsa (campo oculto).
      const source = rule.sourceFieldId ? byId.get(rule.sourceFieldId) : undefined
      const sourceValue = source ? values[source.key] : undefined
      if (!evaluateLogicRule(rule, sourceValue)) {
        visible = false
        break
      }
    }
    visibility[key] = visible
  }
  return visibility
}

/** Rótulo do operador de lógica (para exibição no painel). */
export function logicOperatorLabel(op: LogicOperator): string {
  const found = LOGIC_OPERATOR_LABELS.find((l) => l.value === op)
  return found?.label ?? op
}

const LOGIC_OPERATOR_LABELS: { value: LogicOperator; label: string }[] = [
  { value: '==', label: 'Igual (==)' },
  { value: '!=', label: 'Diferente (!=)' },
  { value: '>', label: 'Maior que (>)' },
  { value: '<', label: 'Menor que (<)' },
  { value: '>=', label: 'Maior ou igual (>=)' },
  { value: '<=', label: 'Menor ou igual (<=)' },
  { value: 'contains', label: 'Contém (contains)' },
]
