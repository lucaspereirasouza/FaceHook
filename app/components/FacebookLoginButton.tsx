"use client"

import { type FormEvent, useState } from "react"
import { Button } from "@/app/components/ui/button"
import { Link2, LoaderCircle } from "lucide-react"

type LoginResponse = {
  message?: string
}

export default function FacebookLoginButton({ reconnect = false }: { reconnect?: boolean }) {
  const [accessToken, setAccessToken] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const token = accessToken.trim()

    if (!token) {
      setError("Enter a Facebook user access token.")
      return
    }

    setError("")
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/auth/facebook/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: token }),
      })
      const payload = (await response.json().catch(() => ({}))) as LoginResponse

      if (!response.ok) {
        setError(payload.message ?? "Facebook could not connect that access token.")
        return
      }

      window.location.assign("/")
    } catch {
      setError("Facebook could not be reached. Try again shortly.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid w-full max-w-xl gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="space-y-1.5">
        <label htmlFor="facebook-access-token" className="text-sm font-medium">
          Facebook user access token
        </label>
        <input
          id="facebook-access-token"
          type="password"
          value={accessToken}
          onChange={(event) => setAccessToken(event.target.value)}
          placeholder="Paste your access token"
          autoComplete="off"
          spellCheck={false}
          disabled={isSubmitting}
          aria-describedby={error ? "facebook-access-token-error" : undefined}
          className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        {error ? (
          <p id="facebook-access-token-error" role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
      <Button type="submit" size="lg" disabled={isSubmitting} className="self-end">
        {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : <Link2 className="size-4" />}
        {isSubmitting ? "Connecting..." : reconnect ? "Update token" : "Connect token"}
      </Button>
    </form>
  )
}
