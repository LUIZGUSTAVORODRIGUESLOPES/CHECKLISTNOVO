/**
 * Configurações de Atribuições e Design do PDF do template.
 * Vivem DENTRO do JSON blocks (chaves `assignments` e `pdfDesign`) — sem
 * colunas novas na coleção templates. Este módulo carrega os tipos, os
 * presets de cor e os normalizadores (defaults sensatos para templates
 * antigos, que não têm essas chaves).
 */
import type { TemplateBlock, TemplateConfigExtras } from '@/types/template'

/** Escopo de disponibilidade do checklist. */
export type AssignmentScope = 'all' | 'departments'

export interface TemplateAssignments {
  /** 'all' = todos os operadores; 'departments' = restrito aos selecionados. */
  scope: AssignmentScope
  /** Ids dos departamentos ativos quando scope = 'departments'. */
  departmentIds: string[]
}

export interface TemplatePdfDesign {
  /** Cor primária do cabeçalho do relatório (hex, com '#'). */
  primaryColor: string
  /** Exibir logotipo da Globex no relatório. */
  showLogo: boolean
  /** Rodapé com data/hora de emissão. */
  footerDatetime: boolean
  /** Paginação (número de página / total). */
  pagination: boolean
}

/** Chaves novas dentro do JSON blocks (na raiz, ao lado dos blocos). */
export interface TemplateExtras {
  assignments?: TemplateAssignments
  pdfDesign?: TemplatePdfDesign
}

/** Azul Globex — default do cabeçalho do relatório. */
export const DEFAULT_PDF_PRIMARY_COLOR = '#2563eb'

/** Presets de cor primária (chips clicáveis). */
export const PDF_COLOR_PRESETS: { value: string; label: string }[] = [
  { value: '#2563eb', label: 'Azul Globex' },
  { value: '#0f766e', label: 'Verde Petróleo' },
  { value: '#7c3aed', label: 'Violeta' },
  { value: '#b45309', label: 'Âmbar' },
  { value: '#be123c', label: 'Carmim' },
  { value: '#334155', label: 'Grafite' },
]

export const DEFAULT_ASSIGNMENTS: TemplateAssignments = {
  scope: 'all',
  departmentIds: [],
}

export const DEFAULT_PDF_DESIGN: TemplatePdfDesign = {
  primaryColor: DEFAULT_PDF_PRIMARY_COLOR,
  showLogo: true,
  footerDatetime: true,
  pagination: true,
}

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/

/** True quando o valor é um bloco (array de fields) e não uma chave extra. */
function isBlockLike(value: unknown): value is TemplateBlock {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as { fields?: unknown }).fields)
  )
}

/**
 * Extrai as chaves extras (assignments/pdfDesign) do JSON blocks bruto,
 * descartando tudo que não seja um bloco legítimo (defesa contra dados
 * antigos/corrompidos).
 */
export function extractTemplateExtras(rawBlocks: unknown): TemplateExtras {
  const extras: TemplateExtras = {}
  if (!Array.isArray(rawBlocks)) return extras
  for (const item of rawBlocks) {
    if (isBlockLike(item)) continue
    if (typeof item !== 'object' || item === null) continue
    const obj = item as Record<string, unknown>
    if (obj.assignments !== undefined && typeof obj.assignments === 'object') {
      const a = obj.assignments as Record<string, unknown>
      extras.assignments = {
        scope: a.scope === 'departments' ? 'departments' : 'all',
        departmentIds: Array.isArray(a.departmentIds)
          ? a.departmentIds.filter((d): d is string => typeof d === 'string')
          : [],
      }
    }
    if (obj.pdfDesign !== undefined && typeof obj.pdfDesign === 'object') {
      const p = obj.pdfDesign as Record<string, unknown>
      extras.pdfDesign = {
        primaryColor:
          typeof p.primaryColor === 'string' && HEX_COLOR_RE.test(p.primaryColor)
            ? p.primaryColor
            : DEFAULT_PDF_PRIMARY_COLOR,
        showLogo: p.showLogo !== false,
        footerDatetime: p.footerDatetime !== false,
        pagination: p.pagination !== false,
      }
    }
  }
  return extras
}

/** Reconstrói o JSON blocks: blocos legítimos + as duas chaves extras. */
export function buildBlocksPayload(
  blocks: TemplateBlock[],
  assignments: TemplateAssignments,
  pdfDesign: TemplatePdfDesign,
): Array<TemplateBlock | TemplateConfigExtras> {
  const cleanAssignments: TemplateAssignments = {
    scope: assignments.scope === 'departments' ? 'departments' : 'all',
    departmentIds:
      assignments.scope === 'departments'
        ? Array.from(new Set(assignments.departmentIds.filter(Boolean)))
        : [],
  }
  const cleanPdfDesign: TemplatePdfDesign = {
    primaryColor: HEX_COLOR_RE.test(pdfDesign.primaryColor)
      ? pdfDesign.primaryColor
      : DEFAULT_PDF_PRIMARY_COLOR,
    showLogo: !!pdfDesign.showLogo,
    footerDatetime: !!pdfDesign.footerDatetime,
    pagination: !!pdfDesign.pagination,
  }
  return [...blocks, { assignments: cleanAssignments, pdfDesign: cleanPdfDesign }]
}
