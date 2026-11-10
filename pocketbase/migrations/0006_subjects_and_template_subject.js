// 0006 — Coleção subjects (Assuntos) + campo subject_id (relation) em templates.
//
// 1) Cria a coleção `subjects` com:
//      - name          (text, obrigatório e único)
//      - description   (text)
//      - department_id (relation departments, opcional)
//      - active        (bool, default true)
// 2) Adiciona em `templates` o campo subject_id (relation subjects, opcional).
//
// Regras: leitura autenticada, escrita somente via rotas server-side
// (padrão do projeto — coleções operacionais com regras de escrita null).
migrate(
  (app) => {
    const departmentsId = app.findCollectionByNameOrId('departments').id

    const autodates = [
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ]

    // ---------- 1) subjects ----------
    if (!app.hasTable('subjects')) {
      app.save(
        new Collection({
          name: 'subjects',
          type: 'base',
          listRule: "@request.auth.id != ''",
          viewRule: "@request.auth.id != ''",
          createRule: null,
          updateRule: null,
          deleteRule: null,
          fields: [
            { name: 'name', type: 'text', required: true },
            { name: 'description', type: 'text' },
            {
              name: 'department_id',
              type: 'relation',
              collectionId: departmentsId,
              maxSelect: 1,
            },
            { name: 'active', type: 'bool' },
          ].concat(autodates),
          indexes: ['CREATE UNIQUE INDEX idx_subjects_name ON subjects (name)'],
        }),
      )
    }

    // ---------- 2) templates.subject_id ----------
    const templates = app.findCollectionByNameOrId('templates')
    if (!templates.fields.getByName('subject_id')) {
      const subjectsId = app.findCollectionByNameOrId('subjects').id
      templates.fields.add(
        new RelationField({
          name: 'subject_id',
          collectionId: subjectsId,
          maxSelect: 1,
        }),
      )
      templates.addIndex('idx_templates_subject', false, 'subject_id', '')
      app.save(templates)
    }
  },
  (app) => {
    try {
      const templates = app.findCollectionByNameOrId('templates')
      if (templates.fields.getByName('subject_id')) {
        templates.fields.removeByName('subject_id')
        templates.removeIndex('idx_templates_subject')
        app.save(templates)
      }
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('subjects'))
    } catch (_) {}
  },
)
