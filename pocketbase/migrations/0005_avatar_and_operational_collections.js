// 0005 — Avatar em profiles + estrutura base das 4 coleções operacionais.
//
// 1) Campo `avatar` (file: PNG/JPG/WEBP, até 5 MB) na coleção `profiles`.
// 2) Cria as coleções operacionais do Globex (sem telas ainda):
//    templates, schedules, responses, action_plans.
//    Regras de API restritas: leitura apenas para usuários autenticados,
//    escrita somente para superusers (null) até as telas existirem.
migrate(
  (app) => {
    // ---------- 1) profiles.avatar ----------
    const profiles = app.findCollectionByNameOrId('profiles')
    if (!profiles.fields.getByName('avatar')) {
      profiles.fields.add(
        new FileField({
          name: 'avatar',
          maxSelect: 1,
          maxSize: 5242880, // 5 MB
          mimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
          thumbs: ['100x100'],
        }),
      )
      app.save(profiles)
    }

    const departmentsId = app.findCollectionByNameOrId('departments').id
    const profilesId = app.findCollectionByNameOrId('profiles').id

    const autodates = [
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ]

    // ---------- 2) templates ----------
    const templates = new Collection({
      name: 'templates',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'description', type: 'text' },
        { name: 'department_id', type: 'relation', collectionId: departmentsId, maxSelect: 1 },
        { name: 'blocks', type: 'json', maxSize: 2000000 },
        { name: 'active', type: 'bool' },
        { name: 'created_by', type: 'relation', collectionId: profilesId, maxSelect: 1 },
      ].concat(autodates),
      indexes: [
        'CREATE INDEX idx_templates_department ON templates (department_id)',
        'CREATE INDEX idx_templates_created_by ON templates (created_by)',
      ],
    })
    app.save(templates)
    const templatesId = templates.id

    // ---------- 3) schedules ----------
    app.save(
      new Collection({
        name: 'schedules',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          { name: 'title', type: 'text', required: true },
          {
            name: 'template_id',
            type: 'relation',
            collectionId: templatesId,
            maxSelect: 1,
            required: true,
          },
          { name: 'assigned_to', type: 'relation', collectionId: profilesId, maxSelect: 1 },
          { name: 'scheduled_date', type: 'date' },
          { name: 'status', type: 'text' },
        ].concat(autodates),
        indexes: [
          'CREATE INDEX idx_schedules_template ON schedules (template_id)',
          'CREATE INDEX idx_schedules_assigned_to ON schedules (assigned_to)',
        ],
      }),
    )

    // ---------- 4) responses ----------
    app.save(
      new Collection({
        name: 'responses',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          {
            name: 'template_id',
            type: 'relation',
            collectionId: templatesId,
            maxSelect: 1,
            required: true,
          },
          { name: 'operator_id', type: 'relation', collectionId: profilesId, maxSelect: 1 },
          { name: 'answers', type: 'json', maxSize: 2000000 },
          { name: 'template_snapshot', type: 'json', maxSize: 2000000 },
          { name: 'status', type: 'text' },
        ].concat(autodates),
        indexes: [
          'CREATE INDEX idx_responses_template ON responses (template_id)',
          'CREATE INDEX idx_responses_operator ON responses (operator_id)',
        ],
      }),
    )

    // ---------- 5) action_plans ----------
    const responsesId = app.findCollectionByNameOrId('responses').id
    app.save(
      new Collection({
        name: 'action_plans',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          {
            name: 'response_id',
            type: 'relation',
            collectionId: responsesId,
            maxSelect: 1,
            required: true,
          },
          { name: 'title', type: 'text', required: true },
          { name: 'responsible_id', type: 'relation', collectionId: profilesId, maxSelect: 1 },
          { name: 'status', type: 'text' },
        ].concat(autodates),
        indexes: [
          'CREATE INDEX idx_action_plans_response ON action_plans (response_id)',
          'CREATE INDEX idx_action_plans_responsible ON action_plans (responsible_id)',
        ],
      }),
    )
  },
  (app) => {
    const names = ['action_plans', 'responses', 'schedules', 'templates']
    for (const name of names) {
      try {
        app.delete(app.findCollectionByNameOrId(name))
      } catch (_) {}
    }
    try {
      const profiles = app.findCollectionByNameOrId('profiles')
      if (profiles.fields.getByName('avatar')) {
        profiles.fields.removeByName('avatar')
        app.save(profiles)
      }
    } catch (_) {}
  },
)
