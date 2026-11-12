/// <reference lib="es2023" />
// Hooks PocketBase (pb_hooks) do módulo de Cadastros Mestres.
//
// IMPORTANTE (JSVM do PocketBase): callbacks de rota rodam em um pool de VMs
// separado — funções/constantes de top-level NÃO são visíveis dentro deles.
// Por isso, toda a lógica (inclusive o requireAdminCaller) vive inline dentro
// de cada callback, no mesmo padrão de forms_management.pb.js.
//
// Rotas (prefixo /backend/v1/, todas com checagem de admin no hook):
//   GET    /backend/v1/globex/master-data/entities            — lista entidades
//   POST   /backend/v1/globex/master-data/entities            — cria entidade
//   PATCH  /backend/v1/globex/master-data/entities/{id}       — atualiza entidade
//   DELETE /backend/v1/globex/master-data/entities/{id}       — exclui entidade
//          (recusado quando referenciada no JSON blocks de algum template,
//           quando tem itens ou quando o nome casa com uma entidade legada)
//   GET    /backend/v1/globex/master-data/entities/{id}/entries — lista itens
//   POST   /backend/v1/globex/master-data/entries             — cria item
//   PATCH  /backend/v1/globex/master-data/entries/{id}        — atualiza item
//   DELETE /backend/v1/globex/master-data/entries/{id}        — exclui item

// =====================================================================
// GET /backend/v1/globex/master-data/entities — listar entidades
// =====================================================================
routerAdd(
  'GET',
  '/backend/v1/globex/master-data/entities',
  (e) => {
    const requireAdminCaller = () => {
      if (!e.auth || !e.auth.id) throw new UnauthorizedError('Sessão não autenticada.')
      let callerProfile
      try {
        callerProfile = e.app.findFirstRecordByFilter('profiles', `user = "${e.auth.id}"`)
      } catch (_) {
        throw new ForbiddenError('Perfil não encontrado para o usuário autenticado.')
      }
      if (callerProfile.getString('role') !== 'admin' || !callerProfile.getBool('active')) {
        throw new ForbiddenError('Somente administradores podem gerenciar cadastros mestres.')
      }
      return callerProfile
    }
    requireAdminCaller()

    const records = e.app.findRecordsByFilter('entity_definitions', '', 'name', 0, 0)
    const items = records.map((r) => ({
      id: r.id,
      name: r.getString('name'),
      description: r.getString('description'),
      active: r.getBool('active'),
      created: r.getString('created'),
      updated: r.getString('updated'),
    }))
    return e.json(200, { items })
  },
  $apis.requireAuth(),
)

// =====================================================================
// POST /backend/v1/globex/master-data/entities — criar entidade
// =====================================================================
routerAdd(
  'POST',
  '/backend/v1/globex/master-data/entities',
  (e) => {
    const requireAdminCaller = () => {
      if (!e.auth || !e.auth.id) throw new UnauthorizedError('Sessão não autenticada.')
      let callerProfile
      try {
        callerProfile = e.app.findFirstRecordByFilter('profiles', `user = "${e.auth.id}"`)
      } catch (_) {
        throw new ForbiddenError('Perfil não encontrado para o usuário autenticado.')
      }
      if (callerProfile.getString('role') !== 'admin' || !callerProfile.getBool('active')) {
        throw new ForbiddenError('Somente administradores podem gerenciar cadastros mestres.')
      }
      return callerProfile
    }
    requireAdminCaller()

    const body = e.requestInfo().body || {}
    const name = String(body.name || '').trim()
    const description = String(body.description || '').trim()
    const active = body.active === undefined ? true : !!body.active

    if (!name) throw new BadRequestError('Informe o nome da entidade.')

    // Nome único (checagem manual dá mensagem mais clara que o índice UNIQUE,
    // que continua como garantia).
    try {
      e.app.findFirstRecordByFilter('entity_definitions', `name = "${name}"`)
      throw new BadRequestError('Já existe uma entidade com este nome.')
    } catch (err) {
      if (err instanceof BadRequestError) throw err
    }

    const collection = e.app.findCollectionByNameOrId('entity_definitions')
    const record = new Record(collection)
    record.set('name', name)
    if (description) record.set('description', description)
    record.set('active', active)
    e.app.save(record)

    return e.json(200, { ok: true, id: record.id })
  },
  $apis.requireAuth(),
)

// =====================================================================
// PATCH /backend/v1/globex/master-data/entities/{id} — atualizar entidade
// =====================================================================
routerAdd(
  'PATCH',
  '/backend/v1/globex/master-data/entities/{id}',
  (e) => {
    const requireAdminCaller = () => {
      if (!e.auth || !e.auth.id) throw new UnauthorizedError('Sessão não autenticada.')
      let callerProfile
      try {
        callerProfile = e.app.findFirstRecordByFilter('profiles', `user = "${e.auth.id}"`)
      } catch (_) {
        throw new ForbiddenError('Perfil não encontrado para o usuário autenticado.')
      }
      if (callerProfile.getString('role') !== 'admin' || !callerProfile.getBool('active')) {
        throw new ForbiddenError('Somente administradores podem gerenciar cadastros mestres.')
      }
      return callerProfile
    }
    requireAdminCaller()

    const entityId = e.request.pathValue('id')
    const body = e.requestInfo().body || {}

    let entity
    try {
      entity = e.app.findRecordById('entity_definitions', entityId)
    } catch (_) {
      throw new NotFoundError('Entidade não encontrada.')
    }

    if (body.name !== undefined) {
      const name = String(body.name || '').trim()
      if (!name) throw new BadRequestError('Informe o nome da entidade.')
      if (name !== entity.getString('name')) {
        try {
          e.app.findFirstRecordByFilter(
            'entity_definitions',
            `name = "${name}" && id != "${entityId}"`,
          )
          throw new BadRequestError('Já existe uma entidade com este nome.')
        } catch (err) {
          if (err instanceof BadRequestError) throw err
        }
      }
      entity.set('name', name)
    }
    if (body.description !== undefined)
      entity.set('description', String(body.description || '').trim())
    if (body.active !== undefined) entity.set('active', !!body.active)

    e.app.save(entity)
    return e.json(200, { ok: true })
  },
  $apis.requireAuth(),
)

// =====================================================================
// DELETE /backend/v1/globex/master-data/entities/{id} — excluir entidade
// =====================================================================
// Recusado quando: há itens vinculados, o nome casa com uma entidade legada
// ('transportadora'/'veiculo'/'doca' no JSON blocks de templates antigos) ou
// algum template referencia o id no JSON blocks.
routerAdd(
  'DELETE',
  '/backend/v1/globex/master-data/entities/{id}',
  (e) => {
    const requireAdminCaller = () => {
      if (!e.auth || !e.auth.id) throw new UnauthorizedError('Sessão não autenticada.')
      let callerProfile
      try {
        callerProfile = e.app.findFirstRecordByFilter('profiles', `user = "${e.auth.id}"`)
      } catch (_) {
        throw new ForbiddenError('Perfil não encontrado para o usuário autenticado.')
      }
      if (callerProfile.getString('role') !== 'admin' || !callerProfile.getBool('active')) {
        throw new ForbiddenError('Somente administradores podem gerenciar cadastros mestres.')
      }
      return callerProfile
    }
    requireAdminCaller()

    const entityId = e.request.pathValue('id')

    let entity
    try {
      entity = e.app.findRecordById('entity_definitions', entityId)
    } catch (_) {
      throw new NotFoundError('Entidade não encontrada.')
    }

    // Entidades legadas: templates antigos guardam o slug minúsculo no JSON
    // blocks — excluir a entidade de mesmo nome quebraria a referência.
    const LEGACY_SLUGS = [
      'transportadora',
      'transportadoras',
      'veiculo',
      'veiculos',
      'doca',
      'docas',
    ]
    const name = entity.getString('name')
    const nameSlug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    const isLegacy = LEGACY_SLUGS.indexOf(nameSlug) !== -1

    const linkedEntries = e.app.findRecordsByFilter(
      'master_data_entries',
      `entity_id = "${entityId}"`,
      '',
      1,
      0,
    )
    if (linkedEntries && linkedEntries.length > 0) {
      throw new BadRequestError(
        'Esta entidade possui itens cadastrados e não pode ser excluída. Inative-a em vez de excluir.',
      )
    }
    if (isLegacy) {
      throw new BadRequestError(
        'Esta entidade é referenciada por formulários existentes e não pode ser excluída. Inative-a em vez de excluir.',
      )
    }

    // Referência no JSON blocks de templates: o campo master_data guarda o id
    // da entidade em field.entity. Varredura textual no JSON bruto (barato e
    // cobre também usos legados por nome).
    const templates = e.app.findRecordsByFilter('templates', '', '', 0, 0)
    for (const t of templates) {
      const raw = t.getString('blocks')
      if (!raw) continue
      if (raw.indexOf(entityId) !== -1 || raw.indexOf('"' + name + '"') !== -1) {
        throw new BadRequestError(
          'Esta entidade é referenciada por formulários existentes e não pode ser excluída. Inative-a em vez de excluir.',
        )
      }
    }

    e.app.delete(entity)
    return e.json(200, { ok: true })
  },
  $apis.requireAuth(),
)

// =====================================================================
// GET /backend/v1/globex/master-data/entities/{id}/entries — listar itens
// =====================================================================
routerAdd(
  'GET',
  '/backend/v1/globex/master-data/entities/{id}/entries',
  (e) => {
    const requireAdminCaller = () => {
      if (!e.auth || !e.auth.id) throw new UnauthorizedError('Sessão não autenticada.')
      let callerProfile
      try {
        callerProfile = e.app.findFirstRecordByFilter('profiles', `user = "${e.auth.id}"`)
      } catch (_) {
        throw new ForbiddenError('Perfil não encontrado para o usuário autenticado.')
      }
      if (callerProfile.getString('role') !== 'admin' || !callerProfile.getBool('active')) {
        throw new ForbiddenError('Somente administradores podem gerenciar cadastros mestres.')
      }
      return callerProfile
    }
    requireAdminCaller()

    const entityId = e.request.pathValue('id')
    try {
      e.app.findRecordById('entity_definitions', entityId)
    } catch (_) {
      throw new NotFoundError('Entidade não encontrada.')
    }

    const records = e.app.findRecordsByFilter(
      'master_data_entries',
      `entity_id = "${entityId}"`,
      'value',
      0,
      0,
    )
    const items = records.map((r) => ({
      id: r.id,
      entity_id: r.getString('entity_id'),
      value: r.getString('value'),
      description: r.getString('description'),
      active: r.getBool('active'),
      created: r.getString('created'),
      updated: r.getString('updated'),
    }))
    return e.json(200, { items })
  },
  $apis.requireAuth(),
)

// =====================================================================
// POST /backend/v1/globex/master-data/entries — criar item
// =====================================================================
routerAdd(
  'POST',
  '/backend/v1/globex/master-data/entries',
  (e) => {
    const requireAdminCaller = () => {
      if (!e.auth || !e.auth.id) throw new UnauthorizedError('Sessão não autenticada.')
      let callerProfile
      try {
        callerProfile = e.app.findFirstRecordByFilter('profiles', `user = "${e.auth.id}"`)
      } catch (_) {
        throw new ForbiddenError('Perfil não encontrado para o usuário autenticado.')
      }
      if (callerProfile.getString('role') !== 'admin' || !callerProfile.getBool('active')) {
        throw new ForbiddenError('Somente administradores podem gerenciar cadastros mestres.')
      }
      return callerProfile
    }
    requireAdminCaller()

    const body = e.requestInfo().body || {}
    const entityId = String(body.entity_id || '').trim()
    const value = String(body.value || '').trim()
    const description = String(body.description || '').trim()
    const active = body.active === undefined ? true : !!body.active

    if (!entityId) throw new BadRequestError('Informe a entidade do item.')
    if (!value) throw new BadRequestError('Informe o valor do item.')

    try {
      e.app.findRecordById('entity_definitions', entityId)
    } catch (_) {
      throw new BadRequestError('Entidade informada não existe.')
    }

    try {
      e.app.findFirstRecordByFilter(
        'master_data_entries',
        `entity_id = "${entityId}" && value = "${value}"`,
      )
      throw new BadRequestError('Já existe um item com este valor nesta entidade.')
    } catch (err) {
      if (err instanceof BadRequestError) throw err
    }

    const collection = e.app.findCollectionByNameOrId('master_data_entries')
    const record = new Record(collection)
    record.set('entity_id', entityId)
    record.set('value', value)
    if (description) record.set('description', description)
    record.set('active', active)
    e.app.save(record)

    return e.json(200, { ok: true, id: record.id })
  },
  $apis.requireAuth(),
)

// =====================================================================
// PATCH /backend/v1/globex/master-data/entries/{id} — atualizar item
// =====================================================================
routerAdd(
  'PATCH',
  '/backend/v1/globex/master-data/entries/{id}',
  (e) => {
    const requireAdminCaller = () => {
      if (!e.auth || !e.auth.id) throw new UnauthorizedError('Sessão não autenticada.')
      let callerProfile
      try {
        callerProfile = e.app.findFirstRecordByFilter('profiles', `user = "${e.auth.id}"`)
      } catch (_) {
        throw new ForbiddenError('Perfil não encontrado para o usuário autenticado.')
      }
      if (callerProfile.getString('role') !== 'admin' || !callerProfile.getBool('active')) {
        throw new ForbiddenError('Somente administradores podem gerenciar cadastros mestres.')
      }
      return callerProfile
    }
    requireAdminCaller()

    const entryId = e.request.pathValue('id')
    const body = e.requestInfo().body || {}

    let entry
    try {
      entry = e.app.findRecordById('master_data_entries', entryId)
    } catch (_) {
      throw new NotFoundError('Item não encontrado.')
    }

    if (body.value !== undefined) {
      const value = String(body.value || '').trim()
      if (!value) throw new BadRequestError('Informe o valor do item.')
      if (value !== entry.getString('value')) {
        try {
          e.app.findFirstRecordByFilter(
            'master_data_entries',
            `entity_id = "${entry.getString('entity_id')}" && value = "${value}" && id != "${entryId}"`,
          )
          throw new BadRequestError('Já existe um item com este valor nesta entidade.')
        } catch (err) {
          if (err instanceof BadRequestError) throw err
        }
      }
      entry.set('value', value)
    }
    if (body.description !== undefined)
      entry.set('description', String(body.description || '').trim())
    if (body.active !== undefined) entry.set('active', !!body.active)
    if (body.extra !== undefined) {
      // extra é um json opcional; grava apenas quando for objeto/valor válido.
      try {
        const extra = body.extra
        if (extra === null) {
          entry.set('extra', null)
        } else if (typeof extra === 'object') {
          entry.set('extra', JSON.stringify(extra))
        }
      } catch (_) {
        // ignora payload extra inválido
      }
    }

    e.app.save(entry)
    return e.json(200, { ok: true })
  },
  $apis.requireAuth(),
)

// =====================================================================
// DELETE /backend/v1/globex/master-data/entries/{id} — excluir item
// =====================================================================
routerAdd(
  'DELETE',
  '/backend/v1/globex/master-data/entries/{id}',
  (e) => {
    const requireAdminCaller = () => {
      if (!e.auth || !e.auth.id) throw new UnauthorizedError('Sessão não autenticada.')
      let callerProfile
      try {
        callerProfile = e.app.findFirstRecordByFilter('profiles', `user = "${e.auth.id}"`)
      } catch (_) {
        throw new ForbiddenError('Perfil não encontrado para o usuário autenticado.')
      }
      if (callerProfile.getString('role') !== 'admin' || !callerProfile.getBool('active')) {
        throw new ForbiddenError('Somente administradores podem gerenciar cadastros mestres.')
      }
      return callerProfile
    }
    requireAdminCaller()

    const entryId = e.request.pathValue('id')

    let entry
    try {
      entry = e.app.findRecordById('master_data_entries', entryId)
    } catch (_) {
      throw new NotFoundError('Item não encontrado.')
    }

    e.app.delete(entry)
    return e.json(200, { ok: true })
  },
  $apis.requireAuth(),
)
