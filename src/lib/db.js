import pkg from 'pg'

const { Pool } = pkg
const { PG_HOST, PG_DATABASE, PG_USER, PG_PASSWORD, PG_PORT } = process.env

export const db = new Pool({
  host: PG_HOST,
  database: PG_DATABASE,
  user: PG_USER,
  password: PG_PASSWORD,
  port: Number(PG_PORT),
  ssl: {
    rejectUnauthorized: false,
  },
})
