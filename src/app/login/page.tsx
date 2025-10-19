"use client"

import Image from "next/image"
import { useTheme } from "next-themes"
import { Sun, Moon, ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-400/30 to-indigo-600/30 blur-3xl" />
        <div className="absolute top-1/2 -left-20 h-96 w-96 rounded-full bg-gradient-to-br from-purple-400/20 to-pink-600/20 blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 h-80 w-80 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-600/20 blur-3xl" />
      </div>

      {/* Theme Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="fixed top-6 right-6 z-50 h-10 w-10 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-800"
      >
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
      </Button>

      {/* Main Content */}
      <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
            {/* Left Side - Branding & Info */}
            <div className="flex flex-col justify-center space-y-8">
              {/* Logo & Brand */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 blur-xl opacity-50" />
                    <div className="relative rounded-2xl bg-white p-3 shadow-lg dark:bg-slate-900">
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
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                      CKCM PMS
                    </h1>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Payroll Management System
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-4xl font-bold leading-tight text-slate-900 dark:text-white lg:text-5xl">
                    Payroll made
                    <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      {" "}simple
                    </span>
                  </h2>
                  <p className="text-lg text-slate-600 dark:text-slate-400">
                    Manage your organization's payroll with confidence and ease.
                  </p>
                </div>
              </div>

              {/* Feature Cards */}
              <div className="hidden space-y-4 lg:block">
                <div className="group rounded-2xl border border-slate-200 bg-white/50 p-6 backdrop-blur-sm transition-all hover:bg-white hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/50 dark:hover:bg-slate-900">
                  <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3 text-white shadow-lg">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 dark:text-white">Automated Processing</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Save time with intelligent automation and real-time calculations
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </div>

                <div className="group rounded-2xl border border-slate-200 bg-white/50 p-6 backdrop-blur-sm transition-all hover:bg-white hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/50 dark:hover:bg-slate-900">
                  <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 p-3 text-white shadow-lg">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 dark:text-white">Secure & Compliant</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Enterprise-grade security with complete data protection
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </div>
              </div>

              {/* Footer Text */}
              <p className="hidden text-sm text-slate-500 dark:text-slate-500 lg:block">
                © 2025 CKCM. All rights reserved.
              </p>
            </div>

            {/* Right Side - Login Card */}
            <div className="flex items-center justify-center">
              <div className="w-full max-w-md">
                <div className="rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80">
                  <div className="mb-8 space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                      Sign in to your account
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Enter your credentials to access the dashboard
                    </p>
                  </div>

                  <LoginForm />
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
