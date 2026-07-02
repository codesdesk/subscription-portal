# Invoice Subscription Shopify App

Custom single-store Shopify app for invoice-based subscription ordering. Customers can subscribe without storing a card; the app creates Shopify draft orders, completes them as payment-pending orders, and applies configured invoice/payment terms such as Net 30.

## Stack

- Node.js, TypeScript, React Router
- Shopify Admin GraphQL API
- Prisma ORM with PostgreSQL
- Shopify App Bridge embedded admin
- Shopify theme app extension
- Scheduled subscription order runner
- No Shopify app billing or recurring app payments

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in Shopify credentials, `DATABASE_URL`, `CRON_SECRET`, and optionally `SHOPIFY_PAYMENT_TERMS_TEMPLATE_ID`.

3. Update `shopify.app.toml` URLs and `client_id` for the Shopify app you connect with Shopify CLI.

4. Create the database tables:

   ```bash
   npm run prisma:migrate
   ```

5. Start local Shopify development for your one store:

   ```bash
   npm run dev
   ```

## Cron

Run this daily from your scheduler:

```bash
npm run cron:subscriptions
```

Or call the HTTP endpoint:

```bash
curl -X POST "$SHOPIFY_APP_URL/api/cron/subscriptions" \
  -H "Authorization: Bearer $CRON_SECRET"
```

The job processes active subscriptions whose `nextOrderDate` is due, skips paused/cancelled subscriptions, handles `skipNextOrder`, records order IDs, and advances the next order date to the 15th of the following valid month.

## Storefront Proxy

Configure the Shopify app proxy as:

- Prefix: `apps`
- Subpath: `subscription-portal`
- Proxy URL: your deployed app URL

The theme app extension posts to `/apps/subscription-portal/api/customer/subscriptions`; Shopify forwards that request to the app and includes signed customer context. Backend routes validate the proxy HMAC and use `logged_in_customer_id`, so customer filtering is enforced server-side.

## App Billing

This app is configured for `SingleMerchant` distribution and does not include Shopify Billing. There are no app subscription charges, usage charges, or recurring app payments.

## Payment Terms

Set `SHOPIFY_PAYMENT_TERMS_TEMPLATE_ID` to the merchant's Net 30 payment terms template ID. If it is omitted, the app still creates payment-pending orders, but no explicit payment terms are attached.
