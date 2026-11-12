import pb from '@/lib/pocketbase/client'
import { ClientResponseError } from 'pocketbase'
import type { EntityDefinitionRecord, MasterDataEntryRecord } from '@/types/masterData'

const BASE = '/backend/v1/globex/master-data'

/**
 * CRUD de Cadastros Mestres via rotas server-side (coleções com regras de
 * escrita null — escrita só no hook, com checagem de admin).
 */

/* ============================ Entidades ============================ */

/** Lista todas as entidades (GET /master-data/entities). */
export async function listEntities(): Promise<EntityDefinitionRecord[]> {
  const res = await pb.send<{ items: EntityDefinitionRecord[] }>(`${BASE}/entities`, {
    method: 'GET',
  })
  return res.items ?? []
}

/** Cria uma entidade (POST /master-data/entities). */
export async function createEntity(
  data: Pick<EntityDefinitionRecord, 'name' | 'description' | 'active'>,
): Promise<string> {
  const res = await pb.send<{ id: string }>(`${BASE}/entities`, {
    method: 'POST',
    body: { name: data.name, description: data.description, active: data.active },
  })
  return res.id
}

/** Atualiza uma entidade (PATCH /master-data/entities/{id}). */
export async function updateEntity(
  id: string,
  data: Partial<Pick<EntityDefinitionRecord, 'name' | 'description' | 'active'>>,
): Promise<void> {
  await pb.send(`${BASE}/entities/${id}`, { method: 'PATCH', body: data })
}

/**
 * Exclui uma entidade (DELETE /master-data/entities/{id}). O hook recusa quando
 * há itens vinculados ou quando algum template referencia a entidade.
 */
export async function deleteEntity(id: string): Promise<void> {
  await pb.send(`${BASE}/entities/${id}`, { method: 'DELETE' })
}

/** Lista os itens de uma entidade (GET /master-data/entities/{id}/entries). */
export async function listEntries(entityId: string): Promise<MasterDataEntryRecord[]> {
  const res = await pb.send<{ items: MasterDataEntryRecord[] }>(
    `${BASE}/entities/${entityId}/entries`,
    { method: 'GET' },
  )
  return res.items ?? []
}

/* ============================== Itens ============================== */

/** Cria um item (POST /master-data/entries). */
export async function createEntry(
  data: Pick<MasterDataEntryRecord, 'entity_id' | 'value' | 'description' | 'active'>,
): Promise<string> {
  const res = await pb.send<{ id: string }>(`${BASE}/entries`, {
    method: 'POST',
    body: {
      entity_id: data.entity_id,
      value: data.value,
      description: data.description,
      active: data.active,
    },
  })
  return res.id
}

/** Atualiza um item (PATCH /master-data/entries/{id}). */
export async function updateEntry(
  id: string,
  data: Partial<Pick<MasterDataEntryRecord, 'value' | 'description' | 'active'>>,
): Promise<void> {
  await pb.send(`${BASE}/entries/${id}`, { method: 'PATCH', body: data })
}

/** Exclui um item (DELETE /master-data/entries/{id}). */
export async function deleteEntry(id: string): Promise<void> {
  await pb.send(`${BASE}/entries/${id}`, { method: 'DELETE' })
}

/**
 * Lista de uso geral (Construtor/Executor): todas as entidades ativas; quando
 * comEntries=true, busca também os itens ativos de cada uma em paralelo e
 * devolve junto. Erros de itens de uma entidade não derrubam o resultado
 * (entidade volta com items = null).
 */
export async function listActiveEntitiesWithEntries(
  withEntries = true,
): Promise<EntityDefinitionWithEntries[]> {
  const entities = (await listEntities()).filter((e) => e.active)
  if (!withEntries || entities.length === 0) {
    return entities.map((e) => ({ ...e, entries: null }))
  }
  return Promise.all(
    entities.map(async (e) => {
      try {
        const entries = await listEntries(e.id)
        return { ...e, entries: entries.filter((i) => i.active) }
      } catch (err) {
        const status = err instanceof ClientResponseError ? err.status : 0
        if (status !== 404) throw err
        // Deploy antigo sem a rota de itens: entidade sem itens.
        return { ...e, entries: null }
      }
    }),
  )
}

/** Entidade com seus itens ativos (null = não carregados/indisponíveis). */
export type EntityDefinitionWithEntries = EntityDefinitionRecord & {
  entries: MasterDataEntryRecord[] | null
}
