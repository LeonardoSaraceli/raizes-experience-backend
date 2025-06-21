import { db } from '../lib/db.js'

const getAllUsersDb = () => {
  return db.query('SELECT * FROM users ORDER BY created_at DESC')
}

const getUserByIdDb = (id) => {
  return db.query('SELECT * FROM users WHERE id = $1', [id])
}

const createUserDb = (email, password) => {
  return db.query(
    `
    INSERT INTO users
    (email, password)
    VALUES ($1, $2)
    RETURNING *
    `,
    [email, password]
  )
}

const getUserByEmailDb = (email) => {
  return db.query('SELECT * FROM users WHERE email = $1', [email])
}

export { getAllUsersDb, getUserByIdDb, createUserDb, getUserByEmailDb }
