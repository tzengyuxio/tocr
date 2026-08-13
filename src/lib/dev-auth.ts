// Never honoured in production: this flag switches off every check in
// middleware.ts, which is the only authorisation layer the app has. Vercel
// freezes environment variables at deploy time, so a misconfigured production
// value would stay live until the next redeploy.
export const isDevBypass =
  process.env.NODE_ENV !== "production" &&
  process.env.DEV_BYPASS_AUTH === "true";

export const DEV_USER = {
  id: "dev-user",
  email: "dev@localhost",
  name: "Dev User",
  image: null,
  role: "ADMIN" as const,
};
