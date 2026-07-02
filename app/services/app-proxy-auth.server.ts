import crypto from "node:crypto";

export type CustomerContext = {
  shop: string;
  customerId: string;
};

export function requireAppProxyCustomer(request: Request): CustomerContext {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const customerId = url.searchParams.get("logged_in_customer_id");

  if (!shop || !customerId) {
    throw new Response("Customer login required", { status: 401 });
  }

  if (!isValidShopifyHmac(url.searchParams)) {
    throw new Response("Invalid signature", { status: 401 });
  }

  return {
    shop,
    customerId: `gid://shopify/Customer/${customerId}`,
  };
}

function isValidShopifyHmac(params: URLSearchParams) {
  const secret = process.env.SHOPIFY_API_SECRET;
  const hmac = params.get("hmac");

  if (!secret || !hmac) return false;

  const message = [...params.entries()]
    .filter(([key]) => key !== "hmac" && key !== "signature")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const digest = crypto.createHmac("sha256", secret).update(message).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest, "hex"), Buffer.from(hmac, "hex"));
}
