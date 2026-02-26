"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ShieldAlertIcon, HomeIcon } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0e1a] text-[#e8eaf0]">
      <ShieldAlertIcon className="mb-6 h-16 w-16 text-[#3b82f6]" />
      <h1 className="mb-2 text-4xl font-bold">404</h1>
      <p className="mb-8 text-lg text-[#8892b0]">
        Page not found. The resource you&apos;re looking for doesn&apos;t exist.
      </p>
      <Button asChild>
        <Link href="/">
          <HomeIcon className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
      </Button>
    </div>
  )
}
