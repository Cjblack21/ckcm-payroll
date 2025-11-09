"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { Sun, Moon, Monitor, Settings } from "lucide-react"
import { LoginForm } from "@/components/login-form"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function Home() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden flex">
      {/* Theme Toggle */}
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

      {/* Left Side - Login Form */}
      <div className="flex-1 bg-slate-50 dark:bg-[#0a1628] flex items-center justify-center px-4 py-12 transition-colors duration-500">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center space-y-6">
            {/* Logo */}
            <div className="flex justify-center">
              <img src="/ckcm.png" alt="CKCM Logo" className="w-24 h-24 object-contain" />
            </div>

            {/* Title */}
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                CKCM Payroll
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Sign in to continue to your account
              </p>
            </div>

            {/* Login Card */}
            <div className="w-full bg-white dark:bg-[#0f1f3a] rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
              <LoginForm />
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-slate-500 dark:text-slate-500">
              © 2025 CKCM. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Illustration */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-orange-500 to-red-600 items-center justify-center p-12 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="1.5" fill="white" opacity="0.3"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-2xl text-center space-y-12">
          {/* Animated Gears */}
          <div className="relative h-64 flex items-center justify-center">
            {/* Large Gear - Center */}
            <Settings className="absolute w-48 h-48 text-white animate-spin-slow" style={{animationDuration: '10s'}} />
            
            {/* Medium Gear - Top Right */}
            <Settings className="absolute w-32 h-32 text-white/90 top-4 right-20 animate-spin-slow" style={{animationDuration: '7s', animationDirection: 'reverse'}} />
            
            {/* Small Gear - Bottom Left */}
            <Settings className="absolute w-24 h-24 text-white/85 bottom-8 left-16 animate-spin-slow" style={{animationDuration: '6s'}} />
          </div>
          
          {/* Text Content */}
          <div className="space-y-6">
            <h2 className="text-5xl font-bold text-white leading-tight">
              CKCM PAYROLL
              <br />
              MANAGEMENT SYSTEM
            </h2>
            <p className="text-xl text-white/90 max-w-lg mx-auto">
              Streamline your payroll process with our comprehensive management system
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
