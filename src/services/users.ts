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
 * Lista os registros de profiles ordenados por nome completo.
 *
 * Usa a rota server-side GET /backend/v1/globex/users: a regra de lista da
 * coleção `profiles` (self-join @collection.profiles.role = 'admin') não
 * funciona como EXISTS no PocketBase e faz cada admin enxergar apenas o
 * próprio perfil — o que escondia usuários recém-criados da listagem.
 * Se a rota falhar (deploy antigo), cai no caminho direto do SDK.
 */
export async function listProfilesWithDepartment(): Promise<ProfileWithDepartment[]> {
  try {
    const res = await pb.send<{ items: ProfileWithDepartment[] }>('/backend/v1/globex/users', {
      method: 'GET',
    })
    return res.items ?? []
  } catch (err) {
    // Fallback: listagem direta (mesma ordenação). Mantém a tela funcionando
    // caso a rota server-side não esteja disponível.
    console.warn('Listagem via rota server-side falhou, usando SDK direto:', err)
    return pb.collection('profiles').getFullList<ProfileWithDepartment>({
      sort: 'full_name',
      expand: 'department_id',
    })
  }
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
