/**
 * Tipos do módulo de Cadastros Mestres (coleções entity_definitions e
 * master_data_entries, criadas na migração 0007 — leitura/escrita apenas via
 * rotas server-side com checagem de admin).
 */

export interface EntityDefinitionRecord {
  id: string
  name: string
  description: string
  active: boolean
  created: string
  updated: string
}

export interface MasterDataEntryRecord {
  id: string
  entity_id: string
  value: string
  description: string
  active: boolean
  created: string
  updated: string
}

/**
 * Slugs legados gravados no JSON blocks antes do módulo existir (o campo
 * master_data guardava 'transportadora'/'veiculo'/'doca' no field.entity).
 * Continuam suportados em leitura; novos templates guardam o id da entidade.
 */
export type LegacyMasterDataEntity = 'transportadora' | 'veiculo' | 'doca'

export const LEGACY_MASTER_DATA_LABELS: Record<LegacyMasterDataEntity, string> = {
  transportadora: 'Transportadora',
  veiculo: 'Veículo',
  doca: 'Doca',
}

/** Slugs legados normalizados (sem acento, minúsculos). */
export const LEGACY_MASTER_DATA_SLUGS: string[] = ['transportadora', 'veiculo', 'doca']

/**
 * Normaliza um texto para comparação: minúsculo e sem acento.
 * 'Transportadoras' -> 'transportadoras'.
 */
export function slugifyEntityName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/**
 * True quando o valor de field.entity é um id real de entity_definitions
 * (id PocketBase: 15 caracteres alfanuméricos). Slugs legados ('transportadora'
 * etc.) não passam nesse teste.
 */
export function isRealEntityId(entity: unknown): entity is string {
  return typeof entity === 'string' && /^[a-z0-9]{15}$/.test(entity)
}

/**
 * Rótulo exibido para o valor de field.entity: nome da entidade real quando
 * encontrado, rótulo legado quando for um slug antigo, ou o valor bruto.
 */
export function masterDataEntityLabel(
  entity: string | undefined,
  entities: EntityDefinitionRecord[],
): string {
  if (!entity) return '—'
  const real = entities.find((e) => e.id === entity)
  if (real) return real.name
  const legacy = LEGACY_MASTER_DATA_LABELS[entity as LegacyMasterDataEntity]
  if (legacy) return `${legacy} (legado)`
  return entity
}
