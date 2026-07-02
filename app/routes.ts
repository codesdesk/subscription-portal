import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("auth/*", "routes/auth.$.tsx"),
  route("app", "routes/app.tsx", [
    index("routes/app._index.tsx"),
    route("subscriptions/:id", "routes/app.subscriptions.$id.tsx"),
  ]),
  route("api/admin/subscriptions", "routes/api.admin.subscriptions.ts"),
  route("api/admin/subscriptions/:id", "routes/api.admin.subscriptions.$id.ts"),
  route("api/admin/group-managers", "routes/api.admin.group-managers.ts"),
  route("api/admin/logs", "routes/api.admin.logs.ts"),
  route("api/customer/subscriptions", "routes/api.customer.subscriptions.ts"),
  route("api/customer/subscriptions/:id/action", "routes/api.customer.subscriptions.$id.action.ts"),
  route("api/customer/products", "routes/api.customer.products.ts"),
  route("api/group/subscriptions", "routes/api.group.subscriptions.ts"),
  route("api/cron/subscriptions", "routes/api.cron.subscriptions.ts"),
] satisfies RouteConfig;
