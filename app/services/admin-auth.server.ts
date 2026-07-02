import { authenticate } from "./shopify.server";

export async function requireAdmin(request: Request) {
  const auth = await authenticate.admin(request);
  return {
    admin: auth.admin,
    session: auth.session,
  };
}
