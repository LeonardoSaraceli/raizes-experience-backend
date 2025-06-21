import { Router } from 'express'
import {
  createToken,
  createUser,
  getAllUsers,
  getUserById,
} from '../controllers/user.js'
import { verifyToken } from '../middleware/auth.js'

const route = Router()

route.get('/', verifyToken, getAllUsers)
route.get('/:id', verifyToken, getUserById)
route.post('/register', createUser)
route.post('/login', createToken)

export default route
