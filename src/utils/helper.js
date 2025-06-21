import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'

const signToken = (user) => {
  return jwt.sign({ data: user }, process.env.SECRET_KEY, {
    expiresIn: '90d',
  })
}

const hashUserPassword = async (password) => {
  return bcrypt.hash(password, 10)
}

const compareUserPassword = async (inputPassword, userPassword) => {
  return bcrypt.compare(inputPassword, userPassword)
}

export { signToken, hashUserPassword, compareUserPassword }
