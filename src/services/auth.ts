import pb from '@/lib/pocketbase/client'
import type { ProfileRecord } from '@/types/auth'

export const INACTIVE_USER_MESSAGE =
  'Este usuário está inativo. Entre em contato com o administrador.'

/**
 * Busca o registro de perfil associado a um usuário no PocketBase
 */
export async function getProfileByUserId(userId: string): Promise<ProfileRecord | null> {
  try {
    const record = await pb
      .collection('profiles')
      .getFirstListItem<ProfileRecord>(`user = "${userId}"`)
    return record
  } catch (error) {
    console.error('Erro ao buscar perfil do usuário:', error)
    return null
  }
}

/**
 * Autentica o usuário com email e senha e valida o status ativo do perfil
 */
export async function loginWithEmailAndPassword(
  email: string,
  password: string,
): Promise<{ profile: ProfileRecord }> {
  // Autenticação nativa do PocketBase
  const authData = await pb.collection('users').authWithPassword(email.trim(), password)
  const userId = authData.record.id

  // Validação crítica de status imediatamente após autenticação
  const profile = await getProfileByUserId(userId)

  if (!profile || profile.active === false) {
    // Forçar logout imediato (equivalente a supabase.auth.signOut())
    pb.authStore.clear()
    throw new Error(INACTIVE_USER_MESSAGE)
  }

  return { profile }
}

/**
 * Logout do PocketBase
 */
export function logoutUser(): void {
  pb.authStore.clear()
}
