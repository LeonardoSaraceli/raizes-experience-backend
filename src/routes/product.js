import { Router } from 'express'
import { getAllProducts, getProductById } from '../controllers/product.js'
import { verifyToken } from '../middleware/auth.js'

const route = Router()

route.get('/', verifyToken, getAllProducts)
route.get('/:id', verifyToken, getProductById)

export default route
