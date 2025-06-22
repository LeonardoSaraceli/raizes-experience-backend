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
    const hmac = req.headers['x-shopify-hmac-sha256']
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET

    if (!secret) {
      return res.status(500).send('Server error')
    }

    if (!hmac) {
      throw new UnauthorizedError('Unauthorized')
    }

    const generatedHmac = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('base64')

    const hmacBuffer = Buffer.from(hmac, 'base64')
    const generatedHmacBuffer = Buffer.from(generatedHmac, 'base64')

    if (crypto.timingSafeEqual(hmacBuffer, generatedHmacBuffer)) {
      next()
    } else {
      throw new UnauthorizedError('Unauthorized')
    }
  } catch (error) {
    throw new UnauthorizedError('Unauthorized')
  }
}

export { verifyToken, validateShopifyWebhook }
