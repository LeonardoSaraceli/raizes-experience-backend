import jwt from 'jsonwebtoken'
import { UnauthorizedError } from '../errors/ApiError.js'

const verifyToken = (req, res, next) => {
  try {
    const headers = req.headers['authorization']

    const token = headers.split(' ')[1]

    const payload = jwt.verify(token, process.env.SECRET_KEY)

    req.user = payload

    next()
  } catch (error) {
    throw new UnauthorizedError('Invalid token, lacking credentials.')
  }
}

const validateShopifyWebhook = (req, res, next) => {
  const hmac = req.headers['x-shopify-hmac-sha256']
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET

  const generatedHmac = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('base64')

  if (crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(generatedHmac))) {
    next()
  } else {
    throw new UnauthorizedError('Unauthorized.')
  }
}

export { verifyToken, validateShopifyWebhook }
