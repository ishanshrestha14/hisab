import { createAuthClient } from "better-auth/react";

// Better Auth client — generates typed hooks and methods
// baseURL points to our Hono API (proxied through Vite in dev)
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3001",
});

// Named exports for convenience
export const { signIn, signUp, signOut, useSession } = authClient;
