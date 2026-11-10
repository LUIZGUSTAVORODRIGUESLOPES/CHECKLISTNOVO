/// <reference lib="es2023" />
// Hooks PocketBase (pb_hooks) do módulo Formulários e Construtor de Checklists.
//
// IMPORTANTE (JSVM do PocketBase): callbacks de rota rodam em um pool de VMs
// separado — funções/constantes de top-level NÃO são visíveis dentro deles.
// Por isso, toda a lógica vive inline dentro de cada callback abaixo.
//
// Rotas (prefixo /backend/v1/, todas com checagem de admin no hook):
//   GET    /backend/v1/globex/subjects            — lista assuntos
//   POST   /backend/v1/globex/subjects            — cria assunto
//   PATCH  /backend/v1/globex/subjects/{id}       — atualiza assunto
//   DELETE /backend/v1/globex/subjects/{id}       — exclui assunto (0 templates)
//   GET    /backend/v1/globex/templates           — lista templates + contagem de respostas
//   POST   /backend/v1/globex/templates           — cria template
//   GET    /backend/v1/globex/templates/{id}      — detalhe + responses_count
//   PATCH  /backend/v1/globex/templates/{id}      — atualiza template
//   DELETE /backend/v1/globex/templates/{id}      — exclui template (0 respostas)
//   GET    /backend/v1/globex/templates/{id}/responses-count — contagem de respostas

// =====================================================================
// Helpers compartilhados (inline — cada callback redeclara; veja nota acima)
// =====================================================================
// requireAdminCaller: auth + perfil ativo com role 'admin' em profiles.

// =====================================================================
// GET /backend/v1/globex/subjects — listar assuntos
// =====================================================================
routerAdd(
  'GET',
  '/backend/v1/globex/subjects',
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
        throw new ForbiddenError('Somente administradores podem gerenciar formulários.')
      }
      return callerProfile
    }
    requireAdminCaller()

    const records = e.app.findRecordsByFilter('subjects', '', 'name', 0, 0)
    const items = records.map((s) => ({
      id: s.id,
      name: s.getString('name'),
      description: s.getString('description'),
      department_id: s.getString('department_id'),
      active: s.getBool('active'),
      created: s.getString('created'),
      updated: s.getString('updated'),
    }))
    return e.json(200, { items })
  },
  $apis.requireAuth(),
)

// =====================================================================
// POST /backend/v1/globex/subjects — criar assunto
// =====================================================================
routerAdd(
  'POST',
  '/backend/v1/globex/subjects',
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
        throw new ForbiddenError('Somente administradores podem gerenciar formulários.')
      }
      return callerProfile
    }
    requireAdminCaller()

    const body = e.requestInfo().body || {}
    const name = String(body.name || '').trim()
    const description = String(body.description || '').trim()
    const active = body.active === undefined ? true : !!body.active
    const departmentId = body.department_id ? String(body.department_id) : ''

    if (!name) throw new BadRequestError('Informe o nome do assunto.')

    if (departmentId) {
      try {
        e.app.findRecordById('departments', departmentId)
      } catch (_) {
        throw new BadRequestError('Departamento informado não existe.')
      }
    }

    // Nome único em subjects (a checagem manual dá mensagem mais clara que o
    // índice UNIQUE, mas o índice continua como garantia).
    try {
      e.app.findFirstRecordByFilter('subjects', `name = "${name}"`)
      throw new BadRequestError('Já existe um assunto com este nome.')
    } catch (err) {
      if (err instanceof BadRequestError) throw err
    }

    const subjects = e.app.findCollectionByNameOrId('subjects')
    const record = new Record(subjects)
    record.set('name', name)
    if (description) record.set('description', description)
    if (departmentId) record.set('department_id', departmentId)
    record.set('active', active)
    e.app.save(record)

    return e.json(200, { ok: true, id: record.id })
  },
  $apis.requireAuth(),
)

// =====================================================================
// PATCH /backend/v1/globex/subjects/{id} — atualizar assunto
// =====================================================================
routerAdd(
  'PATCH',
  '/backend/v1/globex/subjects/{id}',
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
        throw new ForbiddenError('Somente administradores podem gerenciar formulários.')
      }
      return callerProfile
    }
    requireAdminCaller()

    const subjectId = e.request.pathValue('id')
    const body = e.requestInfo().body || {}

    let subject
    try {
      subject = e.app.findRecordById('subjects', subjectId)
    } catch (_) {
      throw new NotFoundError('Assunto não encontrado.')
    }

    if (body.name !== undefined) {
      const name = String(body.name || '').trim()
      if (!name) throw new BadRequestError('Informe o nome do assunto.')
      if (name !== subject.getString('name')) {
        try {
          e.app.findFirstRecordByFilter('subjects', `name = "${name}" && id != "${subjectId}"`)
          throw new BadRequestError('Já existe um assunto com este nome.')
        } catch (err) {
          if (err instanceof BadRequestError) throw err
        }
      }
      subject.set('name', name)
    }
    if (body.description !== undefined)
      subject.set('description', String(body.description || '').trim())
    if (body.active !== undefined) subject.set('active', !!body.active)
    if (body.department_id !== undefined) {
      const departmentId = body.department_id ? String(body.department_id) : ''
      if (departmentId) {
        try {
          e.app.findRecordById('departments', departmentId)
        } catch (_) {
          throw new BadRequestError('Departamento informado não existe.')
        }
      }
      subject.set('department_id', departmentId)
    }

    e.app.save(subject)
    return e.json(200, { ok: true })
  },
  $apis.requireAuth(),
)

// =====================================================================
// DELETE /backend/v1/globex/subjects/{id} — excluir assunto
// =====================================================================
// Recusa quando há templates vinculados (proteção referencial).
routerAdd(
  'DELETE',
  '/backend/v1/globex/subjects/{id}',
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
        throw new ForbiddenError('Somente administradores podem gerenciar formulários.')
      }
      return callerProfile
    }
    requireAdminCaller()

    const subjectId = e.request.pathValue('id')

    let subject
    try {
      subject = e.app.findRecordById('subjects', subjectId)
    } catch (_) {
      throw new NotFoundError('Assunto não encontrado.')
    }

    const linked = e.app.findRecordsByFilter('templates', `subject_id = "${subjectId}"`, '', 1, 0)
    if (linked && linked.length > 0) {
      throw new BadRequestError(
        'Este assunto possui formulários vinculados e não pode ser excluído. Inative-o em vez de excluir.',
      )
    }

    e.app.delete(subject)
    return e.json(200, { ok: true })
  },
  $apis.requireAuth(),
)

// =====================================================================
// GET /backend/v1/globex/templates — listar templates com contagem de respostas
// =====================================================================
routerAdd(
  'GET',
  '/backend/v1/globex/templates',
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
        throw new ForbiddenError('Somente administradores podem gerenciar formulários.')
      }
      return callerProfile
    }
    requireAdminCaller()

    const records = e.app.findRecordsByFilter('templates', '', '-created', 0, 0)
    const items = records.map((t) => {
      let responsesCount = 0
      try {
        responsesCount = e.app.countRecords('responses', `template_id = "${t.id}"`)
      } catch (_) {
        responsesCount = 0
      }
      return {
        id: t.id,
        name: t.getString('name'),
        description: t.getString('description'),
        department_id: t.getString('department_id'),
        subject_id: t.getString('subject_id'),
        blocks: t.get('blocks'),
        active: t.getBool('active'),
        created_by: t.getString('created_by'),
        responses_count: responsesCount,
        created: t.getString('created'),
        updated: t.getString('updated'),
      }
    })
    return e.json(200, { items })
  },
  $apis.requireAuth(),
)

// =====================================================================
// POST /backend/v1/globex/templates — criar template
// =====================================================================
// created_by é SEMPRE o perfil do admin logado (nunca aceito do corpo).
routerAdd(
  'POST',
  '/backend/v1/globex/templates',
  (e) => {
    const callerProfile = (() => {
      if (!e.auth || !e.auth.id) throw new UnauthorizedError('Sessão não autenticada.')
      let p
      try {
        p = e.app.findFirstRecordByFilter('profiles', `user = "${e.auth.id}"`)
      } catch (_) {
        throw new ForbiddenError('Perfil não encontrado para o usuário autenticado.')
      }
      if (p.getString('role') !== 'admin' || !p.getBool('active')) {
        throw new ForbiddenError('Somente administradores podem gerenciar formulários.')
      }
      return p
    })()

    const body = e.requestInfo().body || {}
    const name = String(body.name || '').trim()
    if (!name) throw new BadRequestError('Informe o nome do formulário.')

    const blocks = body.blocks === undefined || body.blocks === null ? [] : body.blocks
    if (!Array.isArray(blocks)) {
      throw new BadRequestError('Estrutura de blocos inválida: esperado um array de blocos.')
    }

    const departmentId = body.department_id ? String(body.department_id) : ''
    const subjectId = body.subject_id ? String(body.subject_id) : ''
    if (departmentId) {
      try {
        e.app.findRecordById('departments', departmentId)
      } catch (_) {
        throw new BadRequestError('Departamento informado não existe.')
      }
    }
    if (subjectId) {
      try {
        e.app.findRecordById('subjects', subjectId)
      } catch (_) {
        throw new BadRequestError('Assunto informado não existe.')
      }
    }

    const templates = e.app.findCollectionByNameOrId('templates')
    const record = new Record(templates)
    record.set('name', name)
    if (body.description !== undefined)
      record.set('description', String(body.description || '').trim())
    if (departmentId) record.set('department_id', departmentId)
    if (subjectId) record.set('subject_id', subjectId)
    record.set('blocks', JSON.stringify(blocks))
    record.set('active', body.active === undefined ? true : !!body.active)
    record.set('created_by', callerProfile.id)
    e.app.save(record)

    return e.json(200, { ok: true, id: record.id, responses_count: 0 })
  },
  $apis.requireAuth(),
)

// =====================================================================
// GET /backend/v1/globex/templates/{id} — detalhe do template
// =====================================================================
// Retorna o template + responses_count para o modo de edição segura.
routerAdd(
  'GET',
  '/backend/v1/globex/templates/{id}',
  (e) => {
    const requireAdminCaller = () => {
      if (!e.auth || !e.auth.id) throw new UnauthorizedError('Sessão não autenticada.')
      let p
      try {
        p = e.app.findFirstRecordByFilter('profiles', `user = "${e.auth.id}"`)
      } catch (_) {
        throw new ForbiddenError('Perfil não encontrado para o usuário autenticado.')
      }
      if (p.getString('role') !== 'admin' || !p.getBool('active')) {
        throw new ForbiddenError('Somente administradores podem gerenciar formulários.')
      }
      return p
    }
    requireAdminCaller()

    const templateId = e.request.pathValue('id')
    let t
    try {
      t = e.app.findRecordById('templates', templateId)
    } catch (_) {
      throw new NotFoundError('Formulário não encontrado.')
    }

    let responsesCount = 0
    try {
      responsesCount = e.app.countRecords('responses', `template_id = "${templateId}"`)
    } catch (_) {
      responsesCount = 0
    }

    let blocks = []
    try {
      const raw = t.getString('blocks')
      blocks = raw ? JSON.parse(raw) : []
    } catch (_) {
      blocks = []
    }

    return e.json(200, {
      id: t.id,
      name: t.getString('name'),
      description: t.getString('description'),
      department_id: t.getString('department_id'),
      subject_id: t.getString('subject_id'),
      blocks,
      active: t.getBool('active'),
      created_by: t.getString('created_by'),
      responses_count: responsesCount,
      created: t.getString('created'),
      updated: t.getString('updated'),
    })
  },
  $apis.requireAuth(),
)

// =====================================================================
// PATCH /backend/v1/globex/templates/{id} — atualizar template
// =====================================================================
// created_by NUNCA muda por aqui. Bloqueia zerar a contagem de respostas
// (nenhum campo afeta o histórico; o frontend protege o Tipo de Campo).
routerAdd(
  'PATCH',
  '/backend/v1/globex/templates/{id}',
  (e) => {
    const requireAdminCaller = () => {
      if (!e.auth || !e.auth.id) throw new UnauthorizedError('Sessão não autenticada.')
      let p
      try {
        p = e.app.findFirstRecordByFilter('profiles', `user = "${e.auth.id}"`)
      } catch (_) {
        throw new ForbiddenError('Perfil não encontrado para o usuário autenticado.')
      }
      if (p.getString('role') !== 'admin' || !p.getBool('active')) {
        throw new ForbiddenError('Somente administradores podem gerenciar formulários.')
      }
      return p
    }
    requireAdminCaller()

    const templateId = e.request.pathValue('id')
    const body = e.requestInfo().body || {}

    let template
    try {
      template = e.app.findRecordById('templates', templateId)
    } catch (_) {
      throw new NotFoundError('Formulário não encontrado.')
    }

    if (body.name !== undefined) {
      const name = String(body.name || '').trim()
      if (!name) throw new BadRequestError('Informe o nome do formulário.')
      template.set('name', name)
    }
    if (body.description !== undefined) {
      template.set('description', String(body.description || '').trim())
    }
    if (body.active !== undefined) template.set('active', !!body.active)

    if (body.department_id !== undefined) {
      const departmentId = body.department_id ? String(body.department_id) : ''
      if (departmentId) {
        try {
          e.app.findRecordById('departments', departmentId)
        } catch (_) {
          throw new BadRequestError('Departamento informado não existe.')
        }
      }
      template.set('department_id', departmentId)
    }
    if (body.subject_id !== undefined) {
      const subjectId = body.subject_id ? String(body.subject_id) : ''
      if (subjectId) {
        try {
          e.app.findRecordById('subjects', subjectId)
        } catch (_) {
          throw new BadRequestError('Assunto informado não existe.')
        }
      }
      template.set('subject_id', subjectId)
    }

    if (body.blocks !== undefined) {
      const blocks = body.blocks
      if (!Array.isArray(blocks)) {
        throw new BadRequestError('Estrutura de blocos inválida: esperado um array de blocos.')
      }
      template.set('blocks', JSON.stringify(blocks))
    }

    e.app.save(template)

    let responsesCount = 0
    try {
      responsesCount = e.app.countRecords('responses', `template_id = "${templateId}"`)
    } catch (_) {
      responsesCount = 0
    }

    return e.json(200, { ok: true, responses_count: responsesCount })
  },
  $apis.requireAuth(),
)

// =====================================================================
// DELETE /backend/v1/globex/templates/{id} — excluir template
// =====================================================================
// Recusa quando há respostas vinculadas (proteção de auditoria).
routerAdd(
  'DELETE',
  '/backend/v1/globex/templates/{id}',
  (e) => {
    const requireAdminCaller = () => {
      if (!e.auth || !e.auth.id) throw new UnauthorizedError('Sessão não autenticada.')
      let p
      try {
        p = e.app.findFirstRecordByFilter('profiles', `user = "${e.auth.id}"`)
      } catch (_) {
        throw new ForbiddenError('Perfil não encontrado para o usuário autenticado.')
      }
      if (p.getString('role') !== 'admin' || !p.getBool('active')) {
        throw new ForbiddenError('Somente administradores podem gerenciar formulários.')
      }
      return p
    }
    requireAdminCaller()

    const templateId = e.request.pathValue('id')

    let template
    try {
      template = e.app.findRecordById('templates', templateId)
    } catch (_) {
      throw new NotFoundError('Formulário não encontrado.')
    }

    let responsesCount = 0
    try {
      responsesCount = e.app.countRecords('responses', `template_id = "${templateId}"`)
    } catch (_) {
      responsesCount = 0
    }
    if (responsesCount > 0) {
      throw new BadRequestError(
        'Este formulário possui ' +
          responsesCount +
          ' resposta(s) vinculada(s) e não pode ser excluído por segurança de auditoria. Inative-o em vez de excluir.',
      )
    }

    e.app.delete(template)
    return e.json(200, { ok: true })
  },
  $apis.requireAuth(),
)

// =====================================================================
// GET /backend/v1/globex/templates/{id}/responses-count
// =====================================================================
// Contagem dedicada usada ao abrir o construtor (modo de edição segura).
routerAdd(
  'GET',
  '/backend/v1/globex/templates/{id}/responses-count',
  (e) => {
    const requireAdminCaller = () => {
      if (!e.auth || !e.auth.id) throw new UnauthorizedError('Sessão não autenticada.')
      let p
      try {
        p = e.app.findFirstRecordByFilter('profiles', `user = "${e.auth.id}"`)
      } catch (_) {
        throw new ForbiddenError('Perfil não encontrado para o usuário autenticado.')
      }
      if (p.getString('role') !== 'admin' || !p.getBool('active')) {
        throw new ForbiddenError('Somente administradores podem gerenciar formulários.')
      }
      return p
    }
    requireAdminCaller()

    const templateId = e.request.pathValue('id')
    let responsesCount = 0
    try {
      responsesCount = e.app.countRecords('responses', `template_id = "${templateId}"`)
    } catch (_) {
      responsesCount = 0
    }
    return e.json(200, { responses_count: responsesCount })
  },
  $apis.requireAuth(),
)
