import { LineItemStatus, Prisma, SubscriptionStatus } from "@prisma/client";
import { prisma } from "./db.server";
import { followingMonthlyOrderDate, initialNextOrderDate } from "./dates.server";
import { createInvoiceOrder } from "./orders.server";
import { getCustomerTagsOffline, getVisibleProductsForCustomer } from "./shopify-data.server";

export async function createSubscription(params: {
  shop: string;
  customerId: string;
  startType: "immediately" | "next_month";
  lineItems: Array<{
    shopifyProductId: string;
    shopifyVariantId: string;
    title: string;
    sku?: string | null;
    quantity: number;
    price: string | number | Prisma.Decimal;
    tags: string[];
  }>;
}) {
  const subscription = await prisma.subscription.create({
    data: {
      shop: params.shop,
      shopifyCustomerId: params.customerId,
      startType: params.startType,
      nextOrderDate: initialNextOrderDate(params.startType),
      lineItems: {
        create: params.lineItems.map((line) => ({
          shopifyProductId: line.shopifyProductId,
          shopifyVariantId: line.shopifyVariantId,
          title: line.title,
          sku: line.sku,
          quantity: line.quantity,
          price: line.price,
          tags: line.tags,
        })),
      },
    },
    include: { lineItems: true },
  });

  await createOrderForSubscription(subscription.id, "initial");
  return subscription;
}

export async function listCustomerSubscriptions(shop: string, customerId: string) {
  return prisma.subscription.findMany({
    where: { shop, shopifyCustomerId: customerId },
    orderBy: { createdAt: "desc" },
    include: { lineItems: true, orders: { orderBy: { createdAt: "desc" } } },
  });
}

export async function listAdminSubscriptions(shop: string, filters: URLSearchParams) {
  const status = filters.get("status") as SubscriptionStatus | null;
  const customer = filters.get("customer");
  const tag = filters.get("tag");

  return prisma.subscription.findMany({
    where: {
      shop,
      ...(status ? { status } : {}),
      ...(customer ? { shopifyCustomerId: { contains: customer } } : {}),
      ...(tag ? { lineItems: { some: { tags: { has: tag } } } } : {}),
    },
    orderBy: { nextOrderDate: "asc" },
    include: { lineItems: true, orders: { orderBy: { createdAt: "desc" }, take: 5 } },
  });
}

export async function getSubscriptionForAdmin(shop: string, id: string) {
  return prisma.subscription.findFirst({
    where: { shop, id },
    include: { lineItems: true, orders: { orderBy: { createdAt: "desc" } } },
  });
}

export async function customerCanAccessSubscription(shop: string, customerId: string, subscriptionId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { shop, id: subscriptionId },
    select: { shopifyCustomerId: true },
  });
  return subscription?.shopifyCustomerId === customerId;
}

export async function updateSubscriptionStatus(params: {
  shop: string;
  subscriptionId: string;
  status: SubscriptionStatus;
  actorCustomerId?: string;
  actorAdminId?: string;
}) {
  const updated = await prisma.subscription.update({
    where: { id: params.subscriptionId, shop: params.shop },
    data: { status: params.status },
  });

  await audit(params.shop, `subscription.${params.status}`, {
    customerId: params.actorCustomerId,
    adminUserId: params.actorAdminId,
    details: { subscriptionId: params.subscriptionId },
  });

  return updated;
}

export async function skipNextOrder(params: {
  shop: string;
  subscriptionId: string;
  actorCustomerId?: string;
  actorAdminId?: string;
}) {
  const updated = await prisma.subscription.update({
    where: { id: params.subscriptionId, shop: params.shop },
    data: { skipNextOrder: true },
  });

  await audit(params.shop, "subscription.skip_next_order", {
    customerId: params.actorCustomerId,
    adminUserId: params.actorAdminId,
    details: { subscriptionId: params.subscriptionId },
  });

  return updated;
}

export async function updateLineQuantity(params: {
  shop: string;
  subscriptionId: string;
  lineItemId: string;
  quantity: number;
  actorCustomerId?: string;
  actorAdminId?: string;
}) {
  await assertSubscriptionInShop(params.shop, params.subscriptionId);
  const updated = await prisma.subscriptionLineItem.update({
    where: { id: params.lineItemId, subscriptionId: params.subscriptionId },
    data: { quantity: params.quantity },
  });

  await audit(params.shop, "subscription.quantity_update", {
    customerId: params.actorCustomerId,
    adminUserId: params.actorAdminId,
    details: { subscriptionId: params.subscriptionId, lineItemId: params.lineItemId, quantity: params.quantity },
  });

  return updated;
}

export async function addProductToSubscription(params: {
  shop: string;
  customerId: string;
  subscriptionId: string;
  productId: string;
  variantId: string;
  quantity: number;
}) {
  const subscription = await prisma.subscription.findFirstOrThrow({
    where: { id: params.subscriptionId, shop: params.shop, shopifyCustomerId: params.customerId },
  });

  const products = await getVisibleProductsForCustomer(params.shop, params.customerId);
  const product = products.find((candidate) => candidate.id === params.productId);
  const variant = product?.variants.nodes.find((candidate) => candidate.id === params.variantId);
  if (!product || !variant) {
    throw new Response("Product is not available for this customer", { status: 403 });
  }

  const line = await prisma.subscriptionLineItem.create({
    data: {
      subscriptionId: subscription.id,
      shopifyProductId: product.id,
      shopifyVariantId: variant.id,
      title: `${product.title}${variant.title === "Default Title" ? "" : ` - ${variant.title}`}`,
      sku: variant.sku,
      quantity: params.quantity,
      price: variant.price,
      tags: product.tags,
    },
  });

  await audit(params.shop, "subscription.product_add", {
    customerId: params.customerId,
    details: { subscriptionId: params.subscriptionId, lineItemId: line.id },
  });

  return line;
}

export async function removeProductFromSubscription(params: {
  shop: string;
  subscriptionId: string;
  lineItemId: string;
  actorCustomerId?: string;
  actorAdminId?: string;
}) {
  await assertSubscriptionInShop(params.shop, params.subscriptionId);
  const line = await prisma.subscriptionLineItem.update({
    where: { id: params.lineItemId, subscriptionId: params.subscriptionId },
    data: { status: LineItemStatus.removed },
  });

  await audit(params.shop, "subscription.product_remove", {
    customerId: params.actorCustomerId,
    adminUserId: params.actorAdminId,
    details: { subscriptionId: params.subscriptionId, lineItemId: params.lineItemId },
  });

  return line;
}

export async function runDueSubscriptionOrders(now = new Date()) {
  const due = await prisma.subscription.findMany({
    where: {
      status: SubscriptionStatus.active,
      nextOrderDate: { lte: now },
    },
    include: {
      lineItems: { where: { status: LineItemStatus.active } },
    },
  });

  const results = [];
  for (const subscription of due) {
    if (subscription.skipNextOrder) {
      await prisma.$transaction([
        prisma.subscription.update({
          where: { id: subscription.id },
          data: { skipNextOrder: false, nextOrderDate: followingMonthlyOrderDate(subscription.nextOrderDate) },
        }),
        prisma.subscriptionOrder.create({
          data: {
            subscriptionId: subscription.id,
            orderDate: now,
            status: "skipped",
            invoiceStatus: "SKIPPED_BY_CUSTOMER",
          },
        }),
      ]);
      results.push({ subscriptionId: subscription.id, status: "skipped" });
      continue;
    }

    try {
      const order = await createOrderForSubscription(subscription.id, "recurring", now);
      results.push({ subscriptionId: subscription.id, status: "created", order });
    } catch (error) {
      await prisma.subscriptionOrder.create({
        data: {
          subscriptionId: subscription.id,
          orderDate: now,
          status: "failed",
          invoiceStatus: "FAILED",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        },
      });
      results.push({ subscriptionId: subscription.id, status: "failed" });
    }
  }

  return results;
}

export async function createOrderForSubscription(subscriptionId: string, reason: "initial" | "recurring", now = new Date()) {
  const subscription = await prisma.subscription.findUniqueOrThrow({
    where: { id: subscriptionId },
    include: { lineItems: { where: { status: LineItemStatus.active } } },
  });

  if (subscription.lineItems.length === 0) {
    throw new Error("Subscription has no active line items");
  }

  const order = await createInvoiceOrder({
    shop: subscription.shop,
    customerId: subscription.shopifyCustomerId,
    subscriptionId: subscription.id,
    lines: subscription.lineItems,
  });

  await prisma.$transaction([
    prisma.subscriptionOrder.create({
      data: {
        subscriptionId,
        shopifyOrderId: order.shopifyOrderId,
        orderDate: now,
        status: "created",
        invoiceStatus: order.invoiceStatus,
      },
    }),
    ...(reason === "recurring"
      ? [
          prisma.subscription.update({
            where: { id: subscriptionId },
            data: { nextOrderDate: followingMonthlyOrderDate(subscription.nextOrderDate) },
          }),
        ]
      : []),
  ]);

  await audit(subscription.shop, `subscription.order_${reason}`, {
    customerId: subscription.shopifyCustomerId,
    details: { subscriptionId, shopifyOrderId: order.shopifyOrderId },
  });

  return order;
}

export async function assertGroupManager(shop: string, managerCustomerId: string) {
  return prisma.customerGroup.findMany({
    where: { shop, managerCustomerId },
    orderBy: { groupTag: "asc" },
  });
}

export async function listGroupSubscriptions(shop: string, managerCustomerId: string) {
  const groups = await assertGroupManager(shop, managerCustomerId);
  if (groups.length === 0) return [];

  const managerTags = groups.map((group) => group.groupTag);
  const customerTags = await getCustomerTagsOffline(shop, managerCustomerId);
  const allowed = managerTags.filter((tag) => customerTags.includes(tag));
  if (allowed.length === 0) return [];

  return prisma.subscription.findMany({
    where: {
      shop,
      lineItems: { some: { tags: { hasSome: allowed } } },
    },
    include: { lineItems: true, orders: { orderBy: { createdAt: "desc" } } },
  });
}

async function assertSubscriptionInShop(shop: string, subscriptionId: string) {
  await prisma.subscription.findFirstOrThrow({ where: { shop, id: subscriptionId } });
}

async function audit(
  shop: string,
  action: string,
  params: { customerId?: string; adminUserId?: string; details?: Prisma.InputJsonValue },
) {
  await prisma.auditLog.create({
    data: {
      shop,
      action,
      customerId: params.customerId,
      adminUserId: params.adminUserId,
      details: params.details ?? Prisma.JsonNull,
    },
  });
}
