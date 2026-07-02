import { requireAppProxyCustomer } from "~/services/app-proxy-auth.server";
import {
  addProductToSubscription,
  customerCanAccessSubscription,
  removeProductFromSubscription,
  skipNextOrder,
  updateLineQuantity,
  updateSubscriptionStatus,
} from "~/services/subscriptions.server";

export async function action({ request, params }: { request: Request; params: { id: string } }) {
  const customer = requireAppProxyCustomer(request);
  const body = await request.json();
  const allowed = await customerCanAccessSubscription(customer.shop, customer.customerId, params.id);

  if (!allowed) throw new Response("Forbidden", { status: 403 });

  if (body.intent === "pause" || body.intent === "resume" || body.intent === "cancel") {
    return Response.json({
      subscription: await updateSubscriptionStatus({
        shop: customer.shop,
        subscriptionId: params.id,
        status: body.intent === "resume" ? "active" : body.intent === "pause" ? "paused" : "cancelled",
        actorCustomerId: customer.customerId,
      }),
    });
  }

  if (body.intent === "skip") {
    return Response.json({
      subscription: await skipNextOrder({
        shop: customer.shop,
        subscriptionId: params.id,
        actorCustomerId: customer.customerId,
      }),
    });
  }

  if (body.intent === "quantity") {
    return Response.json({
      lineItem: await updateLineQuantity({
        shop: customer.shop,
        subscriptionId: params.id,
        lineItemId: body.lineItemId,
        quantity: Number(body.quantity),
        actorCustomerId: customer.customerId,
      }),
    });
  }

  if (body.intent === "add_product") {
    return Response.json({
      lineItem: await addProductToSubscription({
        shop: customer.shop,
        customerId: customer.customerId,
        subscriptionId: params.id,
        productId: body.productId,
        variantId: body.variantId,
        quantity: Number(body.quantity),
      }),
    });
  }

  if (body.intent === "remove_product") {
    return Response.json({
      lineItem: await removeProductFromSubscription({
        shop: customer.shop,
        subscriptionId: params.id,
        lineItemId: body.lineItemId,
        actorCustomerId: customer.customerId,
      }),
    });
  }

  throw new Response("Unsupported action", { status: 400 });
}
