import { runDueSubscriptionOrders } from "../app/services/subscriptions.server";

const results = await runDueSubscriptionOrders();
console.log(JSON.stringify({ processed: results.length, results }, null, 2));
