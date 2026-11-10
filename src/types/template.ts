export type FieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'registry'
  | 'evaluative'

/** Complementos gerais disponíveis para qualquer tipo de campo. */
export type FieldComplement = 'comment' | 'action_plan' | 'action' | 'attachment'

export const FIELD_COMPLEMENTS: { value: FieldComplement; label: string }[] = [
  { value: 'comment', label: 'Comentário' },
  { value: 'action_plan', label: 'Plano de Ação' },
  { value: 'action', label: 'Ação' },
  { value: 'attachment', label: 'Anexos' },
]

/** Formatos aceitos pelo campo date. */
export type DateFormat =
  | 'time24'
  | 'time24s'
  | 'time12'
  | 'time12s'
  | 'date_ddmmyyyy'
  | 'date_mmyyyy'

export const DATE_FORMATS: { value: DateFormat; label: string }[] = [
  { value: 'time24', label: 'Horário 24h' },
  { value: 'time24s', label: 'Horário 24h (s)' },
  { value: 'time12', label: 'Horário 12h' },
  { value: 'time12s', label: 'Horário 12h (s)' },
  { value: 'date_ddmmyyyy', label: 'Data: dd/mm/aaaa' },
  { value: 'date_mmyyyy', label: 'Data: mm/aaaa' },
]

/** Padrões numéricos aceitos pelo campo number. */
export type NumberPattern = 'quantity' | 'decimal' | 'currency' | 'percentage'

export const NUMBER_PATTERNS: { value: NumberPattern; label: string }[] = [
  { value: 'quantity', label: 'Quantidade' },
  { value: 'decimal', label: 'Decimal' },
  { value: 'currency', label: 'Monetário (R$)' },
  { value: 'percentage', label: 'Porcentagem (%)' },
]

export interface UnitCategory {
  name: string
  units: { value: string; label: string }[]
}

/** Unidades de medida por categoria (campo number). */
export const UNIT_CATEGORIES: UnitCategory[] = [
  {
    name: 'Comprimento',
    units: [
      { value: 'mm', label: 'Milímetros (mm)' },
      { value: 'cm', label: 'Centímetros (cm)' },
      { value: 'm', label: 'Metros (m)' },
      { value: 'km', label: 'Quilômetros (km)' },
      { value: 'in', label: 'Polegadas (in)' },
      { value: 'ft', label: 'Pés (ft)' },
    ],
  },
  {
    name: 'Volume/Cubagem',
    units: [
      { value: 'm3', label: 'Metros Cúbicos (m³)' },
      { value: 'L', label: 'Litros (L)' },
      { value: 'mL', label: 'Mililitros (mL)' },
    ],
  },
  {
    name: 'Peso/Massa',
    units: [
      { value: 'g', label: 'Gramas (g)' },
      { value: 'kg', label: 'Quilogramas (kg)' },
      { value: 't', label: 'Toneladas (t)' },
    ],
  },
]

/** Máscaras do campo registry (Cadastro). */
export type RegistryMask =
  | 'email'
  | 'uf'
  | 'uf_city'
  | 'cep'
  | 'phone'
  | 'cnpj'
  | 'cpf'
  | 'plate'
  | 'mercosul_plate'

export const REGISTRY_MASKS: { value: RegistryMask; label: string }[] = [
  { value: 'email', label: 'E-mail' },
  { value: 'uf', label: 'Estado (UF)' },
  { value: 'uf_city', label: 'UF e Cidade' },
  { value: 'cep', label: 'CEP' },
  { value: 'phone', label: 'Telefone' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'cpf', label: 'CPF' },
  { value: 'plate', label: 'Placa Automóvel' },
  { value: 'mercosul_plate', label: 'Placa Mercosul' },
]

/** Escalas do campo evaluative (Avaliativo). */
export type EvaluativeScale = 'smiley' | 'conformity' | 'yes_no'

export const EVALUATIVE_SCALES: { value: EvaluativeScale; label: string }[] = [
  { value: 'smiley', label: '5 Carinhas (Smiley Faces)' },
  { value: 'conformity', label: 'Conformidade' },
  { value: 'yes_no', label: 'Sim/Não (S/N)' },
]

/**
 * Opção de lista suspensa: mantém o texto em `label` (compatível com os
 * arrays antigos de string) e guarda peso/complementos obrigatórios.
 */
export interface FieldOption {
  label: string
  /** Peso numérico da opção; null = "Não se aplica". */
  weight: number | null
  /** Complementos obrigatórios quando esta opção for marcada. */
  required_complements: FieldComplement[]
  /** false quando a opção foi inativada em modo de edição segura. */
  active?: boolean
}

export interface TemplateField {
  /** Identificador estável do campo dentro do template (gerado no cliente). */
  id: string
  type: FieldType
  label: string
  /** Instrução/placeholder opcional exibido ao operador. */
  instructions?: string
  required?: boolean
  /** Opções (select/multiselect) — strings simples ou objetos ricos. */
  options?: (string | FieldOption)[]
  /** Formato do campo date. */
  date_format?: DateFormat
  /** Padrão numérico do campo number. */
  number_pattern?: NumberPattern
  /** Unidade de medida do campo number (valor das UNIT_CATEGORIES). */
  unit?: string
  /** Máscara do campo registry. */
  registry_mask?: RegistryMask
  /** Escala do campo evaluative. */
  evaluative_scale?: EvaluativeScale
  /** Pesos por resposta da escala S/N (avaliativo), quando configurados. */
  yes_no_weights?: { yes: number | null; no: number | null }
  /** Complementos obrigatórios por resposta do S/N (avaliativo). */
  yes_no_required_complements?: { yes: FieldComplement[]; no: FieldComplement[] }
  /** Complementos gerais habilitados para o campo (todos os tipos). */
  complements?: FieldComplement[]
  /** true quando o campo foi arquivado em modo de edição segura. */
  archived?: boolean
}

export interface TemplateBlock {
  /** Identificador estável do bloco dentro do template (gerado no cliente). */
  id: string
  title: string
  /** Instrução/descrição opcional do bloco. */
  instructions?: string
  fields: TemplateField[]
}

export interface TemplateRecord {
  id: string
  name: string
  description: string
  department_id: string
  subject_id: string
  blocks: TemplateBlock[]
  active: boolean
  created_by: string
  /** Contagem de respostas vinculadas (preenchida pela rota server-side; ausente no fallback do SDK). */
  responses_count?: number
  created: string
  updated: string
}

/** Payload de criação/edição do formulário (o backend força created_by). */
export interface TemplatePayload {
  name: string
  description: string
  department_id: string
  subject_id: string
  blocks: TemplateBlock[]
  active: boolean
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Texto Curto',
  number: 'Número',
  date: 'Data/Hora',
  select: 'Seleção Única - Dropdown',
  multiselect: 'Múltipla Escolha - Dropdown',
  registry: 'Cadastro (registry)',
  evaluative: 'Avaliativo (evaluative)',
}

/** True quando o campo tem lista de opções editável (select/multiselect). */
export const isChoiceType = (type: FieldType) => type === 'select' || type === 'multiselect'

/** Normaliza uma opção (string antiga ou objeto) para FieldOption. */
export function normalizeOption(opt: string | FieldOption): FieldOption {
  if (typeof opt === 'string')
    return { label: opt, weight: null, required_complements: [], active: true }
  return {
    label: opt.label ?? '',
    weight: typeof opt.weight === 'number' ? opt.weight : null,
    required_complements: Array.isArray(opt.required_complements) ? opt.required_complements : [],
    active: opt.active !== false,
  }
}

/** Rótulos das escalas avaliativas (usados nas descrições do painel). */
export const EVALUATIVE_SCALE_LABELS: Record<EvaluativeScale, string> = {
  smiley: '5 Carinhas (Smiley Faces)',
  conformity: 'Conformidade',
  yes_no: 'Sim/Não (S/N)',
}
