import type { RegistryMask } from '@/types/template'

/**
 * Máscaras progressivas (as-you-type) e validação do campo registry.
 *
 * Cada máscara define:
 *  - `digits`: quantos dígitos a entrada bruta deve ter quando completa;
 *  - `maxLen`: tamanho máximo do valor formatado (corte do value do input);
 *  - `format(raw)`: recebe o texto digitado e devolve o texto mascarado;
 *  - `placeholder`: indica o formato real (não um exemplo estático);
 *  - `validate(formatted)`: estado ("ok" | "incomplete" | "invalid") e a
 *    mensagem de alerta exibida abaixo do input.
 */
interface MaskDefinition {
  digits?: number
  maxLen: number
  format: (text: string) => string
  placeholder: string
  validate: (formatted: string) => { state: 'ok' | 'incomplete' | 'invalid'; message: string }
}

/** Tira tudo que não é dígito e limita ao tamanho da máscara. */
const stripNonDigits = (text: string) => text.replace(/\D+/g, '')

export const REGISTRY_MASK_DEFS: Record<RegistryMask, MaskDefinition> = {
  email: {
    maxLen: 254,
    format: (t) => t,
    placeholder: 'nome@empresa.com',
    validate: (formatted) => {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
      return re.test(formatted)
        ? { state: 'ok', message: '' }
        : { state: 'invalid', message: 'Formato de E-mail inválido' }
    },
  },
  uf: {
    maxLen: 2,
    format: (t) => t.toUpperCase(),
    placeholder: '__',
    validate: (formatted) => {
      const re =
        /^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/
      return re.test(formatted)
        ? { state: 'ok', message: '' }
        : { state: 'invalid', message: 'UF inválida' }
    },
  },
  uf_city: {
    maxLen: 80,
    format: (t) => t,
    placeholder: 'UF — Cidade',
    validate: (formatted) => {
      const re = /^[A-Za-z]{2}\s+—\s+.+$/
      return re.test(formatted)
        ? { state: 'ok', message: '' }
        : { state: 'invalid', message: 'Formato UF — Cidade incompleto' }
    },
  },
  cep: {
    digits: 8,
    maxLen: 9,
    format: (t) => t.replace(/^(\d{5})(\d)/, '$1-$2'),
    placeholder: '_____-___',
    validate: (formatted) => {
      if (formatted.length < 9) return { state: 'incomplete', message: 'Formato de CEP incompleto' }
      return { state: 'ok', message: '' }
    },
  },
  phone: {
    digits: 11,
    maxLen: 15,
    format: (t) => {
      const v = t.replace(/\D+/g, '')
      if (v.length === 0) return ''
      if (v.length <= 2) return `(${v}`
      if (v.length <= 6) return `(${v.slice(0, 2)}) ${v.slice(2)}`
      if (v.length <= 10) return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`
      return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`
    },
    placeholder: '(__) _____-____',
    validate: (formatted) => {
      const digits = stripNonDigits(formatted).length
      if (digits < 10) return { state: 'incomplete', message: 'Formato de Telefone incompleto' }
      return { state: 'ok', message: '' }
    },
  },
  cnpj: {
    digits: 14,
    maxLen: 18,
    format: (t) =>
      t
        .replace(/\D+/g, '')
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)$/, '$1-$2'),
    placeholder: '__.___.___/____-__',
    validate: (formatted) => {
      if (formatted.length < 18)
        return { state: 'incomplete', message: 'Formato de CNPJ incompleto' }
      return { state: 'ok', message: '' }
    },
  },
  cpf: {
    digits: 11,
    maxLen: 14,
    format: (t) =>
      t
        .replace(/\D+/g, '')
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)$/, '.$1-$2'),
    placeholder: '___.___.___-__',
    validate: (formatted) => {
      if (formatted.length < 14)
        return { state: 'incomplete', message: 'Formato de CPF incompleto' }
      return { state: 'ok', message: '' }
    },
  },
  plate: {
    maxLen: 8,
    format: (t) =>
      t
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .replace(/^([A-Z]{3})(?=.)/, '$1-'),
    validate: (formatted) => {
      if (formatted.length === 0) return { state: 'incomplete', message: '' }
      if (formatted.length < 8)
        return { state: 'incomplete', message: 'Formato de Placa incompleto' }
      const re = /^[A-Z]{3}-[0-9]{4}$/
      return re.test(formatted)
        ? { state: 'ok', message: '' }
        : { state: 'invalid', message: 'Formato de Placa inválido' }
    },
    placeholder: 'AAA-9999',
  },
  mercosul_plate: {
    maxLen: 8,
    format: (t) =>
      t
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .replace(/^([A-Z]{3})(?=.)/, '$1-'),
    validate: (formatted) => {
      if (formatted.length === 0) return { state: 'incomplete', message: '' }
      if (formatted.length < 8)
        return { state: 'incomplete', message: 'Formato de Placa Mercosul incompleto' }
      const re = /^[A-Z]{3}-[0-9][A-Z][0-9]{2}$/
      return re.test(formatted)
        ? { state: 'ok', message: '' }
        : { state: 'invalid', message: 'Formato de Placa Mercosul inválido' }
    },
    placeholder: 'AAA-0A00',
  },
}

/** Máscaras onde o usuário digita livremente (sem progressão de dígitos). */
const FREE_TEXT_MASKS: RegistryMask[] = ['email', 'uf', 'uf_city', 'plate', 'mercosul_plate']

/**
 * Formata o texto digitado para exibição. Para máscaras de dígitos (CEP,
 * Telefone, CPF, CNPJ), a entrada bruta é sempre re-mascarada a partir dos
 * dígitos — apagar funciona de forma previsível.
 */
export function formatRegistryValue(mask: RegistryMask, text: string): string {
  const def = REGISTRY_MASK_DEFS[mask]
  if (FREE_TEXT_MASKS.includes(mask)) return def.format(text.slice(0, def.maxLen))
  // Re-mascara a partir dos dígitos, cortados no limite da máscara
  // (ex.: CEP aceita no máximo 8 dígitos — o 9º simplesmente não entra).
  const rawDigits = def.digits ? stripNonDigits(text).slice(0, def.digits) : stripNonDigits(text)
  return def.format(rawDigits).slice(0, def.maxLen)
}

/** Placeholder que indica o formato real da máscara (não exemplo estático). */
export function registryPlaceholder(mask: RegistryMask): string {
  return REGISTRY_MASK_DEFS[mask].placeholder
}

/**
 * Limite físico de caracteres do input (maxLength) — ex.: CEP 9 ("00000-000"),
 * CPF 14, CNPJ 18, Telefone 15 (com DDI +) ou 14, Placa 8 ("AAA-9999").
 * Impede a continuação da digitação assim que o limite é atingido.
 */
export function registryMaxLength(mask: RegistryMask): number {
  return REGISTRY_MASK_DEFS[mask].maxLen
}

/** Valida o valor (já formatado) de um campo registry. */
export function validateRegistryValue(
  mask: RegistryMask,
  value: string,
): { state: 'ok' | 'incomplete' | 'invalid'; message: string } {
  if (!value || value.length === 0) return { state: 'incomplete', message: '' }
  return REGISTRY_MASK_DEFS[mask].validate(value)
}
