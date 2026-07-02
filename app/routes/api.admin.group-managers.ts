import { requireAdmin } from "~/services/admin-auth.server";
import { prisma } from "~/services/db.server";

export async function loader({ request }: { request: Request }) {
  const { session } = await requireAdmin(request);
  return Response.json({
    groups: await prisma.customerGroup.findMany({
      where: { shop: session.shop },
      orderBy: [{ groupTag: "asc" }, { createdAt: "desc" }],
    }),
  });
}

export async function action({ request }: { request: Request }) {
  const { session } = await requireAdmin(request);
  const body = await request.json();

  const group = await prisma.customerGroup.upsert({
    where: {
      shop_groupTag_managerCustomerId: {
        shop: session.shop,
        groupTag: body.groupTag,
        managerCustomerId: body.managerCustomerId,
      },
    },
    update: {},
    create: {
      shop: session.shop,
      groupTag: body.groupTag,
      managerCustomerId: body.managerCustomerId,
    },
  });

  await prisma.auditLog.create({
    data: {
      shop: session.shop,
      action: "group_manager.assign",
      details: { groupTag: body.groupTag, managerCustomerId: body.managerCustomerId },
    },
  });

  return Response.json({ group });
}
