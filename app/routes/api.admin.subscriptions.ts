import { requireAdmin } from "~/services/admin-auth.server";
import { listAdminSubscriptions } from "~/services/subscriptions.server";

export async function loader({ request }: { request: Request }) {
  const { session } = await requireAdmin(request);
  const url = new URL(request.url);
  return Response.json({ subscriptions: await listAdminSubscriptions(session.shop, url.searchParams) });
}
