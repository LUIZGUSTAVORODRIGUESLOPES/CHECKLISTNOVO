import pb from '@/lib/pocketbase/client'
import { ClientResponseError } from 'pocketbase'
import type { SubjectRecord } from '@/types/subject'

/**
 * Lista os assuntos via rota server-side GET /backend/v1/globex/subjects
 * (coleção subjects tem create/update/delete null — escrita só no hook).
 * Fallback: listagem direta pelo SDK (leitura é autenticada).
 */
export async function listSubjects(): Promise<SubjectRecord[]> {
  try {
    const res = await pb.send<{ items: SubjectRecord[] }>('/backend/v1/globex/subjects', {
      method: 'GET',
    })
    return res.items ?? []
  } catch (err) {
    const status = err instanceof ClientResponseError ? err.status : 0
    if (status !== 404) throw err
    console.warn('Listagem de assuntos via rota server-side falhou, usando SDK direto:', err)
    return pb.collection('subjects').getFullList<SubjectRecord>({ sort: 'name' })
  }
}

/** Cria um assunto via rota server-side POST /backend/v1/globex/subjects. */
export async function createSubject(
  data: Pick<SubjectRecord, 'name' | 'description' | 'active'> & { department_id?: string },
): Promise<string> {
  const res = await pb.send<{ id: string }>('/backend/v1/globex/subjects', {
    method: 'POST',
    body: {
      name: data.name,
      description: data.description,
      active: data.active,
      department_id: data.department_id || '',
    },
  })
  return res.id
}

/** Atualiza um assunto via rota server-side PATCH /backend/v1/globex/subjects/{id}. */
export async function updateSubject(
  id: string,
  data: Partial<Pick<SubjectRecord, 'name' | 'description' | 'active' | 'department_id'>>,
): Promise<void> {
  await pb.send(`/backend/v1/globex/subjects/${id}`, {
    method: 'PATCH',
    body: {
      name: data.name,
      description: data.description,
      active: data.active,
      department_id: data.department_id !== undefined ? data.department_id || '' : undefined,
    },
  })
}

/**
 * Exclui um assunto via rota server-side DELETE /backend/v1/globex/subjects/{id}.
 * O hook recusa quando há formulários vinculados.
 */
export async function deleteSubject(id: string): Promise<void> {
  await pb.send(`/backend/v1/globex/subjects/${id}`, {
    method: 'DELETE',
  })
}
