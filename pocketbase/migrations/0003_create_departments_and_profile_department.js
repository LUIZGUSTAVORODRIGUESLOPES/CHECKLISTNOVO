migrate(
  (app) => {
    // --- 1. Coleção departments ---
    if (!app.hasTable('departments')) {
      const departments = new Collection({
        name: 'departments',
        type: 'base',
        // Somente usuários autenticados: a página é restrita a admin,
        // mas o nome do departamento é exibido também na listagem de usuários.
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'name', type: 'text', required: true, max: 200 },
          { name: 'description', type: 'text', max: 500 },
          // NUNCA required em bool: false é tratado como vazio pelo PocketBase.
          { name: 'active', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_departments_name ON departments (name)'],
      })
      app.save(departments)
    }

    // --- 2. Campo department_id em profiles (relação opcional) ---
    const profiles = app.findCollectionByNameOrId('profiles')
    if (!profiles.fields.getByName('department_id')) {
      profiles.fields.add(
        new RelationField({
          name: 'department_id',
          collectionId: app.findCollectionByNameOrId('departments').id,
          maxSelect: 1,
        }),
      )
      app.save(profiles)
    }
  },
  (app) => {
    const profiles = app.findCollectionByNameOrId('profiles')
    if (profiles.fields.getByName('department_id')) {
      profiles.fields.removeByName('department_id')
      app.save(profiles)
    }
    try {
      const departments = app.findCollectionByNameOrId('departments')
      app.delete(departments)
    } catch (_) {}
  },
)
