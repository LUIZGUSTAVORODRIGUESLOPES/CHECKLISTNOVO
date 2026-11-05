import pb from '@/lib/pocketbase/client'
import type { ProfileRecord } from '@/types/auth'
import type { DepartmentRecord } from '@/types/department'

export type { ProfileRecord }

/** Registro de profile com o departamento expandido (opcional). */
export type ProfileWithDepartment = Omit<ProfileRecord, 'department_id'> & {
  department_id?: string
  expand?: { department_id?: DepartmentRecord }
}

export type UserPayload = {
  full_name: string
  email: string
  role: ProfileRecord['role']
  active: boolean
  department_id?: string
  password?: string
  passwordConfirm?: string
}

/**
 * Lista os registros de profiles com o departamento vinculado expandido,
 * ordenados por nome completo.
 */
export async function listProfilesWithDepartment(): Promise<ProfileWithDepartment[]> {
  return pb.collection('profiles').getFullList<ProfileWithDepartment>({
    sort: 'full_name',
    expand: 'department_id',
  })
}

/**
 * Cria usuário (users + profiles) via rota server-side /api/globex/users,
 * que valida tudo e grava de forma atômica. Nenhum caminho usa authWithPassword
 * nem limpa o authStore — a sessão do admin logado permanece intacta.
 */
export async function createUserWithProfile(payload: UserPayload): Promise<void> {
  await pb.send('/backend/v1/globex/users', {
    method: 'POST',
    body: {
      full_name: payload.full_name,
      email: payload.email,
      role: payload.role,
      active: payload.active,
      department_id: payload.department_id || '',
      password: payload.password,
      passwordConfirm: payload.passwordConfirm ?? payload.password,
    },
  })
}

/**
 * Atualiza usuário (users + profiles) via rota server-side
 * PATCH /api/globex/users/{id}. Senha opcional: quando vazia, a atual é
 * mantida. A sessão do admin logado (authStore) não é tocada por esta rota.
 */
export async function updateUserWithProfile(
  profile: ProfileWithDepartment,
  payload: Partial<UserPayload> & { userId: string },
): Promise<void> {
  await pb.send(`/backend/v1/globex/users/${profile.id}`, {
    method: 'PATCH',
    body: {
      full_name: payload.full_name,
      email: payload.email,
      role: payload.role,
      active: payload.active,
      department_id: payload.department_id || '',
      password: payload.password || '',
      passwordConfirm: payload.passwordConfirm || payload.password || '',
    },
  })
}
