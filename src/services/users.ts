import pb from '@/lib/pocketbase/client'
import { ClientResponseError } from 'pocketbase'
import type { ProfileRecord, UserRole } from '@/types/auth'
import type { DepartmentRecord } from '@/types/department'

export type { ProfileRecord }

/** Registro de profile com o departamento expandido (opcional). */
export type ProfileWithDepartment = Omit<ProfileRecord, 'department_id'> & {
  department_id?: string
  /** Nome do arquivo do avatar (campo file da coleção profiles). */
  avatar?: string
  /** URL pública da miniatura do avatar (preenchida pela rota server-side). */
  avatar_url?: string
  /** Coleções operacionais que possuem ao menos 1 registro vinculado. */
  linked_collections?: string[]
  /** true quando o perfil NÃO pode ser excluído fisicamente. */
  has_operational_links?: boolean
  expand?: { department_id?: DepartmentRecord }
}

export type UserPayload = {
  full_name: string
  email: string
  role: UserRole
  active: boolean
  department_id?: string
  password?: string
  passwordConfirm?: string
}

const BASE_URL = pb.baseUrl.replace(/\/$/, '')

/** URL da miniatura do avatar (thumb 100x100) ou vazio quando não há foto. */
export function avatarUrl(record: Pick<ProfileWithDepartment, 'avatar' | 'id'>): string {
  if (!record.avatar) return ''
  return `${BASE_URL}/api/files/profiles/${record.id}/${record.avatar}?thumb=100x100`
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
 * Envia a foto de perfil (multipart/form-data, campo "avatar") pela rota
 * server-side POST /backend/v1/globex/users/{id}/avatar. O hook valida
 * PNG/JPG/WEBP e grava o arquivo no campo file `avatar` do profile.
 *
 * Fallback: se a rota ainda não estiver disponível (deploy antigo), envia
 * direto pela API de records do SDK — a regra update da coleção profiles
 * (@collection.profiles… admin) permite o próprio admin gravar o avatar.
 */
export async function uploadUserAvatar(profileId: string, file: File): Promise<void> {
  const form = new FormData()
  form.append('avatar', file)
  try {
    await pb.send(`/backend/v1/globex/users/${profileId}/avatar`, {
      method: 'POST',
      body: form,
    })
  } catch (err) {
    const status = err instanceof ClientResponseError ? err.status : 0
    // 404 = rota ausente (deploy antigo); 400/500 = erro real, repassa.
    if (status !== 404) throw err
    await pb.collection('profiles').update(profileId, { avatar: file })
  }
}

/**
 * Cria usuário (users + profiles) via rota server-side /backend/v1/globex/users,
 * que valida tudo e grava de forma atômica. Nenhum caminho usa authWithPassword
 * nem limpa o authStore — a sessão do admin logado permanece intacta.
 */
export async function createUserWithProfile(payload: UserPayload): Promise<string> {
  const res = await pb.send<{ profile_id: string }>('/backend/v1/globex/users', {
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
  return res.profile_id
}

/**
 * Atualiza usuário (users + profiles) via rota server-side
 * PATCH /backend/v1/globex/users/{id}. Senha opcional: quando vazia, a atual é
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

/**
 * Exclui fisicamente o usuário (profile + conta em users) via rota server-side
 * DELETE /backend/v1/globex/users/{id}. O hook recusa (erro) quando o perfil
 * possui histórico operacional vinculado — cenário B.
 */
export async function deleteUser(profileId: string): Promise<void> {
  await pb.send(`/backend/v1/globex/users/${profileId}`, {
    method: 'DELETE',
  })
}

/**
 * Inativa o usuário (active = false) sem excluir nada, via rota server-side
 * PATCH /backend/v1/globex/users/{id}/inactive.
 */
export async function deactivateUser(profileId: string): Promise<void> {
  await pb.send(`/backend/v1/globex/users/${profileId}/inactive`, {
    method: 'PATCH',
    body: {},
  })
}
