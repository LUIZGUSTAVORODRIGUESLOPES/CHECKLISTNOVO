import type { TemplateBlock } from '@/types/template'
import { validateRegistryValue } from '@/lib/masks'

export interface InvalidRegistryEntry {
  /** Rótulo do bloco onde o campo está. */
  blockTitle: string
  /** Rótulo do campo (ou fallback). */
  fieldLabel: string
  /** Mensagem de validação da máscara (ex: 'Formato de CEP incompleto'). */
  message: string
}

/**
 * Varre os blocos de um template e devolve todos os campos registry com
 * valor preenchido mas em estado incompleto/inválido segundo a máscara.
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
      if (field.archived || field.type !== 'registry') continue
      const mask = field.registry_mask ?? 'email'
      const raw = values[keyOf(block.id, field.id)]
      const value = typeof raw === 'string' ? raw : ''
      if (!value) continue // vazio não é "inválido" (obrigatoriedade é outra regra)
      const result = validateRegistryValue(mask, value)
      if (result.state === 'incomplete' || result.state === 'invalid') {
        invalid.push({
          blockTitle: block.title,
          fieldLabel: field.label || 'Campo sem rótulo',
          message: result.message || 'Formato inválido',
        })
      }
    }
  }
  return invalid
}
