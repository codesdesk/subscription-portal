import { requireAppProxyCustomer } from "~/services/app-proxy-auth.server";
import { customerIdsForGroupTag } from "~/services/shopify-data.server";
import { assertGroupManager, listGroupSubscriptions } from "~/services/subscriptions.server";

export async function loader({ request }: { request: Request }) {
  const customer = requireAppProxyCustomer(request);
  const groups = await assertGroupManager(customer.shop, customer.customerId);
  const subscriptions = await listGroupSubscriptions(customer.shop, customer.customerId);
  const customersByGroup = await Promise.all(
    groups.map(async (group) => ({
      groupTag: group.groupTag,
      customers: await customerIdsForGroupTag(customer.shop, group.groupTag),
    })),
  );

  return Response.json({ groups, customersByGroup, subscriptions });
}
