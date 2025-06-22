import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { UnauthorizedError } from '../errors/ApiError.js'

const verifyToken = (req, res, next) => {
  try {
    const headers = req.headers['authorization']
    if (!headers) throw new UnauthorizedError('Authorization header missing')

    const token = headers.split(' ')[1]
    if (!token) throw new UnauthorizedError('Token missing')

    const payload = jwt.verify(token, process.env.SECRET_KEY)
    req.user = payload
    next()
  } catch (error) {
    throw new UnauthorizedError('Invalid token, lacking credentials.')
  }
}

const validateShopifyWebhook = (req, res, next) => {
  try {
    const hmacHeader = req.headers['x-shopify-hmac-sha256']
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET

    if (!secret) {
      console.error('SHOPIFY_WEBHOOK_SECRET não configurado')
      return res.status(500).json({ error: 'Server misconfiguration' })
    }

    if (!hmacHeader) {
      console.warn('Missing Shopify HMAC header')
      throw new UnauthorizedError('Unauthorized')
    }

    // Usar o corpo bruto já capturado
    const rawBody = req.rawBody
    if (!rawBody) {
      console.error('Raw body is missing')
      throw new UnauthorizedError('Unauthorized')
    }

    // Calcular HMAC
    const generatedHmac = crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('base64')

    // Comparar HMACs - AMBOS em base64
    const hmacBuffer = Buffer.from(hmacHeader, 'base64')
    const generatedHmacBuffer = Buffer.from(generatedHmac, 'base64')

    if (hmacBuffer.length !== generatedHmacBuffer.length) {
      console.warn('HMAC length mismatch')
      console.log(
        `Received: ${hmacBuffer.length}, Generated: ${generatedHmacBuffer.length}`
      )
      throw new UnauthorizedError('Unauthorized')
    }

    if (crypto.timingSafeEqual(hmacBuffer, generatedHmacBuffer)) {
      console.log('HMAC validation successful')
      next()
    } else {
      console.warn('HMAC validation failed')
      console.log('Received HMAC:', hmacHeader)
      console.log('Generated HMAC:', generatedHmac)
      throw new UnauthorizedError('Unauthorized')
    }
  } catch (error) {
    console.error('Webhook validation error:', error.message)
    throw new UnauthorizedError('Unauthorized')
  }
}

export { verifyToken, validateShopifyWebhook }
