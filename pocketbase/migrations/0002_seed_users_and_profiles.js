migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const profiles = app.findCollectionByNameOrId('profiles')

    const seedUsers = [
      {
        email: 'admin@globex.com',
        password: 'Password123!',
        name: 'Gestor Globex',
        fullName: 'Gestor Globex (Admin)',
        role: 'admin',
        active: true,
      },
      {
        email: 'operador@globex.com',
        password: 'Password123!',
        name: 'Fiscal de Pátio',
        fullName: 'Fiscal de Pátio (Operador)',
        role: 'operator',
        active: true,
      },
      {
        email: 'inativo@globex.com',
        password: 'Password123!',
        name: 'Usuário Desativado',
        fullName: 'Fiscal Desativado (Inativo)',
        role: 'operator',
        active: false,
      },
    ]

    for (const item of seedUsers) {
      let userRecord
      try {
        userRecord = app.findAuthRecordByEmail('_pb_users_auth_', item.email)
      } catch (_) {
        userRecord = new Record(users)
        userRecord.setEmail(item.email)
        userRecord.setPassword(item.password)
        userRecord.setVerified(true)
        userRecord.set('name', item.name)
        app.save(userRecord)
      }

      try {
        app.findFirstRecordByData('profiles', 'user', userRecord.id)
      } catch (_) {
        const profileRecord = new Record(profiles)
        profileRecord.set('user', userRecord.id)
        profileRecord.set('full_name', item.fullName)
        profileRecord.set('email', item.email)
        profileRecord.set('role', item.role)
        profileRecord.set('active', item.active)
        app.save(profileRecord)
      }
    }
  },
  (app) => {
    const emails = ['admin@globex.com', 'operador@globex.com', 'inativo@globex.com']
    for (const email of emails) {
      try {
        const user = app.findAuthRecordByEmail('_pb_users_auth_', email)
        try {
          const profile = app.findFirstRecordByData('profiles', 'user', user.id)
          app.delete(profile)
        } catch (_) {}
        app.delete(user)
      } catch (_) {}
    }
  },
)
