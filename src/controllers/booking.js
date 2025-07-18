import {
  checkConflict,
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
    fixed_date,
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

  if (fixed_date) {
    if (!timestampRegex.test(fixed_date)) {
      throw new BadRequestError('Invalid fixed_date format')
    }

    const fixedDate = new Date(fixed_date)
    if (isNaN(fixedDate.getTime())) {
      throw new BadRequestError('Invalid fixed_date')
    }

    // Verificar se fixed_date está dentro de 6 meses
    const maxDate = new Date(startDate)
    maxDate.setMonth(maxDate.getMonth() + 6)

    if (fixedDate > maxDate) {
      throw new BadRequestError('fixed_date cannot exceed 6 months')
    }

    if (fixedDate <= startDate) {
      throw new BadRequestError('fixed_date must be after start_datetime')
    }
  }

  // CRIAÇÃO DE BOOKINGS (ÚNICO OU SÉRIE)
  const createdBookings = []

  if (fixed_date) {
    const current = new Date(startDate)
    const endDate = new Date(fixed_date)

    while (current <= endDate) {
      const currentISO = current.toISOString()

      if (!(await checkConflict(shopify_product_id, currentISO))) {
        const booking = await createBookingDb(
          shopify_product_title,
          duration,
          currentISO,
          shopify_product_id,
          is_activated
        )
        createdBookings.push(booking.rows[0])
      }

      current.setDate(current.getDate() + 1) // Avança 1 dia
    }

    return res.status(201).json({ bookings: createdBookings })
  } else {
    // Criação única (existente)
    if (await checkConflict(shopify_product_id, start_datetime)) {
      throw new BadRequestError('Booking already exists for this timeslot')
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
