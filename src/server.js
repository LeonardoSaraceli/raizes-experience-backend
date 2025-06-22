import 'dotenv/config'
import express, { json } from 'express'
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
app.use(json())

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
