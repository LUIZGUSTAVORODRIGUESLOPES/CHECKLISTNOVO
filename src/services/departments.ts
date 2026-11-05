import pb from '@/lib/pocketbase/client'
import type { DepartmentRecord } from '@/types/department'

/**
 * Lista todos os departamentos cadastrados (coleção departments).
 */
export async function listDepartments(): Promise<DepartmentRecord[]> {
  return pb.collection('departments').getFullList<DepartmentRecord>({
    sort: 'name',
  })
}

/**
 * Cria um novo departamento.
 */
export async function createDepartment(
  data: Pick<DepartmentRecord, 'name' | 'description' | 'active'>,
): Promise<DepartmentRecord> {
  return pb.collection('departments').create<DepartmentRecord>(data)
}

/**
 * Atualiza um departamento existente (nome, descrição, active).
 */
export async function updateDepartment(
  id: string,
  data: Partial<Pick<DepartmentRecord, 'name' | 'description' | 'active'>>,
): Promise<DepartmentRecord> {
  return pb.collection('departments').update<DepartmentRecord>(id, data)
}
