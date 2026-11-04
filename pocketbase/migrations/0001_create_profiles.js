migrate(
  (app) => {
    const collection = new Collection({
      name: 'profiles',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (user = @request.auth.id || @collection.profiles.user = @request.auth.id && @collection.profiles.role = 'admin')",
      viewRule:
        "@request.auth.id != '' && (user = @request.auth.id || @collection.profiles.user = @request.auth.id && @collection.profiles.role = 'admin')",
      createRule:
        "@request.auth.id != '' && @collection.profiles.user = @request.auth.id && @collection.profiles.role = 'admin'",
      updateRule:
        "@request.auth.id != '' && @collection.profiles.user = @request.auth.id && @collection.profiles.role = 'admin'",
      deleteRule:
        "@request.auth.id != '' && @collection.profiles.user = @request.auth.id && @collection.profiles.role = 'admin'",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'full_name',
          type: 'text',
          required: true,
        },
        {
          name: 'email',
          type: 'email',
          required: true,
        },
        {
          name: 'role',
          type: 'select',
          required: true,
          values: ['admin', 'operator'],
          maxSelect: 1,
        },
        {
          name: 'active',
          type: 'bool',
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_profiles_user ON profiles (user)',
        'CREATE UNIQUE INDEX idx_profiles_email ON profiles (email)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('profiles')
    app.delete(collection)
  },
)
