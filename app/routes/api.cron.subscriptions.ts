import { runDueSubscriptionOrders } from "~/services/subscriptions.server";

export async function action({ request }: { request: Request }) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return Response.json({ results: await runDueSubscriptionOrders() });
}
