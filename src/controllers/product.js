const getAllProducts = async (req, res) => {
  const result = await fetch(
    `${process.env.SHOPIFY_STORE_URL}/api/2023-07/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_TOKEN,
      },
      body: JSON.stringify({
        query: `
        {
          products(first: 100) {
            edges {
              node {
                id
                title
              }
            }
          }
        }
      `,
      }),
    }
  )

  const data = await result.json()

  return res.json(
    data.data.products.edges.map((edge) => ({
      id: edge.node.id,
      title: edge.node.title,
    }))
  )
}

const getProductById = async (req, res) => {
  const { id } = req.params
  const { bookingId } = req.query

  const globalId = `gid://shopify/Product/${id}`

  try {
    const result = await fetch(
      `${process.env.SHOPIFY_STORE_URL}/admin/api/2023-07/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN,
        },
        body: JSON.stringify({
          query: `
            query GetProductAndOrders($productId: ID!) {
              product: node(id: $productId) {
                ... on Product {
                  id
                  title
                }
              }
              
              orders(first: 10, query: "tag:booking_${bookingId}") {
                edges {
                  node {
                    id
                    name
                    createdAt
                    totalPriceSet {
                      shopMoney {
                        amount
                        currencyCode
                      }
                    }
                    lineItems(first: 10) {
                      edges {
                        node {
                          quantity
                          title
                          variant {
                            product {
                              id
                            }
                          }
                        }
                      }
                    }
                    customer {
                      displayName
                      email
                      phone
                    }
                    shippingAddress {
                      phone
                    }
                  }
                }
              }
            }
          `,
          variables: {
            productId: globalId,
          },
        }),
      }
    )

    const response = await result.json()

    // Debug: Log completo da resposta
    console.log('Shopify API Response:', JSON.stringify(response, null, 2))

    if (response.errors) {
      console.error('GraphQL Errors:', response.errors)
      return res.status(400).json({
        error: 'GraphQL query error',
        details: response.errors,
      })
    }

    const product = response.data?.product
    const orders = response.data?.orders?.edges.map((edge) => edge.node) || []

    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    return res.json({
      product: {
        id: product.id,
        title: product.title,
      },
      orders: orders.map((order) => {
        // Calcular quantidade total do produto específico
        const productQuantity = order.lineItems.edges.reduce((total, item) => {
          return total + item.node.quantity
        }, 0)

        // Obter telefone do cliente (priorizando o telefone de entrega)
        const phone =
          order.shippingAddress?.phone || order.customer?.phone || null

        return {
          id: order.id,
          name: order.name,
          createdAt: order.createdAt,
          totalPrice: order.totalPriceSet?.shopMoney,
          quantity: productQuantity,
          customer: order.customer
            ? {
                name: order.customer.displayName,
                email: order.customer.email,
                phone: phone,
              }
            : null,
          bookingId: bookingId,
        }
      }),
    })
  } catch (error) {
    console.error('Server Error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    })
  }
}

export { getAllProducts, getProductById }
