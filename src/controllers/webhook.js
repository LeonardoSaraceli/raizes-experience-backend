const updateOrderCreated = async (req, res) => {
  const { order } = req.body
  const bookingsIds = []

  order.line_items.forEach((item) => {
    if (item.properties) {
      const bookingProp = item.properties.find(
        (prop) => prop.name === 'booking_id'
      )

      if (bookingProp) {
        const id = parseInt(bookingProp.value, 10)

        if (!isNaN(id) && !bookingsIds.includes(id)) {
          bookingsIds.push(id)
        }
      }
    }
  })

  if (bookingsIds.length > 0) {
    const bookingsJson = JSON.stringify(bookingsIds)

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

    if (response.ok) {
      return res.json({ success: true })
    }
  }

  return res.json({ success: true, message: 'No booking IDs found' })
}

export { updateOrderCreated }
