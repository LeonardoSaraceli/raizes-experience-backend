import { Router } from 'express'
import {
  createBooking,
  deleteBookingById,
  getAllBookings,
} from '../controllers/booking.js'
import { verifyToken } from '../middleware/auth.js'

const route = Router()

route.get('/', getAllBookings)
route.post('/', verifyToken, createBooking)
route.delete('/:id', verifyToken, deleteBookingById)

export default route
