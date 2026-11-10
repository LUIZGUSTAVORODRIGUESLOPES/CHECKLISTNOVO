/// <reference lib="es2023" />
// Hooks PocketBase (pb_hooks) do módulo Usuários.

/**
 * POST /api/globex/users
 *
 * Cria o registro em `users` (senha processada pelo PocketBase) e o perfil
 * correspondente em `profiles` de forma atômica, server-side.
 * Exige usuário autenticado — a página é restrita a admin (RoleGuard).
 */
routerAdd(
  'POST',
  '/backend/v1/globex/users',
  (e) => {
    const info = e.requestInfo()
    const body = info.body || {}

    // Somente usuários autenticados podem criar usuários
    if (!e.auth || !e.auth.id) {
      throw new UnauthorizedError('Sessão não autenticada.')
    }

    const fullName = String(body.full_name || '').trim()
    const email = String(body.email || '')
      .trim()
      .toLowerCase()
    const role = String(body.role || '').trim()
    const active = !!body.active
    const password = String(body.password || '')
    const departmentId = body.department_id ? String(body.department_id) : ''

    if (!fullName) throw new BadRequestError('Nome completo é obrigatório.')
    if (!email) throw new BadRequestError('E-mail é obrigatório.')
    if (!['admin', 'operator'].includes(role)) {
      throw new BadRequestError('Nível de acesso inválido.')
    }
    if (password.length < 6) {
      throw new BadRequestError('A senha deve ter no mínimo 6 caracteres.')
    }

    // Departamento: se informado, deve existir e estar ativo
    if (departmentId) {
      let department
      try {
        department = e.app.findRecordById('departments', departmentId)
      } catch (_) {
        throw new BadRequestError('Departamento informado não existe.')
      }
      if (!department.getBool('active')) {
        throw new BadRequestError('Departamento informado está inativo.')
      }
    }

    // E-mail único em profiles
    try {
      e.app.findFirstRecordByFilter('profiles', `email = "${email}"`)
      throw new BadRequestError('Já existe um usuário com este e-mail.')
    } catch (err) {
      if (err instanceof BadRequestError) throw err
    }

    let user
    try {
      user = e.app.findAuthRecordByEmail('_pb_users_auth_', email)
      throw new BadRequestError('Já existe um usuário com este e-mail.')
    } catch (err) {
      if (err instanceof BadRequestError) throw err
    }

    const users = e.app.findCollectionByNameOrId('_pb_users_auth_')

    e.app.runInTransaction((txApp) => {
      const userRecord = new Record(users)
      userRecord.setEmail(email)
      userRecord.setPassword(password)
      userRecord.setVerified(true)
      userRecord.set('name', fullName)
      txApp.save(userRecord)

      const profiles = txApp.findCollectionByNameOrId('profiles')
      const profileRecord = new Record(profiles)
      profileRecord.set('user', userRecord.id)
      profileRecord.set('full_name', fullName)
      profileRecord.set('email', email)
      profileRecord.set('role', role)
      profileRecord.set('active', active)
      if (departmentId) {
        profileRecord.set('department_id', departmentId)
      }
      txApp.save(profileRecord)
    })

    return e.json(200, { ok: true })
  },
  $apis.requireAuth(),
)

/**
 * GET /backend/v1/globex/users
 *
 * Lista todos os perfis (profiles) ordenados por nome completo.
 *
 * Por que rota server-side: a regra de lista da coleção `profiles` usa um
 * self-join (`@collection.profiles.user = @request.auth.id &&
 * @collection.profiles.role = 'admin'`) que NÃO funciona como subconsulta
 * EXISTS no PocketBase — na prática cada admin só enxerga o próprio perfil,
 * escondendo usuários recém-criados da lista. Aqui a verificação de admin é
 * feita no hook (perfil do chamador com role 'admin' e ativo) e a listagem
 * roda com acesso pleno do app, retornando todos os perfis.
 */
routerAdd(
  'GET',
  '/backend/v1/globex/users',
  (e) => {
    if (!e.auth || !e.auth.id) {
      throw new UnauthorizedError('Sessão não autenticada.')
    }

    let callerProfile
    try {
      callerProfile = e.app.findFirstRecordByFilter('profiles', `user = "${e.auth.id}"`)
    } catch (_) {
      throw new ForbiddenError('Perfil não encontrado para o usuário autenticado.')
    }
    if (callerProfile.getString('role') !== 'admin' || !callerProfile.getBool('active')) {
      throw new ForbiddenError('Somente administradores podem listar usuários.')
    }

    const profileRecords = e.app.findRecordsByFilter('profiles', '', 'full_name', 0, 0)
    const items = profileRecords.map((p) => ({
      id: p.id,
      user: p.getString('user'),
      full_name: p.getString('full_name'),
      email: p.getString('email'),
      role: p.getString('role'),
      active: p.getBool('active'),
      department_id: p.getString('department_id'),
      created: p.getString('created'),
      updated: p.getString('updated'),
    }))

    return e.json(200, { items })
  },
  $apis.requireAuth(),
)

/**
 * PATCH /backend/v1/globex/users/{id}
 *
 * Atualiza o registro auth em `users` e o perfil em `profiles`.
 * A troca de senha é OPCIONAL (password vazio mantém a atual). A sessão do
 * admin que chama esta rota não é tocada — nada aqui autentica ou limpa tokens.
 */
routerAdd(
  'PATCH',
  '/backend/v1/globex/users/{id}',
  (e) => {
    const info = e.requestInfo()
    const body = info.body || {}

    if (!e.auth || !e.auth.id) {
      throw new UnauthorizedError('Sessão não autenticada.')
    }

    const profileId = e.request.pathValue('id')

    let profile
    try {
      profile = e.app.findRecordById('profiles', profileId)
    } catch (_) {
      throw new NotFoundError('Usuário não encontrado.')
    }

    const userId = profile.getString('user')
    let user
    try {
      user = e.app.findRecordById('_pb_users_auth_', userId)
    } catch (_) {
      throw new NotFoundError('Registro de acesso não encontrado para este perfil.')
    }

    const data = {}
    let passwordProvided = false
    const fullName = body.full_name !== undefined ? String(body.full_name).trim() : null
    const email = body.email !== undefined ? String(body.email).trim().toLowerCase() : null
    const role = body.role !== undefined ? String(body.role).trim() : null
    const active = body.active !== undefined ? !!body.active : null
    const departmentRaw = body.department_id !== undefined ? body.department_id : undefined
    let departmentId = null
    if (departmentRaw !== undefined) {
      departmentId = departmentRaw ? String(departmentRaw) : ''
    }
    const password = String(body.password || '')
    const passwordConfirm = String(body.passwordConfirm || '')

    if (password || passwordConfirm) {
      if (password.length < 6) {
        throw new BadRequestError('A senha deve ter no mínimo 6 caracteres.')
      }
      if (password !== passwordConfirm) {
        throw new BadRequestError('As senhas não coincidem.')
      }
      passwordProvided = true
    }

    if (fullName !== null && !fullName) {
      throw new BadRequestError('Nome completo é obrigatório.')
    }
    if (email !== null && !email) {
      throw new BadRequestError('E-mail é obrigatório.')
    }
    if (role !== null && !['admin', 'operator'].includes(role)) {
      throw new BadRequestError('Nível de acesso inválido.')
    }

    if (departmentId) {
      let department
      try {
        department = e.app.findRecordById('departments', departmentId)
      } catch (_) {
        throw new BadRequestError('Departamento informado não existe.')
      }
      if (!department.getBool('active')) {
        throw new BadRequestError('Departamento informado está inativo.')
      }
    }

    // E-mail único em profiles (excluindo o próprio registro)
    if (email !== null && email !== profile.getString('email')) {
      try {
        e.app.findFirstRecordByFilter('profiles', `email = "${email}" && id != "${profileId}"`)
        throw new BadRequestError('Já existe um usuário com este e-mail.')
      } catch (err) {
        if (err instanceof BadRequestError) throw err
      }
      try {
        e.app.findAuthRecordByEmail('_pb_users_auth_', email)
        throw new BadRequestError('Já existe um usuário com este e-mail.')
      } catch (err) {
        if (err instanceof BadRequestError) throw err
      }
    }

    e.app.runInTransaction((txApp) => {
      // users: name, email e (opcionalmente) senha — SEM oldPassword
      const userEdit = new Record({ collection: user.collection(), id: user.id })
      if (fullName !== null) userEdit.set('name', fullName)
      if (email !== null) {
        userEdit.setEmail(email)
        userEdit.set('emailVisibility', true)
      }
      if (passwordProvided) {
        userEdit.setPassword(password)
      }
      txApp.save(userEdit)

      // profiles: active, full_name, email, role, department_id
      const profileEdit = new Record({ collection: profile.collection(), id: profile.id })
      if (fullName !== null) profileEdit.set('full_name', fullName)
      if (email !== null) profileEdit.set('email', email)
      if (role !== null) profileEdit.set('role', role)
      if (active !== null) profileEdit.set('active', active)
      if (departmentId !== null) {
        if (departmentId) {
          profileEdit.set('department_id', departmentId)
        } else {
          profileEdit.set('department_id', '')
        }
      }
      txApp.save(profileEdit)
    })

    return e.json(200, { ok: true })
  },
  $apis.requireAuth(),
)
