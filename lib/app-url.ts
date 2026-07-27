export function getAppUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  const value = configuredUrl || (process.env.NODE_ENV === "production" ? undefined : "http://localhost:3000")

  if (!value) {
    throw new Error("NEXT_PUBLIC_APP_URL must be configured in production.")
  }

  const url = new URL(value)

  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_APP_URL must use HTTPS in production.")
  }

  return url.origin
}