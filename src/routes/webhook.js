import express from 'express'
import { validateShopifyWebhook } from '../middleware/auth.js'
import { updateOrderCreated } from '../controllers/webhook.js'

const route = express.Router()

route.post('/order-created', validateShopifyWebhook, updateOrderCreated)

export default route
