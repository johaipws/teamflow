const fs = require('fs')
const path = require('path')
const bcrypt = require('bcryptjs')
const mysql = require('mysql2/promise')
require('dotenv').config()

async function initializeDatabase() {
  const schema = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8')
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  })

  try {
    await connection.query(schema)

    const leadEmail = process.env.SEED_LEAD_EMAIL
    const leadPassword = process.env.SEED_LEAD_PASSWORD
    const leadName = process.env.SEED_LEAD_NAME || 'Team Lead'

    if (leadEmail && leadPassword) {
      if (leadPassword.length < 8) {
        throw new Error('SEED_LEAD_PASSWORD must contain at least 8 characters')
      }

      const hash = await bcrypt.hash(leadPassword, 10)
      await connection.query(
        `INSERT INTO teamflow.users (name, email, password, role)
         VALUES (?, ?, ?, 'lead')
         ON DUPLICATE KEY UPDATE name = VALUES(name), password = VALUES(password), role = 'lead'`,
        [leadName, leadEmail.toLowerCase(), hash]
      )
      console.log(`Database initialized and lead account ready: ${leadEmail}`)
    } else {
      console.log('Database initialized. Set SEED_LEAD_EMAIL and SEED_LEAD_PASSWORD to create the first lead.')
    }
  } finally {
    await connection.end()
  }
}

initializeDatabase().catch(error => {
  console.error(`Database initialization failed: ${error.message}`)
  process.exit(1)
})
