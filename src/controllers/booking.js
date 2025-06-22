import {
  createBookingDb,
  deleteBookingByIdDb,
  getAllBookingsDb,
  getBookingByIdDb,
} from '../domains/booking.js'
import { BadRequestError, NotFoundError } from '../errors/ApiError.js'

const getAllBookings = async (req, res) => {
  const { start_datetime, check_time, shopify_product_id } = req.query

  const bookings = await getAllBookingsDb(
    start_datetime,
    check_time,
    shopify_product_id
  )

  return res.json({ bookings: bookings.rows })
}

const createBooking = async (req, res) => {
  const {
    shopify_product_title,
    duration,
    start_datetime,
    shopify_product_id,
    is_activated,
  } = req.body

  if (
    !shopify_product_title ||
    !duration ||
    !start_datetime ||
    !shopify_product_id
  ) {
    throw new BadRequestError('Missing fields in request body')
  }

  const durationRegex = /^[\d\s\w]+$/

  if (!durationRegex.test(duration)) {
    throw new BadRequestError('Invalid duration format')
  }

  const timestampRegex =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/

  if (!timestampRegex.test(start_datetime)) {
    throw new BadRequestError('Invalid start_datetime format')
  }

  const startDate = new Date(start_datetime)
  const now = new Date()

  if (isNaN(startDate.getTime())) {
    throw new BadRequestError('Invalid date')
  }

  if (startDate <= now) {
    throw new BadRequestError('start_datetime must be in the future')
  }

  if (isNaN(shopify_product_id) || shopify_product_id < 1) {
    throw new BadRequestError(
      'shopify_product_id must be in an positive integer'
    )
  }

  const booking = await createBookingDb(
    shopify_product_title,
    duration,
    start_datetime,
    shopify_product_id,
    is_activated
  )

  return res.status(201).json({ booking: booking.rows[0] })
}

const deleteBookingById = async (req, res) => {
  const { id } = req.params

  const booking = await getBookingByIdDb(id)

  if (!booking.rowCount) {
    throw new NotFoundError('Booking not found')
  }

  await deleteBookingByIdDb(id)

  return res.json({ booking: booking.rows[0] })
}

export { getAllBookings, createBooking, deleteBookingById }
