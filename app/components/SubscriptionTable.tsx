import { Badge, Button, ButtonGroup, Card, Text } from "@shopify/polaris";
import type { Subscription, SubscriptionLineItem, SubscriptionOrder } from "@prisma/client";

type Row = Subscription & {
  nextOrderDate: Date | string;
  lineItems: SubscriptionLineItem[];
  orders: Array<SubscriptionOrder & { orderDate: Date | string }>;
};

export function SubscriptionTable({ subscriptions }: { subscriptions: Row[] }) {
  return (
    <Card>
      <table className="plain-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Status</th>
            <th>Products</th>
            <th>Next order</th>
            <th>Recent order</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {subscriptions.map((subscription) => (
            <tr key={subscription.id}>
              <td>
                <Text as="span" variant="bodyMd">
                  {subscription.shopifyCustomerId.replace("gid://shopify/Customer/", "#")}
                </Text>
              </td>
              <td>
                <Badge tone={subscription.status === "active" ? "success" : subscription.status === "paused" ? "attention" : "critical"}>
                  {subscription.status}
                </Badge>
              </td>
              <td>
                {subscription.lineItems.map((line) => (
                  <div key={line.id}>
                    {line.title} x {line.quantity}
                  </div>
                ))}
              </td>
              <td>{formatDate(subscription.nextOrderDate)}</td>
              <td>{subscription.orders[0]?.shopifyOrderId ?? "None yet"}</td>
              <td>
                <ButtonGroup variant="segmented">
                  <Button url={`/app/subscriptions/${subscription.id}`}>Open</Button>
                </ButtonGroup>
              </td>
            </tr>
          ))}
          {subscriptions.length === 0 ? (
            <tr>
              <td colSpan={6}>No subscriptions found.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </Card>
  );
}

function formatDate(value: Date | string) {
  return typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);
}
