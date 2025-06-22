import { Router } from 'express'
import crypto from 'crypto'
import { updateOrderCreated } from '../controllers/webhook.js'
import { validateShopifyWebhook } from '../middleware/auth.js'

const router = Router()

router.post('/order-created', validateShopifyWebhook, updateOrderCreated)

export default router
