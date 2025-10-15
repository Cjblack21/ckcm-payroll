"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { AlertCircle } from "lucide-react"
import { Suspense } from "react"

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "CredentialsSignin":
        return "Invalid email or password. Please try again."
      case "EmailNotVerified":
        return "Your email address is not verified. Please check your email."
      case "AccountNotLinked":
        return "This account is not linked to your profile."
      case "AccessDenied":
        return "Access denied. You don't have permission to sign in."
      case "Verification":
        return "The verification link has expired or is invalid."
      default:
        return "An unexpected error occurred. Please try again."
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <AlertCircle className="h-16 w-16 text-red-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Error</h1>
        
        <p className="text-gray-600 mb-6">
          {getErrorMessage(error)}
        </p>
        
        <div className="space-y-3">
          <Link 
            href="/" 
            className="block w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </Link>
          
          <p className="text-sm text-gray-500">
            If the problem persists, please contact your administrator.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function AuthError() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">Loading...</div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  )
}
