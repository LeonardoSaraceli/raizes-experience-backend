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

export { verifyToken }
