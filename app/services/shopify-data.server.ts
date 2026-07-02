import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import { adminGraphql, offlineGraphql } from "./shopify-graphql.server";

type CustomerTagsResult = {
  customer: { id: string; tags: string[] } | null;
};

type ProductsResult = {
  products: {
    nodes: Array<{
      id: string;
      title: string;
      tags: string[];
      variants: {
        nodes: Array<{ id: string; title: string; sku: string | null; price: string }>;
      };
    }>;
  };
};

export async function getCustomerTags(admin: AdminApiContext, customerId: string) {
  const data = await adminGraphql<CustomerTagsResult>(
    admin,
    `#graphql
      query CustomerTags($id: ID!) {
        customer(id: $id) {
          id
          tags
        }
      }
    `,
    { id: customerId },
  );
  return data.customer?.tags ?? [];
}

export async function getCustomerTagsOffline(shop: string, customerId: string) {
  const data = await offlineGraphql<CustomerTagsResult>(
    shop,
    `#graphql
      query CustomerTags($id: ID!) {
        customer(id: $id) {
          id
          tags
        }
      }
    `,
    { id: customerId },
  );
  return data.customer?.tags ?? [];
}

export async function getVisibleProductsForCustomer(shop: string, customerId: string) {
  const customerTags = await getCustomerTagsOffline(shop, customerId);
  if (customerTags.length === 0) return [];

  const data = await offlineGraphql<ProductsResult>(
    shop,
    `#graphql
      query Products {
        products(first: 100, query: "status:active") {
          nodes {
            id
            title
            tags
            variants(first: 20) {
              nodes {
                id
                title
                sku
                price
              }
            }
          }
        }
      }
    `,
  );

  const allowed = new Set(customerTags.map((tag) => tag.toLowerCase()));
  return data.products.nodes.filter((product) =>
    product.tags.some((tag) => allowed.has(tag.toLowerCase())),
  );
}

export async function customerIdsForGroupTag(shop: string, groupTag: string) {
  const data = await offlineGraphql<{
    customers: { nodes: Array<{ id: string; displayName: string; email: string | null; tags: string[] }> };
  }>(
    shop,
    `#graphql
      query GroupCustomers($query: String!) {
        customers(first: 100, query: $query) {
          nodes {
            id
            displayName
            email
            tags
          }
        }
      }
    `,
    { query: `tag:'${groupTag.replaceAll("'", "\\'")}'` },
  );

  return data.customers.nodes;
}
