import type { TemplateBlock, TemplateField } from '@/types/template'
import { validateRegistryValue } from '@/lib/masks'
import { evaluateFieldVisibility } from '@/lib/logic'

export interface InvalidRegistryEntry {
  /** Rótulo do bloco onde o campo está. */
  blockTitle: string
  /** Rótulo do campo (ou fallback). */
  fieldLabel: string
  /** Mensagem de validação (máscara ou obrigatoriedade). */
  message: string
  /** true quando o problema é campo obrigatório vazio/incompleto. */
  missing?: boolean
}

/** Um campo com valor vazio (null, string em branco ou array sem itens). */
function isEmptyValue(raw: unknown): boolean {
  if (raw === null || raw === undefined) return true
  if (Array.isArray(raw)) return raw.length === 0
  if (typeof raw === 'string') return raw.trim().length === 0
  return false
}

/**
 * Varre os blocos de um template e devolve todos os campos inválidos:
 *  - registry preenchido porém incompleto/inválido segundo a máscara;
 *  - qualquer campo com required = true vazio (ou registry obrigatório
 *    incompleto, que também bloqueia a submissão).
 * Usado para bloquear a submissão com um toast de erro.
 *
 * Obrigatoriedade só vale para campos VISÍVEIS no momento do preenchimento:
 * antes de validar, o estado de visibilidade de cada campo é calculado pelo
 * mesmo motor de gatilhos usado na renderização (evaluateFieldVisibility).
 * Campo oculto por gatilho não atendido (inclusive quando o campo de origem
 * está vazio) e campos que só existem dentro de um bloco efetivamente oculto
 * (todos os seus campos condicionais escondidos) são ignorados — nunca geram
 * alerta de obrigatório pendente. Campos sem gatilho (sempre visíveis)
 * mantêm a obrigatoriedade como antes.
 */
export function findInvalidRegistryFields(
  blocks: TemplateBlock[],
  values: Record<string, unknown>,
  keyOf: (blockId: string, fieldId: string) => string,
): InvalidRegistryEntry[] {
  const invalid: InvalidRegistryEntry[] = []
  // Mesma avaliação de gatilhos da renderização (por chave blockId:fieldId).
  const visibility = evaluateFieldVisibility(blocks, values)
  for (const block of blocks) {
    // Bloco inteiro oculto: quando TODOS os campos ativos do bloco estão
    // escondidos por gatilho, nenhum campo dele participa da validação.
    const activeFields = block.fields.filter((f) => !f.archived)
    const blockHidden =
      activeFields.length > 0 &&
      activeFields.every((f) => visibility[keyOf(block.id, f.id)] === false)
    if (blockHidden) continue
    for (const field of activeFields) {
      const key = keyOf(block.id, field.id)
      // Campo individualmente oculto por gatilho não atendido: fora da
      // validação (nem obrigatório, nem máscara).
      if (visibility[key] === false) continue
      const raw = values[key]
      const value = typeof raw === 'string' ? raw : ''
      const label = field.label || 'Campo sem rótulo'

      // registry: máscara validada quando há conteúdo; obrigatório vazio bloqueia.
      if (field.type === 'registry') {
        if (!value) {
          if (field.required)
            invalid.push({
              blockTitle: block.title,
              fieldLabel: label,
              message: 'Campo obrigatório não preenchido',
              missing: true,
            })
          continue
        }
        const mask = field.registry_mask ?? 'email'
        const result = validateRegistryValue(mask, value)
        if (result.state === 'incomplete' || result.state === 'invalid') {
          invalid.push({
            blockTitle: block.title,
            fieldLabel: label,
            message: result.message || 'Formato inválido',
            // Obrigatório incompleto também conta como faltante (alerta no input).
            missing: !!field.required,
          })
        }
        continue
      }

      // Demais tipos: checagem de obrigatoriedade (valor vazio).
      if (field.required && isEmptyValue(raw)) {
        invalid.push({
          blockTitle: block.title,
          fieldLabel: label,
          message: 'Campo obrigatório não preenchido',
          missing: true,
        })
      }
    }
  }
  return invalid
}

/**
 * Chave de cada campo no mapa de erros de submissão
 * (mesma convenção de chave usada pelo preview/executor).
 */
export const requiredFieldKey = (blockId: string, fieldId: string) => `${blockId}:${fieldId}`
