import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import { prisma } from "./db.server";

type GraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

export async function adminGraphql<T>(
  admin: AdminApiContext,
  query: string,
  variables?: Record<string, unknown>,
) {
  const response = await admin.graphql(query, { variables });
  const json = (await response.json()) as GraphqlResponse<T>;

  if (json.errors?.length) {
    throw new Error(json.errors.map((error) => error.message).join("; "));
  }

  if (!json.data) {
    throw new Error("Shopify GraphQL response did not include data");
  }

  return json.data;
}

export async function offlineGraphql<T>(
  shop: string,
  query: string,
  variables?: Record<string, unknown>,
) {
  const session = await prisma.session.findFirst({
    where: { shop, isOnline: false },
    orderBy: { id: "desc" },
  });

  if (!session?.accessToken) {
    throw new Error(`No offline Shopify session found for ${shop}`);
  }

  const response = await fetch(`https://${shop}/admin/api/2026-07/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": session.accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = (await response.json()) as GraphqlResponse<T>;
  if (!response.ok || json.errors?.length) {
    throw new Error(json.errors?.map((error) => error.message).join("; ") || response.statusText);
  }

  if (!json.data) {
    throw new Error("Shopify GraphQL response did not include data");
  }

  return json.data;
}
