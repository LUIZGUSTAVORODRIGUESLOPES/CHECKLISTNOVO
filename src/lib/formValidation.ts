import type { TemplateBlock, TemplateField } from '@/types/template'
import { validateRegistryValue } from '@/lib/masks'

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
 */
export function findInvalidRegistryFields(
  blocks: TemplateBlock[],
  values: Record<string, unknown>,
  keyOf: (blockId: string, fieldId: string) => string,
): InvalidRegistryEntry[] {
  const invalid: InvalidRegistryEntry[] = []
  for (const block of blocks) {
    for (const field of block.fields) {
      if (field.archived) continue
      const key = keyOf(block.id, field.id)
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
