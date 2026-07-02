import "@shopify/shopify-app-react-router/adapters/node";

import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { ApiVersion, AppDistribution, shopifyApp } from "@shopify/shopify-app-react-router/server";
import { prisma } from "./db.server";

const appUrl = process.env.SHOPIFY_APP_URL;

if (!appUrl) {
  throw new Error("SHOPIFY_APP_URL is required");
}

export const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY ?? "",
  apiSecretKey: process.env.SHOPIFY_API_SECRET ?? "",
  apiVersion: ApiVersion.July26,
  scopes: (process.env.SCOPES ?? "").split(",").map((scope) => scope.trim()).filter(Boolean),
  appUrl,
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.SingleMerchant,
});

export const authenticate = shopify.authenticate;
