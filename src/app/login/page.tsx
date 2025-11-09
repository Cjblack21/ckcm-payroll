"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useTheme } from "next-themes"
import { Sun, Moon, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LoginForm } from "@/components/login-form"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function LoginPage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a1628]">
      {/* Enhanced Theme Toggle with Dropdown */}
      {mounted && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-6 right-6 z-50 h-10 w-10 rounded-full bg-slate-800/90 hover:bg-slate-700 transition-all duration-300 border border-slate-700"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0 text-amber-500" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100 text-slate-400" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 bg-slate-800/95 backdrop-blur-md border-slate-700">
            <DropdownMenuItem 
              onClick={() => setTheme("light")}
              className="cursor-pointer gap-2 text-slate-300"
            >
              <Sun className="h-4 w-4 text-amber-500" />
              <span>Light</span>
              {theme === "light" && <span className="ml-auto text-xs">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setTheme("dark")}
              className="cursor-pointer gap-2 text-slate-300"
            >
              <Moon className="h-4 w-4 text-slate-400" />
              <span>Dark</span>
              {theme === "dark" && <span className="ml-auto text-xs">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setTheme("system")}
              className="cursor-pointer gap-2 text-slate-300"
            >
              <Monitor className="h-4 w-4 text-slate-500" />
              <span>System</span>
              {theme === "system" && <span className="ml-auto text-xs">✓</span>}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Main Content */}
      <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center space-y-6">
            {/* Logo */}
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center">
                <Image
                  src="/ckcm.png"
                  alt="CKCM Logo"
                  width={48}
                  height={48}
                  className="h-12 w-12"
                  unoptimized
                />
              </div>
            </div>

            {/* Title */}
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-white">
                CKCM Payroll
              </h1>
              <p className="text-sm text-slate-400">
                Sign in to continue to your account
              </p>
            </div>

            {/* Login Card */}
            <div className="w-full bg-[#0f1f3a] rounded-2xl p-8 border border-slate-800">
              <LoginForm />
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-slate-500">
              © 2025 CKCM. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
