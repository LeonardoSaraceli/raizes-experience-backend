import {
  createUserDb,
  getAllUsersDb,
  getUserByEmailDb,
  getUserByIdDb,
} from '../domains/user.js'
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../errors/ApiError.js'
import {
  compareUserPassword,
  hashUserPassword,
  signToken,
} from '../utils/helper.js'

const getAllUsers = async (req, res) => {
  const users = await getAllUsersDb()

  return res.json({ users: users.rows })
}

const getUserById = async (req, res) => {
  const { id } = req.params

  const user = await getUserByIdDb(id)

  return res.json({ user: user.rows[0] })
}

const createUser = async (req, res) => {
  const { email, password } = req.body

  const existingUser = await getUserByEmailDb(email)

  if (existingUser.rowCount) {
    throw new ConflictError('User already registered')
  }

  const hashedPassword = await hashUserPassword(password)

  const user = await createUserDb(email, hashedPassword)

  return res.status(201).json({ user: user.rows[0] })
}

const createToken = async (req, res) => {
  const { email, password } = req.body

  const user = await getUserByEmailDb(email)

  if (!user.rowCount) {
    throw new NotFoundError('Invalid credentials.')
  }

  const isPasswordValid = await compareUserPassword(
    password,
    user.rows[0].password
  )

  if (!isPasswordValid) {
    throw new BadRequestError('Invalid credentials.')
  }

  const token = signToken(user)

  res.status(201).json({ token })
}

export { getAllUsers, getUserById, createUser, createToken }
