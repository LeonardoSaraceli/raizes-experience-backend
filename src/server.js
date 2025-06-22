import 'dotenv/config'
import express from 'express'
import 'express-async-errors'
import morgan from 'morgan'
import cors from 'cors'
import ApiError from './errors/ApiError.js'
import bookingRoute from './routes/booking.js'
import productRoute from './routes/product.js'
import userRoute from './routes/user.js'
import webhookRoute from './routes/webhook.js'

const app = express()

app.use(morgan('dev'))
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL,
      process.env.SHOPIFY_URL,
      process.env.SHOPIFY_URL_TEST,
    ],
    methods: 'GET,POST,PUT,DELETE',
    credentials: true,
    preflightContinue: false,
  })
)

// IMPORTANTE: Middleware de corpo bruto para webhooks
app.use((req, res, next) => {
  if (req.path.startsWith('/webhook')) {
    let data = ''
    req.setEncoding('utf8')
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => {
      req.rawBody = data
      next()
    })
  } else {
    express.json()(req, res, next)
  }
})

// Middleware JSON para rotas normais
app.use((req, res, next) => {
  if (!req.path.startsWith('/webhook')) {
    express.json()(req, res, next)
  } else {
    next()
  }
})

app.use('/booking', bookingRoute)
app.use('/product', productRoute)
app.use('/user', userRoute)
app.use('/webhook', webhookRoute)

app.use((error, req, res, next) => {
  if (error instanceof ApiError) {
    return res.status(error.status).json({
      error: error.message,
    })
  }

  console.log(error)

  res.status(500).json({
    error: 'Server error',
  })
})

export default app
