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

  // ID numérico para filtro
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
              
              # FILTRO OTIMIZADO: busca apenas pedidos com este produto
              orders(first: 50, query: "line_items.product_id:${productIdNumeric}") {
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
                    lineItems(first: 10, query: "product_id:${productIdNumeric}") {
                      edges {
                        node {
                          quantity
                          title
                          variant {
                            id
                            title # Adicionado para debug
                          }
                          customAttributes {
                            key
                            value
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

    // Processamento seguro de dados
    const product = response.data?.product
    const orders = response.data?.orders?.edges.map((edge) => edge.node) || []

    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    const processedOrders = orders.map((order) => {
      // Metafield seguro
      const bookingMeta = order.metafields?.edges[0]?.node
      const bookingIds =
        bookingMeta?.key === 'booking_id' && bookingMeta.value
          ? JSON.parse(bookingMeta.value)
          : []

      // Linhas de produto filtradas
      const productLineItems =
        order.lineItems?.edges
          .filter((edge) => edge.node.variant?.id)
          .map((edge) => edge.node) || []

      // Atributos customizados
      const productBookingIds = productLineItems.flatMap((item) =>
        (item.customAttributes || [])
          .filter((attr) => attr.key === 'booking_id')
          .map((attr) => parseInt(attr.value))
          .filter((id) => !isNaN(id))
      )

      return {
        id: order.id,
        name: order.name,
        createdAt: order.createdAt,
        totalPrice: order.totalPriceSet?.shopMoney,
        quantity: productLineItems.reduce(
          (sum, item) => sum + (item.quantity || 0),
          0
        ),
        customer: order.customer
          ? {
              name: order.customer.displayName,
              email: order.customer.email,
              phone:
                order.shippingAddress?.phone || order.customer.phone || null,
            }
          : null,
        bookingIds,
        productBookingIds,
      }
    })

    // Filtro por booking ID
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
