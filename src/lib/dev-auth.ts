export const isDevBypass = process.env.DEV_BYPASS_AUTH === "true";

export const DEV_USER = {
  id: "dev-user",
  email: "dev@localhost",
  name: "Dev User",
  image: null,
  role: "ADMIN" as const,
};
