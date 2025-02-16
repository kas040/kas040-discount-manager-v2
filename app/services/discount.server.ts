import { authenticate } from '../shopify.server';
import type { DiscountRule, DiscountView } from '../types/discount';

const METAFIELD_NAMESPACE = 'discount_manager';

export async function createDiscountRule(
  request: Request,
  data: Omit<DiscountRule, 'id' | 'shop'>
): Promise<DiscountRule> {
  const { admin, session } = await authenticate.admin(request);
  
  // Create a unique ID for the rule
  const ruleId = `rule_${Date.now()}`;
  
  // Store the rule in a shop metafield
  const response = await admin.graphql(`
    mutation createDiscountRule($input: MetafieldsSetInput!) {
      metafieldsSet(metafields: $input) {
        metafields {
          id
          namespace
          key
          value
        }
        userErrors {
          field
          message
        }
      }
    }
  `, {
    variables: {
      input: {
        namespace: METAFIELD_NAMESPACE,
        key: ruleId,
        type: "json",
        value: JSON.stringify({
          id: ruleId,
          shop: session.shop,
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }
    }
  });

  const responseJson = await response.json();
  
  // Apply the rule to matching products
  await applyDiscountRule(request, ruleId);

  return JSON.parse(responseJson.data.metafieldsSet.metafields[0].value);
}

export async function applyDiscountRule(request: Request, ruleId: string): Promise<void> {
  const { admin } = await authenticate.admin(request);

  // Get the rule from metafields
  const response = await admin.graphql(`
    query getDiscountRule($namespace: String!, $key: String!) {
      shop {
        metafield(namespace: $namespace, key: $key) {
          value
        }
      }
    }
  `, {
    variables: {
      namespace: METAFIELD_NAMESPACE,
      key: ruleId
    }
  });

  const responseJson = await response.json();
  const rule = JSON.parse(responseJson.data.shop.metafield.value);

  if (!rule.isActive) return;

  // Build GraphQL query based on filters
  const filterConditions = rule.filters
    .map((filter: any) => {
      switch (filter.type) {
        case 'vendor':
          return `vendor:'${filter.value}'`;
        case 'tag':
          return `tag:'${filter.value}'`;
        case 'product':
          return `id:'${filter.value}'`;
        default:
          return '';
      }
    })
    .filter(Boolean)
    .join(' AND ');
  
  // Get matching products
  const productsResponse = await admin.graphql(`
    query getProducts($query: String!) {
      products(first: 250, query: $query) {
        edges {
          node {
            id
            title
            variants(first: 1) {
              edges {
                node {
                  id
                  price
                  compareAtPrice
                }
              }
            }
          }
        }
      }
    }
  `, {
    variables: {
      query: filterConditions,
    },
  });

  const products = await productsResponse.json();
  
  // Update product prices and store original prices in metafields
  for (const edge of products.data.products.edges) {
    const product = edge.node;
    const variant = product.variants.edges[0].node;
    const originalPrice = parseFloat(variant.price);
    const newPrice = rule.type === 'percentage' 
      ? originalPrice * (1 - rule.value / 100)
      : Math.max(0, originalPrice - rule.value);

    // Store original price in product metafield
    await admin.graphql(`
      mutation setOriginalPrice($input: MetafieldsSetInput!) {
        metafieldsSet(metafields: $input) {
          metafields {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `, {
      variables: {
        input: {
          namespace: METAFIELD_NAMESPACE,
          key: `original_price_${ruleId}`,
          type: "number_decimal",
          value: originalPrice.toString(),
          ownerId: product.id
        }
      }
    });

    // Update variant price
    await admin.graphql(`
      mutation productVariantUpdate($input: ProductVariantInput!) {
        productVariantUpdate(input: $input) {
          productVariant {
            id
            price
            compareAtPrice
          }
        }
      }
    `, {
      variables: {
        input: {
          id: variant.id,
          price: newPrice.toString(),
          compareAtPrice: originalPrice.toString(),
        },
      },
    });
  }
}

export async function getDiscountViews(request: Request): Promise<DiscountView[]> {
  const { admin } = await authenticate.admin(request);

  // Get all discount rules from metafields
  const response = await admin.graphql(`
    query getDiscountRules {
      shop {
        metafields(namespace: "${METAFIELD_NAMESPACE}", first: 100) {
          edges {
            node {
              key
              value
            }
          }
        }
      }
    }
  `);

  const responseJson = await response.json();
  const rules = responseJson.data.shop.metafields.edges
    .filter((edge: any) => edge.node.key.startsWith('rule_'))
    .map((edge: any) => JSON.parse(edge.node.value));

  // Get product counts and total discounts for each rule
  const views: DiscountView[] = [];
  
  for (const rule of rules) {
    const productsResponse = await admin.graphql(`
      query getProductCount($query: String!) {
        products(first: 0, query: $query) {
          edges {
            node {
              variants(first: 1) {
                edges {
                  node {
                    price
                    compareAtPrice
                  }
                }
              }
            }
          }
        }
      }
    `, {
      variables: {
        query: rule.filters
          .map((filter: any) => `${filter.type}:'${filter.value}'`)
          .join(' AND '),
      },
    });

    const productsJson = await productsResponse.json();
    const products = productsJson.data.products.edges;

    const totalDiscount = products.reduce((sum: number, edge: any) => {
      const variant = edge.node.variants.edges[0].node;
      const discount = parseFloat(variant.compareAtPrice) - parseFloat(variant.price);
      return sum + discount;
    }, 0);

    views.push({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      type: rule.type,
      value: rule.value,
      startDate: new Date(rule.startDate),
      endDate: rule.endDate ? new Date(rule.endDate) : null,
      isActive: rule.isActive,
      productCount: products.length,
      totalDiscount
    });
  }

  return views;
}