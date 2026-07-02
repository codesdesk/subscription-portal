import { requireAdmin } from "~/services/admin-auth.server";
import {
  getSubscriptionForAdmin,
  removeProductFromSubscription,
  skipNextOrder,
  updateLineQuantity,
  updateSubscriptionStatus,
} from "~/services/subscriptions.server";

export async function loader({ request, params }: { request: Request; params: { id: string } }) {
  const { session } = await requireAdmin(request);
  const subscription = await getSubscriptionForAdmin(session.shop, params.id);
  if (!subscription) throw new Response("Not found", { status: 404 });
  return Response.json({ subscription });
}

export async function action({ request, params }: { request: Request; params: { id: string } }) {
  const { session } = await requireAdmin(request);
  const body = await request.json();

  if (body.status) {
    return Response.json({
      subscription: await updateSubscriptionStatus({
        shop: session.shop,
        subscriptionId: params.id,
        status: body.status,
      }),
    });
  }

  if (body.skipNextOrder) {
    return Response.json({ subscription: await skipNextOrder({ shop: session.shop, subscriptionId: params.id }) });
  }

  if (body.lineItemId && body.quantity) {
    return Response.json({
      lineItem: await updateLineQuantity({
        shop: session.shop,
        subscriptionId: params.id,
        lineItemId: body.lineItemId,
        quantity: Number(body.quantity),
      }),
    });
  }

  if (body.removeLineItemId) {
    return Response.json({
      lineItem: await removeProductFromSubscription({
        shop: session.shop,
        subscriptionId: params.id,
        lineItemId: body.removeLineItemId,
      }),
    });
  }

  throw new Response("Unsupported action", { status: 400 });
}
