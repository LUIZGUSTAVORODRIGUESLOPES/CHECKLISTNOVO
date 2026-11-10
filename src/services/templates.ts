import pb from '@/lib/pocketbase/client'
import { ClientResponseError } from 'pocketbase'
import type { TemplateRecord, TemplatePayload } from '@/types/template'

/**
 * Lista os templates com contagem de respostas via rota server-side
 * GET /backend/v1/globex/templates (create/update/delete da coleção são null
 * — escrita só pelo hook). Fallback: listagem direta do SDK.
 */
export async function listTemplates(): Promise<TemplateRecord[]> {
  try {
    const res = await pb.send<{ items: TemplateRecord[] }>('/backend/v1/globex/templates', {
      method: 'GET',
    })
    return (res.items ?? []).map((t) => ({ ...t, blocks: normalizeBlocks(t.blocks) }))
  } catch (err) {
    const status = err instanceof ClientResponseError ? err.status : 0
    if (status !== 404) throw err
    console.warn('Listagem de templates via rota server-side falhou, usando SDK direto:', err)
    const records = await pb.collection('templates').getFullList<TemplateRecord>({
      sort: '-created',
    })
    // Sem rota server-side não há contagem: 0 até o hook ficar disponível.
    return records.map((t) => ({ ...t, blocks: normalizeBlocks(t.blocks), responses_count: 0 }))
  }
}

/** Busca um template com responses_count (modo de edição segura). */
export async function getTemplate(id: string): Promise<TemplateRecord> {
  try {
    const res = await pb.send<TemplateRecord>(`/backend/v1/globex/templates/${id}`, {
      method: 'GET',
    })
    return { ...res, blocks: normalizeBlocks(res.blocks) }
  } catch (err) {
    const status = err instanceof ClientResponseError ? err.status : 0
    if (status !== 404) throw err
    const record = await pb.collection('templates').getOne<TemplateRecord>(id)
    return { ...record, blocks: normalizeBlocks(record.blocks), responses_count: 0 }
  }
}

/**
 * Contagem dedicada de respostas do template (modo de edição segura).
 * 404 (deploy antigo) devolve null — o chamador decide o fallback.
 */
export async function getResponsesCount(templateId: string): Promise<number | null> {
  try {
    const res = await pb.send<{ responses_count: number }>(
      `/backend/v1/globex/templates/${templateId}/responses-count`,
      { method: 'GET' },
    )
    return res.responses_count ?? 0
  } catch (err) {
    const status = err instanceof ClientResponseError ? err.status : 0
    if (status !== 404) throw err
    return null
  }
}

/** Cria um template; o backend grava created_by com o perfil do admin logado. */
export async function createTemplate(payload: TemplatePayload): Promise<string> {
  const res = await pb.send<{ id: string }>('/backend/v1/globex/templates', {
    method: 'POST',
    body: {
      ...payload,
      department_id: payload.department_id || '',
      subject_id: payload.subject_id || '',
    },
  })
  return res.id
}

/** Atualiza um template existente via rota server-side PATCH. */
export async function updateTemplate(id: string, payload: TemplatePayload): Promise<number | null> {
  const res = await pb.send<{ responses_count: number | null }>(
    `/backend/v1/globex/templates/${id}`,
    {
      method: 'PATCH',
      body: {
        ...payload,
        department_id: payload.department_id || '',
        subject_id: payload.subject_id || '',
      },
    },
  )
  return res.responses_count ?? null
}

/**
 * Exclui um template (recusado pelo hook quando há respostas vinculadas).
 */
export async function deleteTemplate(id: string): Promise<void> {
  await pb.send(`/backend/v1/globex/templates/${id}`, {
    method: 'DELETE',
  })
}

/** Normaliza o campo json `blocks` (string crua, null, array) para array. */
function normalizeBlocks(raw: unknown): TemplateRecord['blocks'] {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch (_) {
      return []
    }
  }
  return []
}
