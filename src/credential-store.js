'use strict'

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { DatabaseSync } = require('node:sqlite')

class CredentialStore {
  static async open(filePath = process.env.MC_LOADTEST_DB || path.join(os.homedir(), '.mc-loadtest', 'credentials.sqlite')) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 })
    const db = new DatabaseSync(filePath)
    db.exec(`CREATE TABLE IF NOT EXISTS credentials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`)
    fs.chmodSync(filePath, 0o600)
    return new CredentialStore(db)
  }

  constructor(db) {
    this.db = db
  }

  list() {
    return this.db.prepare('SELECT id, name, updated_at AS updatedAt FROM credentials ORDER BY name COLLATE NOCASE').all()
  }

  get(id) {
    return this.db.prepare('SELECT id, name, password FROM credentials WHERE id = ?').get(Number(id)) || null
  }

  save(name, password) {
    this.db.prepare(
      `INSERT INTO credentials (name, password, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(name) DO UPDATE SET password = excluded.password, updated_at = excluded.updated_at`,
    ).run(name.trim(), password, new Date().toISOString())
  }

  close() {
    this.db.close()
  }
}

module.exports = { CredentialStore }
