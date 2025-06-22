import { db } from '../lib/db.js'

const getAllBookingsDb = async (
  start_datetime,
  check_time,
  shopify_product_id
) => {
  if (start_datetime && Boolean(check_time) && shopify_product_id) {
    return db.query(
      `
      SELECT * FROM bookings
      WHERE start_datetime::date = $1::date
        AND start_datetime > NOW()
        AND shopify_product_id = $2
      ORDER BY created_at DESC
      `,
      [start_datetime, shopify_product_id]
    )
  }

  if (start_datetime && shopify_product_id) {
    return db.query(
      `
      SELECT * FROM bookings
      WHERE start_datetime::date = $1::date
        AND shopify_product_id = $2
      ORDER BY created_at DESC
      `,
      [start_datetime, shopify_product_id]
    )
  }

  if (start_datetime) {
    return db.query(
      `
      SELECT * FROM bookings
      WHERE start_datetime::date = $1::date
      ORDER BY created_at DESC
      `,
      [start_datetime]
    )
  }

  return db.query(
    `
    SELECT * FROM bookings
    ORDER BY created_at DESC
    `
  )
}

const getBookingByIdDb = (id) => {
  return db.query('SELECT * FROM bookings WHERE id = $1', [id])
}

const deleteBookingByIdDb = (id) => {
  return db.query('DELETE FROM bookings WHERE id = $1', [id])
}

const createBookingDb = (
  shopify_product_title,
  duration,
  start_datetime,
  shopify_product_id,
  is_activated
) => {
  if (is_activated) {
    return db.query(
      `
    INSERT INTO bookings
    (shopify_product_title, duration, start_datetime, shopify_product_id, is_activated)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
    `,
      [
        shopify_product_title,
        duration,
        start_datetime,
        shopify_product_id,
        is_activated,
      ]
    )
  }

  return db.query(
    `
    INSERT INTO bookings
    (shopify_product_title, duration, start_datetime, shopify_product_id)
    VALUES ($1, $2, $3, $4)
    RETURNING *
    `,
    [shopify_product_title, duration, start_datetime, shopify_product_id]
  )
}

export {
  getAllBookingsDb,
  deleteBookingByIdDb,
  createBookingDb,
  getBookingByIdDb,
}
