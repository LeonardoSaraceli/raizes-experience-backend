import app from './server.js'

const port = process.env.PORT

app.listen(port, () => {
  console.log(`Server is running on port http://localhost:${port}`)
})
