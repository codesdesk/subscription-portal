import { requireAppProxyCustomer } from "~/services/app-proxy-auth.server";
import { getVisibleProductsForCustomer } from "~/services/shopify-data.server";

export async function loader({ request }: { request: Request }) {
  const customer = requireAppProxyCustomer(request);
  return Response.json({ products: await getVisibleProductsForCustomer(customer.shop, customer.customerId) });
}
