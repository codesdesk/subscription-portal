import { Form, redirect, useLoaderData } from "react-router";
import { Badge, BlockStack, ButtonGroup, Card, Layout, Page, Text } from "@shopify/polaris";
import { requireAdmin } from "~/services/admin-auth.server";
import {
  getSubscriptionForAdmin,
  removeProductFromSubscription,
  skipNextOrder,
  updateLineQuantity,
  updateSubscriptionStatus,
} from "~/services/subscriptions.server";

type LoaderData = Awaited<ReturnType<typeof getSerializedSubscription>>;

export async function loader({ request, params }: { request: Request; params: { id: string } }) {
  const { session } = await requireAdmin(request);
  const subscription = await getSubscriptionForAdmin(session.shop, params.id);
  if (!subscription) throw new Response("Not found", { status: 404 });
  return Response.json({ subscription });
}

export async function action({ request, params }: { request: Request; params: { id: string } }) {
  const { session } = await requireAdmin(request);
  const form = await request.formData();
  const intent = String(form.get("intent"));

  if (intent === "pause" || intent === "resume" || intent === "cancel") {
    await updateSubscriptionStatus({
      shop: session.shop,
      subscriptionId: params.id,
      status: intent === "resume" ? "active" : intent === "pause" ? "paused" : "cancelled",
    });
  }

  if (intent === "skip") {
    await skipNextOrder({ shop: session.shop, subscriptionId: params.id });
  }

  if (intent === "quantity") {
    await updateLineQuantity({
      shop: session.shop,
      subscriptionId: params.id,
      lineItemId: String(form.get("lineItemId")),
      quantity: Number(form.get("quantity")),
    });
  }

  if (intent === "remove") {
    await removeProductFromSubscription({
      shop: session.shop,
      subscriptionId: params.id,
      lineItemId: String(form.get("lineItemId")),
    });
  }

  return redirect(`/app/subscriptions/${params.id}`);
}

export default function SubscriptionDetail() {
  const { subscription } = useLoaderData() as LoaderData;

  return (
    <Page title="Subscription detail" backAction={{ content: "Subscriptions", url: "/app" }}>
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="p">Customer: {subscription.shopifyCustomerId}</Text>
                <Text as="p">Next order: {String(subscription.nextOrderDate).slice(0, 10)}</Text>
                <Badge tone={subscription.status === "active" ? "success" : "attention"}>{subscription.status}</Badge>
                <Form method="post">
                  <ButtonGroup>
                    <button type="submit" name="intent" value="pause">Pause</button>
                    <button type="submit" name="intent" value="resume">Resume</button>
                    <button type="submit" name="intent" value="skip">Skip next</button>
                    <button type="submit" name="intent" value="cancel">Cancel</button>
                  </ButtonGroup>
                </Form>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section>
            <Card>
              <table className="plain-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Quantity</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscription.lineItems.map((line) => (
                    <tr key={line.id}>
                      <td>{line.title}</td>
                      <td>{line.sku}</td>
                      <td>{line.quantity}</td>
                      <td>{line.status}</td>
                      <td>
                        <Form method="post">
                          <input type="hidden" name="lineItemId" value={line.id} />
                          <input type="number" min="1" name="quantity" defaultValue={line.quantity} />
                          <button type="submit" name="intent" value="quantity">Update</button>
                          <button type="submit" name="intent" value="remove">Remove</button>
                        </Form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </Layout.Section>
          <Layout.Section>
            <Card>
              <table className="plain-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {subscription.orders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.shopifyOrderId ?? order.errorMessage}</td>
                      <td>{String(order.orderDate).slice(0, 10)}</td>
                      <td>{order.status}</td>
                      <td>{order.invoiceStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </Layout.Section>
        </Layout>
    </Page>
  );
}

async function getSerializedSubscription() {
  return {
    subscription: {} as NonNullable<Awaited<ReturnType<typeof getSubscriptionForAdmin>>>,
  };
}
