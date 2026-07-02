import { requireAppProxyCustomer } from "~/services/app-proxy-auth.server";
import { createSubscription, listCustomerSubscriptions } from "~/services/subscriptions.server";

export async function loader({ request }: { request: Request }) {
  const customer = requireAppProxyCustomer(request);
  return Response.json({ subscriptions: await listCustomerSubscriptions(customer.shop, customer.customerId) });
}

export async function action({ request }: { request: Request }) {
  const customer = requireAppProxyCustomer(request);
  const body = await request.json();

  const subscription = await createSubscription({
    shop: customer.shop,
    customerId: customer.customerId,
    startType: body.startType,
    lineItems: body.lineItems,
  });

  return Response.json({ subscription });
}
