import type { CalcOperator, FormulaTerm, TemplateBlock, TemplateField } from '@/types/template'

/** Resultado da avaliação de uma fórmula. */
export interface CalculationResult {
  /** Valor calculado, pronto para exibição. */
  value: number | null
  /** Texto a mostrar no campo (número formatado, '--' ou aviso). */
  display: string
  /** Estado do cálculo ('ok' | 'div_zero' | 'empty' | 'invalid'). */
  state: 'ok' | 'div_zero' | 'empty' | 'invalid'
  /** Mensagem sutil quando o cálculo não pôde ser concluído. */
  message: string
}

/** Texto exibido quando o cálculo não produz número. */
export const CALC_EMPTY_DISPLAY = '--'

/** Ids dos campos numéricos de origem usados pela fórmula. */
export function formulaSourceFieldIds(formula: FormulaTerm[] | undefined): string[] {
  if (!formula) return []
  return formula.filter((t) => t.kind === 'field' && t.fieldId).map((t) => t.fieldId as string)
}

/** True quando a fórmula tem pelo menos um campo e termina completa (campo+op ou só campo). */
export function isFormulaUsable(formula: FormulaTerm[] | undefined): boolean {
  if (!formula || formula.length === 0) return false
  if (formula[0].kind !== 'field') return false
  if (formula[formula.length - 1].kind !== 'field') return false
  for (let i = 0; i < formula.length; i++) {
    const expected: 'field' | 'op' = i % 2 === 0 ? 'field' : 'op'
    if (formula[i].kind !== expected) return false
  }
  return true
}

/**
 * Coleta todos os campos de um template (blocos) achatados em uma lista
 * com a chave usada no mapa de valores (blockId:fieldId).
 */
export function flattenFields(
  blocks: TemplateBlock[],
): { blockId: string; field: TemplateField; key: string }[] {
  const out: { blockId: string; field: TemplateField; key: string }[] = []
  for (const block of blocks) {
    for (const field of block.fields) {
      if (!field.archived) out.push({ blockId: block.id, field, key: `${block.id}:${field.id}` })
    }
  }
  return out
}

/**
 * Interpreta o valor de um campo de origem como número. Vazio (null,
 * undefined, '') conta como 0. Texto não numérico (ex. resposta de select)
 * também vira 0 — a fórmula não quebra por causa de um campo de outro tipo.
 */
function numericValue(raw: unknown): number {
  if (raw === null || raw === undefined || raw === '') return 0
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0
  if (Array.isArray(raw)) return raw.length === 0 ? 0 : Number.NaN
  const n = Number(String(raw).replace(',', '.').trim())
  return Number.isFinite(n) ? n : 0
}

/** Operação entre dois números; devolve null em divisão por zero. */
function applyOp(a: number, op: CalcOperator, b: number): number | null {
  switch (op) {
    case '+':
      return a + b
    case '-':
      return a - b
    case '*':
      return a * b
    case '/':
      return b === 0 ? null : a / b
    default:
      return null
  }
}

/**
 * Avalia a fórmula de um campo calculation contra os valores atuais
 * (mapa fieldId → valor). Função pura — o Executor de preenchimento
 * futuro pode reutilizá-la sem dependência de React.
 *
 * - Divisão por zero: exibe '--' com aviso sutil (não quebra a tela).
 * - Valores vazios das origens contam como 0.
 * - Fórmula inválida/incompleta: exibe '--' com aviso.
 */
export function evaluateCalculation(
  formula: FormulaTerm[] | undefined,
  valuesByFieldId: Record<string, unknown>,
): CalculationResult {
  if (!formula || formula.length === 0) {
    return {
      value: null,
      display: CALC_EMPTY_DISPLAY,
      state: 'empty',
      message: 'Fórmula não configurada — selecione campos e operadores nas propriedades.',
    }
  }
  if (!isFormulaUsable(formula)) {
    return {
      value: null,
      display: CALC_EMPTY_DISPLAY,
      state: 'invalid',
      message: 'Fórmula incompleta — revise os termos no painel de propriedades.',
    }
  }
  let acc: number | null = null
  let pendingOp: CalcOperator | null = null
  for (const term of formula) {
    if (term.kind === 'op') {
      pendingOp = term.op ?? null
      continue
    }
    // Origem identificada pelo id do campo (chave de valores resolvida por quem chama).
    const raw = term.fieldId ? valuesByFieldId[term.fieldId] : undefined
    const n = numericValue(raw)
    if (acc === null) {
      acc = n
      continue
    }
    if (!pendingOp) {
      return {
        value: null,
        display: CALC_EMPTY_DISPLAY,
        state: 'invalid',
        message: 'Fórmula inválida — operador ausente entre campos.',
      }
    }
    acc = applyOp(acc, pendingOp, n)
    pendingOp = null
    if (acc === null) {
      return {
        value: null,
        display: CALC_EMPTY_DISPLAY,
        state: 'div_zero',
        message: 'Divisão por zero — o divisor está zerado ou vazio.',
      }
    }
  }
  if (acc === null || !Number.isFinite(acc)) {
    return {
      value: null,
      display: CALC_EMPTY_DISPLAY,
      state: 'invalid',
      message: 'Fórmula inválida — resultado não numérico.',
    }
  }
  // Arredonda ruído de ponto flutuante (ex.: 0.1+0.2 = 0.30000000000000004).
  const rounded = Math.round(acc * 1e10) / 1e10
  return { value: rounded, display: String(rounded), state: 'ok', message: '' }
}
