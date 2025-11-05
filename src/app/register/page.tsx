"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useTheme } from "next-themes"
import { Sun, Moon, Monitor, ArrowRight, UserPlus, Shield, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RegisterForm } from "@/components/register-form"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function RegisterPage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950 transition-colors duration-500">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-400/30 to-indigo-600/30 blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-20 h-96 w-96 rounded-full bg-gradient-to-br from-purple-400/20 to-pink-600/20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-40 right-1/4 h-80 w-80 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-600/20 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Enhanced Theme Toggle with Dropdown */}
      {mounted && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-6 right-6 z-50 h-11 w-11 rounded-full bg-white/90 backdrop-blur-md hover:bg-white shadow-lg hover:shadow-xl transition-all duration-300 dark:bg-slate-800/90 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0 text-amber-500" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100 text-indigo-400" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 bg-white/95 backdrop-blur-md dark:bg-slate-900/95 border-slate-200 dark:border-slate-800">
            <DropdownMenuItem 
              onClick={() => setTheme("light")}
              className="cursor-pointer gap-2"
            >
              <Sun className="h-4 w-4 text-amber-500" />
              <span>Light</span>
              {theme === "light" && <span className="ml-auto text-xs">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setTheme("dark")}
              className="cursor-pointer gap-2"
            >
              <Moon className="h-4 w-4 text-indigo-400" />
              <span>Dark</span>
              {theme === "dark" && <span className="ml-auto text-xs">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setTheme("system")}
              className="cursor-pointer gap-2"
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
        <div className="w-full max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
            {/* Left Side - Branding & Info */}
            <div className="flex flex-col justify-center space-y-8">
              {/* Logo & Brand */}
              <div className="space-y-4 animate-in fade-in slide-in-from-left duration-700">
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-300" />
                    <div className="relative rounded-2xl bg-white p-3 shadow-lg dark:bg-slate-900 ring-2 ring-slate-200 dark:ring-slate-800 group-hover:ring-blue-500 dark:group-hover:ring-indigo-500 transition-all duration-300">
                      <Image
                        src="/ckcm.png"
                        alt="CKCM Logo"
                        width={48}
                        height={48}
                        className="h-12 w-12 group-hover:scale-110 transition-transform duration-300"
                        unoptimized
                      />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                      CKCM PMS
                    </h1>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Payroll Management System
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h2 className="text-4xl font-bold leading-tight text-slate-900 dark:text-white lg:text-5xl">
                    Create your
                    <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent animate-gradient">
                      {" "}PMS Account
                    </span>
                  </h2>
                  <p className="text-lg text-slate-600 dark:text-slate-400 max-w-lg">
                    Register your Payroll Management Account to access payroll services and manage your information.
                  </p>
                </div>
              </div>

              {/* Feature Cards */}
              <div className="hidden space-y-4 lg:block animate-in fade-in slide-in-from-left duration-1000 delay-300">
                <div className="group rounded-2xl border border-slate-200 bg-white/60 p-6 backdrop-blur-sm transition-all duration-300 hover:bg-white hover:shadow-xl hover:scale-[1.02] hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-900 dark:hover:border-indigo-700">
                  <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3 text-white shadow-lg group-hover:shadow-blue-500/50 transition-shadow duration-300">
                      <UserPlus className="h-6 w-6 group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Quick Registration</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Create your account in seconds with just a few details
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-400 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-1" />
                  </div>
                </div>

                <div className="group rounded-2xl border border-slate-200 bg-white/60 p-6 backdrop-blur-sm transition-all duration-300 hover:bg-white hover:shadow-xl hover:scale-[1.02] hover:border-purple-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-900 dark:hover:border-pink-700">
                  <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 p-3 text-white shadow-lg group-hover:shadow-purple-500/50 transition-shadow duration-300">
                      <Shield className="h-6 w-6 group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Secure & Protected</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Your data is encrypted and protected with industry standards
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-400 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-1" />
                  </div>
                </div>

                <div className="group rounded-2xl border border-slate-200 bg-white/60 p-6 backdrop-blur-sm transition-all duration-300 hover:bg-white hover:shadow-xl hover:scale-[1.02] hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-900 dark:hover:border-emerald-700">
                  <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-3 text-white shadow-lg group-hover:shadow-emerald-500/50 transition-shadow duration-300">
                      <CheckCircle2 className="h-6 w-6 group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Instant Access</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Start using the system immediately after registration
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-400 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-1" />
                  </div>
                </div>
              </div>

              {/* Footer Text */}
              <p className="hidden text-sm text-slate-500 dark:text-slate-500 lg:block">
                © 2025 CKCM. All rights reserved.
              </p>
            </div>

            {/* Right Side - Register Card */}
            <div className="flex items-center justify-center animate-in fade-in slide-in-from-right duration-700">
              <div className="w-full max-w-md">
                <div className="relative group">
                  {/* Glow effect */}
                  <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-20 blur-2xl group-hover:opacity-30 transition-opacity duration-500" />
                  
                  {/* Card */}
                  <div className="relative rounded-3xl border border-slate-200/50 bg-white/90 p-8 shadow-2xl backdrop-blur-xl dark:border-slate-800/50 dark:bg-slate-900/90 ring-1 ring-slate-200/50 dark:ring-slate-800/50">
                    <div className="mb-8 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600" />
                        <div className="h-1 w-2 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600" />
                      </div>
                      <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Register Account
                      </h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Create your Payroll Management Account
                      </p>
                    </div>

                    <RegisterForm />

                    {/* Security Badge */}
                    <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-500">
                      <Shield className="h-3 w-3" />
                      <span>Secured with end-to-end encryption</span>
                    </div>
                  </div>
                </div>

                {/* Mobile Footer */}
                <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-500 lg:hidden">
                  © 2025 CKCM. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
