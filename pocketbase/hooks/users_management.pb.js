/// <reference lib="es2023" />
// Hooks PocketBase (pb_hooks) do módulo Usuários.
//
// IMPORTANTE (JSVM do PocketBase): callbacks de rota rodam em um pool de VMs
// separado — funções/constantes de top-level NÃO são visíveis dentro deles.
// Por isso, toda a lógica vive inline dentro de cada callback abaixo.
//
// Rotas (prefixo /backend/v1/):
//   POST   /backend/v1/globex/users             — cria usuário (users + profiles)
//   GET    /backend/v1/globex/users             — lista perfis (com avatar + vínculos)
//   PATCH  /backend/v1/globex/users/{id}        — atualiza usuário (senha opcional)
//   DELETE /backend/v1/globex/users/{id}        — exclui (0 vínculos) ou recusa (1+)
//   PATCH  /backend/v1/globex/users/{id}/inactive — inativa (active = false)
//   POST   /backend/v1/globex/users/{id}/avatar — upload de foto de perfil (multipart)

// =====================================================================
// POST /backend/v1/globex/users — criar usuário
// =====================================================================
routerAdd(
  'POST',
  '/backend/v1/globex/users',
  (e) => {
    const requireAdminCaller = () => {
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
        throw new ForbiddenError('Somente administradores podem gerenciar usuários.')
      }
      return callerProfile
    }
    requireAdminCaller()

    const info = e.requestInfo()
    const body = info.body || {}

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
    try {
      e.app.findAuthRecordByEmail('_pb_users_auth_', email)
      throw new BadRequestError('Já existe um usuário com este e-mail.')
    } catch (err) {
      if (err instanceof BadRequestError) throw err
    }

    const users = e.app.findCollectionByNameOrId('_pb_users_auth_')
    let createdProfileId = ''

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
      createdProfileId = profileRecord.id
    })

    return e.json(200, { ok: true, profile_id: createdProfileId })
  },
  $apis.requireAuth(),
)

// =====================================================================
// GET /backend/v1/globex/users — listar perfis
// =====================================================================
routerAdd(
  'GET',
  '/backend/v1/globex/users',
  (e) => {
    const requireAdminCaller = () => {
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
        throw new ForbiddenError('Somente administradores podem gerenciar usuários.')
      }
      return callerProfile
    }
    requireAdminCaller()

    const links = [
      { collection: 'templates', field: 'created_by' },
      { collection: 'schedules', field: 'assigned_to' },
      { collection: 'responses', field: 'operator_id' },
      { collection: 'action_plans', field: 'responsible_id' },
    ]

    const profileRecords = e.app.findRecordsByFilter('profiles', '', 'full_name', 0, 0)
    const items = profileRecords.map((p) => {
      const linkedCollections = links
        .filter((link) => {
          try {
            const found = e.app.findRecordsByFilter(
              link.collection,
              `${link.field} = "${p.id}"`,
              '',
              1,
              0,
            )
            return found && found.length > 0
          } catch (_) {
            return false
          }
        })
        .map((link) => link.collection)

      const avatar = p.getString('avatar')

      return {
        id: p.id,
        user: p.getString('user'),
        full_name: p.getString('full_name'),
        email: p.getString('email'),
        role: p.getString('role'),
        active: p.getBool('active'),
        department_id: p.getString('department_id'),
        avatar: avatar || '',
        // O campo `avatar` não é protected: URL pública padrão, sem token.
        avatar_url: avatar ? `/api/files/profiles/${p.id}/${avatar}?thumb=100x100` : '',
        has_operational_links: linkedCollections.length > 0,
        linked_collections: linkedCollections,
        created: p.getString('created'),
        updated: p.getString('updated'),
      }
    })

    return e.json(200, { items })
  },
  $apis.requireAuth(),
)

// =====================================================================
// PATCH /backend/v1/globex/users/{id} — atualizar usuário
// =====================================================================
// Correção do bug "Não deixou salvar a foto" (PATCH 500 em runtime): editar
// os registros buscados (findRecordById) direto, SEM recriar o Record com
// `new Record({...})` — o construtor da JSVM só aceita uma Collection, e um
// objeto literal { collection, id } derrubava a rota com erro 500.
routerAdd(
  'PATCH',
  '/backend/v1/globex/users/{id}',
  (e) => {
    const requireAdminCaller = () => {
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
        throw new ForbiddenError('Somente administradores podem gerenciar usuários.')
      }
      return callerProfile
    }
    requireAdminCaller()

    const info = e.requestInfo()
    const body = info.body || {}
    const profileId = e.request.pathValue('id')

    let profile
    try {
      profile = e.app.findRecordById('profiles', profileId)
    } catch (_) {
      throw new NotFoundError('Usuário não encontrado.')
    }

    let user
    try {
      user = e.app.findRecordById('_pb_users_auth_', profile.getString('user'))
    } catch (_) {
      throw new NotFoundError('Registro de acesso não encontrado para este perfil.')
    }

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

    let passwordProvided = false
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
      // users: name, email e (opcionalmente) senha — SEM oldPassword.
      // user/profile são os registros JÁ buscados (findRecordById): o update
      // aplica somente os campos enviados, preservando o restante do registro.
      if (fullName !== null) user.set('name', fullName)
      if (email !== null) {
        user.setEmail(email)
        user.set('emailVisibility', true)
      }
      if (passwordProvided) {
        user.setPassword(password)
      }
      txApp.save(user)

      // profiles: active, full_name, email, role, department_id
      if (fullName !== null) profile.set('full_name', fullName)
      if (email !== null) profile.set('email', email)
      if (role !== null) profile.set('role', role)
      if (active !== null) profile.set('active', active)
      if (departmentId !== null) {
        profile.set('department_id', departmentId) // '' limpa o vínculo
      }
      txApp.save(profile)
    })

    return e.json(200, { ok: true })
  },
  $apis.requireAuth(),
)

// =====================================================================
// DELETE /backend/v1/globex/users/{id} — exclusão condicional
// =====================================================================
// Cenário A (0 vínculos operacionais): exclui profile + conta users, em
//   transaction (admin pode excluir qualquer conta sem oldPassword).
// Cenário B (1+ vínculos): recusa com o motivo — o frontend oferece
//   "Inativar Usuário" em vez de excluir.
routerAdd(
  'DELETE',
  '/backend/v1/globex/users/{id}',
  (e) => {
    const requireAdminCaller = () => {
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
        throw new ForbiddenError('Somente administradores podem gerenciar usuários.')
      }
      return callerProfile
    }
    requireAdminCaller()

    const profileId = e.request.pathValue('id')

    let profile
    try {
      profile = e.app.findRecordById('profiles', profileId)
    } catch (_) {
      throw new NotFoundError('Usuário não encontrado.')
    }

    // Proteção: o admin não pode excluir a própria conta em uso.
    if (profile.getString('user') === e.auth.id) {
      throw new BadRequestError('Você não pode excluir a sua própria conta.')
    }

    const links = [
      { collection: 'templates', field: 'created_by' },
      { collection: 'schedules', field: 'assigned_to' },
      { collection: 'responses', field: 'operator_id' },
      { collection: 'action_plans', field: 'responsible_id' },
    ]

    let linked = 0
    for (const link of links) {
      try {
        const found = e.app.findRecordsByFilter(
          link.collection,
          `${link.field} = "${profileId}"`,
          '',
          1,
          0,
        )
        if (found && found.length > 0) linked++
      } catch (err) {
        console.log(`users_management: falha ao verificar ${link.collection}: ${err}`)
      }
    }

    if (linked > 0) {
      throw new BadRequestError(
        'Este usuário possui histórico operacional vinculado e não pode ser excluído por segurança de auditoria. Utilize a opção de Inativar.',
      )
    }

    const userId = profile.getString('user')

    e.app.runInTransaction((txApp) => {
      // Remove o profile primeiro; a conta auth depois.
      try {
        txApp.delete(txApp.findRecordById('profiles', profileId))
      } catch (_) {
        throw new NotFoundError('Usuário não encontrado.')
      }
      try {
        txApp.delete(txApp.findRecordById('_pb_users_auth_', userId))
      } catch (_) {
        // Perfil sem conta correspondente: nada a remover.
      }
    })

    return e.json(200, { ok: true })
  },
  $apis.requireAuth(),
)

// =====================================================================
// PATCH /backend/v1/globex/users/{id}/inactive — inativação
// =====================================================================
// Define active = false (sem excluir nada). Rota separada para o botão
// "Inativar Usuário" funcionar com um clique.
routerAdd(
  'PATCH',
  '/backend/v1/globex/users/{id}/inactive',
  (e) => {
    const requireAdminCaller = () => {
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
        throw new ForbiddenError('Somente administradores podem gerenciar usuários.')
      }
      return callerProfile
    }
    requireAdminCaller()

    const profileId = e.request.pathValue('id')

    let profile
    try {
      profile = e.app.findRecordById('profiles', profileId)
    } catch (_) {
      throw new NotFoundError('Usuário não encontrado.')
    }

    if (profile.getString('user') === e.auth.id) {
      throw new BadRequestError('Você não pode inativar a sua própria conta.')
    }

    profile.set('active', false)
    e.app.save(profile)

    return e.json(200, { ok: true })
  },
  $apis.requireAuth(),
)

// =====================================================================
// POST /backend/v1/globex/users/{id}/avatar — upload de foto de perfil
// =====================================================================
// multipart/form-data com campo "avatar" (PNG/JPG/WEBP, até 5 MB).
//
// Correção do bug "Não deixou salvar a foto": filesystem.File não expõe a
// propriedade `type` (apenas name/originalName/reader/size) — a checagem
// anterior files[0].type rejeitava TODOS os uploads com "Formato inválido"
// (contentType sempre ""). Aqui o Content-Type vem do header multipart e
// mimeTypes do campo `avatar` da coleção validam de fato na gravação.
routerAdd(
  'POST',
  '/backend/v1/globex/users/{id}/avatar',
  (e) => {
    const requireAdminCaller = () => {
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
        throw new ForbiddenError('Somente administradores podem gerenciar usuários.')
      }
      return callerProfile
    }
    requireAdminCaller()

    const profileId = e.request.pathValue('id')

    let profile
    try {
      profile = e.app.findRecordById('profiles', profileId)
    } catch (_) {
      throw new NotFoundError('Usuário não encontrado.')
    }

    let files
    try {
      files = e.findUploadedFiles('avatar')
    } catch (_) {
      files = []
    }
    if (!files || files.length === 0) {
      throw new BadRequestError('Nenhuma imagem enviada (campo "avatar").')
    }

    // Tamanho: o campo file já limita a 5 MB na gravação, mas a mensagem
    // fica mais clara validando aqui pelo size do filesystem.File.
    if (files[0].size > 5242880) {
      throw new BadRequestError('A imagem deve ter no máximo 5 MB.')
    }

    profile.set('avatar', files[0])
    e.app.save(profile)

    const savedAvatar = profile.getString('avatar')
    if (!savedAvatar) {
      throw new BadRequestError(
        'Não foi possível salvar a imagem. Verifique o formato (PNG, JPG ou WEBP) e o tamanho máximo de 5 MB.',
      )
    }

    return e.json(200, {
      ok: true,
      avatar: savedAvatar,
      // O campo `avatar` não é protected: a URL pública padrão serve o
      // arquivo sem token (mesma forma usada pelo frontend em avatarUrl()).
      avatar_url: `/api/files/profiles/${profileId}/${savedAvatar}?thumb=100x100`,
    })
  },
  $apis.requireAuth(),
)
