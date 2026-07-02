import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "~/services/shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);
  return null;
}
