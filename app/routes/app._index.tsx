import { useLoaderData } from "react-router";
import { BlockStack, Card, Layout, Page, Text } from "@shopify/polaris";
import { requireAdmin } from "~/services/admin-auth.server";
import { listAdminSubscriptions } from "~/services/subscriptions.server";
import { prisma } from "~/services/db.server";
import { SubscriptionTable } from "~/components/SubscriptionTable";

type LoaderData = {
  subscriptions: Parameters<typeof SubscriptionTable>[0]["subscriptions"];
  metrics: { active: number; paused: number; cancelled: number; failedOrders: number };
};

export async function loader({ request }: { request: Request }) {
  const { session } = await requireAdmin(request);
  const url = new URL(request.url);
  const subscriptions = await listAdminSubscriptions(session.shop, url.searchParams);
  const [active, paused, cancelled, failedOrders] = await Promise.all([
    prisma.subscription.count({ where: { shop: session.shop, status: "active" } }),
    prisma.subscription.count({ where: { shop: session.shop, status: "paused" } }),
    prisma.subscription.count({ where: { shop: session.shop, status: "cancelled" } }),
    prisma.subscriptionOrder.count({ where: { subscription: { shop: session.shop }, status: "failed" } }),
  ]);

  return Response.json({ subscriptions, metrics: { active, paused, cancelled, failedOrders } });
}

export default function AdminDashboard() {
  const { subscriptions, metrics } = useLoaderData() as LoaderData;

  return (
    <Page title="Invoice subscriptions" subtitle="Monthly invoice-based subscription ordering">
        <Layout>
          <Layout.Section>
            <div className="metric-grid">
              <Metric label="Active" value={metrics.active} />
              <Metric label="Paused" value={metrics.paused} />
              <Metric label="Cancelled" value={metrics.cancelled} />
              <Metric label="Failed orders" value={metrics.failedOrders} />
            </div>
          </Layout.Section>
          <Layout.Section>
            <SubscriptionTable subscriptions={subscriptions} />
          </Layout.Section>
        </Layout>
    </Page>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <BlockStack gap="200">
        <Text as="p" variant="bodySm" tone="subdued">
          {label}
        </Text>
        <Text as="p" variant="heading2xl">
          {value}
        </Text>
      </BlockStack>
    </Card>
  );
}
