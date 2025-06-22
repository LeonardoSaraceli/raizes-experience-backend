const updateOrderCreated = async (req, res) => {
  try {
    // Parse do corpo manualmente se necessário
    const orderData = req.body || JSON.parse(req.rawBody || '{}')
    const { order } = orderData

    if (!order) {
      console.error('Missing order data in webhook')
      return res.status(400).json({ error: 'Missing order data' })
    }

    console.log('Received order:', order.id)

    const bookingsIds = []
    let hasBooking = false

    // Verificar cada item do pedido
    order.line_items.forEach((item) => {
      if (item.properties) {
        // As propriedades são um array de objetos {name, value}
        const bookingProp = item.properties.find(
          (prop) => prop.name === 'booking_id'
        )

        if (bookingProp) {
          const id = parseInt(bookingProp.value, 10)
          console.log(`Found booking ID: ${id} in item ${item.id}`)

          if (!isNaN(id) && !bookingsIds.includes(id)) {
            bookingsIds.push(id)
            hasBooking = true
          }
        }
      }
    })

    console.log(`Found ${bookingsIds.length} booking IDs`)

    if (bookingsIds.length > 0) {
      const bookingsJson = JSON.stringify(bookingsIds)
      console.log(
        `Updating metafield for order ${order.id} with: ${bookingsJson}`
      )

      const response = await fetch(
        `https://${process.env.SHOPIFY_STORE_URL}/admin/api/2023-10/orders/${order.id}/metafields.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN,
          },
          body: JSON.stringify({
            metafield: {
              namespace: 'custom',
              key: 'booking_id',
              type: 'json',
              value: bookingsJson,
            },
          }),
        }
      )

      const data = await response.json()

      if (response.ok) {
        console.log('Metafield updated successfully:', data)
        return res.status(200).json({ success: true })
      } else {
        console.error('Failed to update metafield:', data)
        return res.status(500).json({
          error: 'Failed to update metafield',
          details: data,
        })
      }
    }

    console.log('No booking IDs found in order')
    return res.status(200).json({
      success: true,
      message: 'No booking IDs found',
    })
  } catch (error) {
    console.error('Error in updateOrderCreated:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    })
  }
}

export { updateOrderCreated }
