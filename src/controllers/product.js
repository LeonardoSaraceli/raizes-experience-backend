import { BadRequestError, NotFoundError } from '../errors/ApiError.js'

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
  const productIdNumeric = id.split('/').pop() || id

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
                  variants(first: 10) {
                    edges {
                      node {
                        id
                        title
                      }
                    }
                  }
                }
              }
              
              orders(first: 50, query: "line_items.product_id:${productIdNumeric} AND financial_status:paid") {
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
                    lineItems(first: 50) {
                      edges {
                        node {
                          quantity
                          title
                          variant {
                            id
                            title
                          }
                          customAttributes {
                            key
                            value
                          }
                          product {
                            id
                          }
                          originalUnitPriceSet {
                            shopMoney {
                              amount
                              currencyCode
                            }
                          }
                        }
                      }
                    }
                    metafields(namespace: "custom", first: 1) {
                      edges {
                        node {
                          key
                          value
                        }
                      }
                    }
                  }
                }
              }
            }
          `,
          variables: { productId: globalId },
        }),
      }
    )

    const response = await result.json()

    if (response.errors) {
      console.error('GraphQL Errors:', response.errors)
      return res.status(400).json({ error: 'GraphQL query error' })
    }

    const product = response.data?.product
    const orders = response.data?.orders?.edges.map((edge) => edge.node) || []

    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    const processedOrders = orders.map((order) => {
      const bookingMeta = order.metafields?.edges[0]?.node
      const bookingIds =
        bookingMeta?.key === 'booking_id' && bookingMeta.value
          ? JSON.parse(bookingMeta.value)
          : []

      const allLineItems = order.lineItems?.edges.map((edge) => edge.node) || []
      const productLineItems = allLineItems.filter(
        (item) => item.product?.id === globalId
      )

      // Extrair todos os booking_ids dos itens para filtro posterior
      const productBookingIds = productLineItems.flatMap((item) =>
        (item.customAttributes || [])
          .filter((attr) => attr.key === 'booking_id')
          .map((attr) => parseInt(attr.value))
          .filter((id) => !isNaN(id))
      )

      // Calcular subtotal e quantidade baseado no bookingId da query
      let subtotal = 0
      let quantity = 0
      const currency = order.totalPriceSet?.shopMoney?.currencyCode || 'USD'

      // Filtrar itens com booking_id correspondente (se bookingId existir)
      const matchingItems = bookingId
        ? productLineItems.filter((item) =>
            (item.customAttributes || []).some(
              (attr) => attr.key === 'booking_id' && attr.value === bookingId
            )
          )
        : productLineItems

      matchingItems.forEach((item) => {
        const itemQuantity = item.quantity || 0
        const unitPrice = parseFloat(
          item.originalUnitPriceSet?.shopMoney?.amount || '0'
        )
        quantity += itemQuantity
        subtotal += unitPrice * itemQuantity
      })

      return {
        id: order.id,
        name: order.name,
        adminUrl: `${process.env.SHOPIFY_STORE_URL}/admin/orders/${order.id
          .split('/')
          .pop()}`,
        createdAt: order.createdAt,
        subtotal,
        currency,
        quantity,
        bookingIds,
        productBookingIds,
      }
    })

    // Filtrar pedidos por bookingId (se aplicável)
    const filteredOrders = bookingId
      ? processedOrders.filter((order) => {
          const bid = parseInt(bookingId, 10)
          return (
            order.bookingIds.includes(bid) ||
            order.productBookingIds.includes(bid)
          )
        })
      : processedOrders

    return res.json({
      product: {
        id: product.id,
        title: product.title,
        variants: product.variants.edges.map((edge) => edge.node),
      },
      orders: filteredOrders,
    })
  } catch (error) {
    console.error('Server Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export { getAllProducts, getProductById }
