import express from 'express'
import {
  validateShopifyWebhook,
  rawBodyMiddleware,
} from '../middleware/auth.js'
import { updateOrderCreated } from '../controllers/webhook.js'

const route = express.Router()

route.post(
  '/order-created',
  rawBodyMiddleware,
  validateShopifyWebhook,
  updateOrderCreated
)

export default route
