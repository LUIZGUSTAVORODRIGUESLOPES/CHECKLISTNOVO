// 0007 — Cadastros Mestres: coleções entity_definitions + master_data_entries.
//
// 1) entity_definitions:
//      - name        (text, obrigatório e único)
//      - description (text, opcional)
//      - active      (bool, default true)
// 2) master_data_entries:
//      - entity_id   (relation entity_definitions, obrigatório)
//      - value       (text, obrigatório — texto exibido/selecionável)
//      - description (text, opcional)
//      - extra       (json, opcional — atributos futuros, ex: placa do veículo)
//      - active      (bool, default true)
// 3) Seed: 3 entidades de exemplo com itens (marcadas na descrição como exemplo
//    editável), para a tela de Cadastros Mestres não abrir vazia.
//
// Regras: leitura/escrita apenas via rotas server-side com checagem de admin
// no hook (padrão do projeto) — create/update/delete null em ambas.

migrate(
  (app) => {
    const autodates = [
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ]

    // ---------- 1) entity_definitions ----------
    if (!app.hasTable('entity_definitions')) {
      app.save(
        new Collection({
          name: 'entity_definitions',
          type: 'base',
          listRule: "@request.auth.id != ''",
          viewRule: "@request.auth.id != ''",
          createRule: null,
          updateRule: null,
          deleteRule: null,
          fields: [
            { name: 'name', type: 'text', required: true },
            { name: 'description', type: 'text' },
            { name: 'active', type: 'bool' },
          ].concat(autodates),
          indexes: ['CREATE UNIQUE INDEX idx_entity_definitions_name ON entity_definitions (name)'],
        }),
      )
    }

    // ---------- 2) master_data_entries ----------
    if (!app.hasTable('master_data_entries')) {
      const entityId = app.findCollectionByNameOrId('entity_definitions').id
      app.save(
        new Collection({
          name: 'master_data_entries',
          type: 'base',
          listRule: "@request.auth.id != ''",
          viewRule: "@request.auth.id != ''",
          createRule: null,
          updateRule: null,
          deleteRule: null,
          fields: [
            {
              name: 'entity_id',
              type: 'relation',
              collectionId: entityId,
              required: true,
              maxSelect: 1,
            },
            { name: 'value', type: 'text', required: true },
            { name: 'description', type: 'text' },
            { name: 'extra', type: 'json' },
            { name: 'active', type: 'bool' },
          ].concat(autodates),
          indexes: [
            'CREATE UNIQUE INDEX idx_master_data_entries_entity_value ON master_data_entries (entity_id, value)',
          ],
        }),
      )
    }

    // ---------- 3) Seed de exemplo ----------
    const entitiesCollection = app.findCollectionByNameOrId('entity_definitions')
    const entriesCollection = app.findCollectionByNameOrId('master_data_entries')

    const seed = [
      {
        name: 'Transportadoras',
        description:
          'Entidade de exemplo — edite ou inative à vontade na tela Cadastros Mestres. Usada pelo campo Seleção de Cadastro do Construtor de Formulários.',
        items: ['TransLog Brasil', 'Rodo Express LTDA', 'Log Sul Transportes'],
      },
      {
        name: 'Veículos',
        description:
          'Entidade de exemplo — edite ou inative à vontade na tela Cadastros Mestres. Usada pelo campo Seleção de Cadastro do Construtor de Formulários.',
        items: [
          'Volvo FH 540 — placa ABC1D23',
          'Scania R450 — placa DEF4G56',
          'Fiat Fiorino — placa GHI7J89',
        ],
      },
      {
        name: 'Docas',
        description:
          'Entidade de exemplo — edite ou inative à vontade na tela Cadastros Mestres. Usada pelo campo Seleção de Cadastro do Construtor de Formulários.',
        items: ['Doca 01 — Portão Norte', 'Doca 02 — Portão Norte', 'Doca 03 — Portão Sul'],
      },
    ]

    for (const entity of seed) {
      const entityRecord = new Record(entitiesCollection)
      entityRecord.set('name', entity.name)
      entityRecord.set('description', entity.description)
      entityRecord.set('active', true)
      app.save(entityRecord)

      for (const item of entity.items) {
        const entry = new Record(entriesCollection)
        entry.set('entity_id', entityRecord.id)
        entry.set('value', item)
        entry.set('active', true)
        app.save(entry)
      }
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('master_data_entries'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('entity_definitions'))
    } catch (_) {}
  },
)
