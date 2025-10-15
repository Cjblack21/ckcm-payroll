import Link from "next/link"
import Image from "next/image"
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Left Panel - Login Section */}
        <div className="flex flex-col justify-center px-6 py-8 lg:px-8 lg:py-12">
          <div className="mx-auto w-full max-w-sm">
            {/* Logo Section */}
            <div className="text-center mb-6">
              <Link href="/" className="inline-block">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-sm mb-3 hover:shadow-md transition-shadow">
                  <Image 
                    src="/ckcm.png" 
                    alt="CKCM Logo" 
                    width={48}
                    height={48}
                    className="w-12 h-12 object-contain"
                    priority
                    unoptimized
                  />
                </div>
              </Link>
              <h1 className="text-xl font-bold text-foreground mb-1">Welcome to CKCM PMS</h1>
              <p className="text-muted-foreground text-sm">
                Enter your credentials to access the Payroll Management System
              </p>
            </div>
            
            {/* Login Form */}
            <div className="bg-card rounded-lg shadow-sm border p-6">
              <LoginForm />
            </div>
          </div>
        </div>

        {/* Right Panel - Branding Section */}
        <div className="hidden lg:flex lg:flex-col lg:justify-center lg:items-center bg-primary text-primary-foreground p-8">
          <div className="text-center max-w-sm">
            {/* Logo Section */}
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 rounded-lg mb-6">
                <Image
                  src="/pmslogo.jpg"
                  alt="PMS Logo"
                  width={56}
                  height={56}
                  className="w-14 h-14 object-contain"
                  priority
                  unoptimized
                />
              </div>
              <h2 className="text-2xl font-bold mb-3">
                Payroll Management System
              </h2>
              <p className="text-primary-foreground/80 text-sm">
                Advanced payroll solutions for modern organizations
              </p>
            </div>
            
            {/* Feature Cards */}
            <div className="space-y-3">
              <div className="bg-white/10 rounded-lg p-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium text-sm">Automated Processing</h3>
                    <p className="text-xs text-primary-foreground/70">Streamlined calculations</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 rounded-lg p-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium text-sm">Real-time Tracking</h3>
                    <p className="text-xs text-primary-foreground/70">Live monitoring</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 rounded-lg p-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium text-sm">Advanced Reports</h3>
                    <p className="text-xs text-primary-foreground/70">Comprehensive analytics</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Trust Badge */}
            <div className="mt-8 pt-4 border-t border-white/20">
              <div className="flex items-center justify-center space-x-2 text-primary-foreground/80">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-xs font-medium">Secure & Reliable</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
