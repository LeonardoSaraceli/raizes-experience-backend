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
              
              orders(first: 50, query: "created_at:>'2023-01-01'") {
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
                            product {
                              id
                            }
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
                    metafield(namespace: "custom", key: "booking_id") {
                      value
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

  if (response.errors) {
    throw new BadRequestError('GraphQL query error')
  }

  const product = response.data?.product
  const orders = response.data?.orders?.edges.map((edge) => edge.node) || []

  if (!product) {
    throw new NotFoundError('Product not found')
  }

  const processedOrders = orders.map((order) => {
    const bookingIds = order.metafield?.value
      ? JSON.parse(order.metafield.value)
      : []

    const productItems = order.lineItems.edges.filter(
      (edge) => edge.node.variant?.product?.id === globalId
    )

    const productQuantity = productItems.reduce(
      (total, item) => total + item.node.quantity,
      0
    )

    const phone = order.shippingAddress?.phone || order.customer?.phone || null

    const productBookingIds = productItems
      .map(
        (item) =>
          item.node.customAttributes.find((attr) => attr.key === 'booking_id')
            ?.value
      )
      .filter(Boolean)
      .map((id) => parseInt(id))

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
      bookingIds: bookingIds,
      productBookingIds: productBookingIds,
    }
  })

  const filteredOrders = bookingId
    ? processedOrders.filter(
        (order) =>
          order.bookingIds.includes(parseInt(bookingId, 10)) ||
          order.productBookingIds.includes(parseInt(bookingId, 10))
      )
    : processedOrders

  return res.json({
    product: {
      id: product.id,
      title: product.title,
      variants: product.variants.edges.map((edge) => edge.node),
    },
    orders: filteredOrders,
  })
}

export { getAllProducts, getProductById }
