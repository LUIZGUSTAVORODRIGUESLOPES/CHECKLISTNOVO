export type FieldType = 'text' | 'number' | 'date' | 'select' | 'multiselect'

export interface TemplateField {
  /** Identificador estável do campo dentro do template (gerado no cliente). */
  id: string
  type: FieldType
  label: string
  /** Instrução/placeholder opcional exibido ao operador. */
  instructions?: string
  required?: boolean
  /** Opções (select/multiselect). */
  options?: string[]
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
}
