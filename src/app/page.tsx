"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { Sun, Moon, Monitor, Shield, Zap, TrendingUp, ChevronRight, Settings } from "lucide-react"
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
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors duration-500">
      {/* Theme Switcher */}
      {mounted && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-6 right-6 z-50 h-11 w-11 rounded-xl bg-slate-900/90 backdrop-blur-sm hover:bg-slate-900 shadow-lg hover:shadow-xl transition-all duration-300 dark:bg-white/90 dark:hover:bg-white border border-slate-800 dark:border-slate-200 group"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0 text-orange-400" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100 text-indigo-600" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer gap-2">
              <Sun className="h-4 w-4 text-orange-500" />
              <span>Light</span>
              {theme === "light" && <span className="ml-auto">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer gap-2">
              <Moon className="h-4 w-4 text-indigo-400" />
              <span>Dark</span>
              {theme === "dark" && <span className="ml-auto">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer gap-2">
              <Monitor className="h-4 w-4 text-slate-500" />
              <span>System</span>
              {theme === "system" && <span className="ml-auto">✓</span>}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Left Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-left duration-700">
          {/* Logo & Brand */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg mb-4">
              <img src="/ckcm.png" alt="CKCM Logo" className="w-10 h-10 object-contain" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              CKCM Payroll
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Sign in to continue to your account
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
            <LoginForm />
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            © 2025 CKCM. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Side - Branding */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-orange-500 to-red-600 p-12 items-center justify-center relative overflow-hidden animate-in fade-in slide-in-from-right duration-700">
        {/* Decorative Elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        {/* Payroll Illustration */}
        <div className="absolute right-0 bottom-0 w-2/3 h-2/3 opacity-20">
          <svg viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            {/* Document/Payslip */}
            <rect x="150" y="100" width="200" height="280" rx="10" fill="white" opacity="0.9"/>
            <rect x="170" y="130" width="160" height="15" rx="5" fill="currentColor" opacity="0.3"/>
            <rect x="170" y="160" width="120" height="10" rx="5" fill="currentColor" opacity="0.2"/>
            <rect x="170" y="180" width="140" height="10" rx="5" fill="currentColor" opacity="0.2"/>
            <rect x="170" y="220" width="160" height="8" rx="4" fill="currentColor" opacity="0.15"/>
            <rect x="170" y="240" width="160" height="8" rx="4" fill="currentColor" opacity="0.15"/>
            <rect x="170" y="260" width="160" height="8" rx="4" fill="currentColor" opacity="0.15"/>
            <rect x="170" y="300" width="160" height="20" rx="5" fill="currentColor" opacity="0.4"/>
            
            {/* Money/Dollar Signs */}
            <circle cx="100" cy="150" r="30" fill="white" opacity="0.8"/>
            <text x="100" y="165" fontSize="35" fill="currentColor" textAnchor="middle" fontWeight="bold">$</text>
            
            <circle cx="400" cy="200" r="25" fill="white" opacity="0.7"/>
            <text x="400" y="213" fontSize="30" fill="currentColor" textAnchor="middle" fontWeight="bold">₱</text>
            
            {/* Calculator */}
            <rect x="80" y="320" width="100" height="130" rx="8" fill="white" opacity="0.85"/>
            <rect x="90" y="330" width="80" height="30" rx="4" fill="currentColor" opacity="0.2"/>
            <circle cx="105" cy="380" r="8" fill="currentColor" opacity="0.3"/>
            <circle cx="130" cy="380" r="8" fill="currentColor" opacity="0.3"/>
            <circle cx="155" cy="380" r="8" fill="currentColor" opacity="0.3"/>
            <circle cx="105" cy="410" r="8" fill="currentColor" opacity="0.3"/>
            <circle cx="130" cy="410" r="8" fill="currentColor" opacity="0.3"/>
            <circle cx="155" cy="410" r="8" fill="currentColor" opacity="0.3"/>
            
            {/* Clock/Time */}
            <circle cx="380" cy="350" r="35" fill="white" opacity="0.8"/>
            <line x1="380" y1="350" x2="380" y2="330" stroke="currentColor" strokeWidth="3" opacity="0.4"/>
            <line x1="380" y1="350" x2="395" y2="350" stroke="currentColor" strokeWidth="3" opacity="0.4"/>
            
            {/* Checkmark */}
            <circle cx="250" cy="420" r="25" fill="white" opacity="0.9"/>
            <path d="M 240 420 L 248 428 L 262 410" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.5" strokeLinecap="round"/>
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 text-white space-y-12 max-w-lg">
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative">
                <Settings className="h-16 w-16 text-white/30 animate-spin-slow" />
                <Settings className="absolute inset-0 h-16 w-16 text-white/20 animate-spin-slow" style={{animationDirection: 'reverse', animationDuration: '20s'}} />
              </div>
            </div>
            <h2 className="text-5xl font-bold leading-tight">
              Modern Payroll
              <br />
              Management
            </h2>
            <p className="text-xl text-white/90">
              Streamline your payroll process with our comprehensive management system
            </p>
          </div>

          {/* Features */}
          <div className="space-y-6">
            <div className="flex items-start gap-4 group">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Lightning Fast</h3>
                <p className="text-white/80">Process payroll in minutes, not hours</p>
              </div>
            </div>

            <div className="flex items-start gap-4 group">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Secure & Compliant</h3>
                <p className="text-white/80">Bank-level encryption and data protection</p>
              </div>
            </div>

            <div className="flex items-start gap-4 group">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Smart Analytics</h3>
                <p className="text-white/80">Insights and reports at your fingertips</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
