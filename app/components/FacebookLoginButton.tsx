"use client"

import { Button } from "@/app/components/ui/button"
import { Link2 } from "lucide-react"

export default function FacebookLoginButton({ reconnect = false }: { reconnect?: boolean }) {
  const handleClick = () => {
    window.location.assign("/api/auth/facebook/login")
  }

  return (
    <Button onClick={handleClick} size="lg">
      <Link2 className="size-4" />
      {reconnect ? "Reconnect Facebook" : "Connect Facebook"}
    </Button>
  )
}
