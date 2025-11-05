'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'
import Image from 'next/image'

export default function AccountSetupSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userName = searchParams.get('name') || 'User'
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push('/')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [router])

  const handleGoToLogin = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-6">
          {/* Logo */}
          <div className="flex justify-center">
            <Image
              src="/ckcm.png"
              alt="CKCM Logo"
              width={64}
              height={64}
              className="h-16 w-16"
              unoptimized
            />
          </div>

          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
              <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-500" />
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Account Created Successfully!
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Welcome to CKCM Payroll Management System, <span className="font-semibold text-slate-900 dark:text-white">{userName}</span>
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-500">
              Your account has been set up and is ready to use.
            </p>
          </div>

          {/* Button */}
          <div className="space-y-3 pt-4">
            <Button
              onClick={handleGoToLogin}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              Go to Login Page
            </Button>
            <p className="text-xs text-slate-500">
              Redirecting automatically in {countdown} seconds...
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
          © 2025 CKCM. All rights reserved.
        </p>
      </div>
    </div>
  )
}
