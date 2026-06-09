const mysql = require('mysql2/promise')
require('dotenv').config()

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  })
  try {
    const [columns] = await connection.query("SHOW COLUMNS FROM tasks LIKE 'due_date'")
    if (!columns.length) await connection.query('ALTER TABLE tasks ADD COLUMN due_date DATE NULL AFTER estimated_hours')
    const [emailColumn] = await connection.query("SHOW COLUMNS FROM notifications LIKE 'email_sent_at'")
    if (!emailColumn.length) {
      await connection.query(
        'ALTER TABLE notifications ADD COLUMN email_sent_at DATETIME NULL, ADD COLUMN push_sent_at DATETIME NULL'
      )
    }
    await connection.query(`
      CREATE TABLE IF NOT EXISTS task_comments (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        task_id INT NOT NULL, user_id INT NOT NULL,
        comment TEXT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT task_comments_task_fk FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        CONSTRAINT task_comments_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB;
      CREATE TABLE IF NOT EXISTS task_attachments (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        task_id INT NOT NULL, added_by INT NOT NULL,
        name VARCHAR(190) NOT NULL, url TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT task_attachments_task_fk FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        CONSTRAINT task_attachments_user_fk FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB;
      CREATE TABLE IF NOT EXISTS notifications (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL, task_id INT NULL,
        message VARCHAR(255) NOT NULL, type VARCHAR(30) NOT NULL DEFAULT 'info',
        is_read TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY notifications_user_index (user_id, is_read),
        CONSTRAINT notifications_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT notifications_task_fk FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        endpoint VARCHAR(700) NOT NULL,
        subscription_json TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY push_subscriptions_endpoint_unique (endpoint),
        KEY push_subscriptions_user_index (user_id),
        CONSTRAINT push_subscriptions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `)
    console.log('Feature migration complete')
  } finally {
    await connection.end()
  }
}

migrate().catch(error => {
  console.error(error.message)
  process.exit(1)
})
