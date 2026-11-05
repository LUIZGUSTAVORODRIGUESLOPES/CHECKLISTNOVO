migrate(
  (app) => {
    const departments = app.findCollectionByNameOrId('departments')

    const seed = [
      { name: 'Expedição', description: 'Carga e descarga, conferência e expedição de veículos.' },
      {
        name: 'Recebimento',
        description: 'Conferência de notas fiscais e recebimento de mercadorias.',
      },
      { name: 'Inventário', description: 'Contagem cíclica e acuracidade de estoque.' },
    ]

    for (const item of seed) {
      try {
        app.findFirstRecordByData('departments', 'name', item.name)
      } catch (_) {
        const record = new Record(departments)
        record.set('name', item.name)
        record.set('description', item.description)
        record.set('active', true)
        app.save(record)
      }
    }
  },
  (app) => {
    const names = ['Expedição', 'Recebimento', 'Inventário']
    for (const name of names) {
      try {
        const record = app.findFirstRecordByData('departments', 'name', name)
        app.delete(record)
      } catch (_) {}
    }
  },
)
