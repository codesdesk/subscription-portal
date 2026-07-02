import { requireAdmin } from "~/services/admin-auth.server";
import { prisma } from "~/services/db.server";

export async function loader({ request }: { request: Request }) {
  const { session } = await requireAdmin(request);
  const logs = await prisma.auditLog.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const failedOrders = await prisma.subscriptionOrder.findMany({
    where: { subscription: { shop: session.shop }, status: "failed" },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return Response.json({ logs, failedOrders });
}
