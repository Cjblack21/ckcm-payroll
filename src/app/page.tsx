import { LoginForm } from "@/components/login-form"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-orange-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-red-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="relative z-10 grid min-h-screen lg:grid-cols-2 gap-8 lg:gap-0">
        {/* Left Panel - Login Section */}
        <div className="flex flex-col justify-center px-4 py-8 sm:px-6 lg:px-12">
          <div className="mx-auto w-full max-w-md">
            {/* Logo & Header Section */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg mb-4 transform hover:scale-105 transition-transform duration-300">
                <img 
                  src="/ckcm.png" 
                  alt="CKCM Logo" 
                  className="w-14 h-14 object-contain"
                />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-2">
                Welcome Back
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Sign in to access CKCM Payroll Management System
              </p>
            </div>
            
            {/* Login Form Card */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 p-6 sm:p-8">
              <LoginForm />
            </div>

            {/* Footer Text */}
            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                Protected by enterprise-grade security
              </p>
            </div>
          </div>
        </div>

        {/* Right Panel - Branding Section */}
        <div className="hidden lg:flex lg:flex-col lg:justify-center lg:items-center p-8 xl:p-12 relative">
          <div className="max-w-lg w-full">
            {/* Logo Section */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl mb-6 shadow-xl border border-orange-300/30">
                <svg className="w-16 h-16 text-white animate-spin-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-4xl font-bold text-slate-800 dark:text-white mb-4">
                Payroll Management
                <br />
                <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  System
                </span>
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-lg">
                Advanced payroll solutions for modern organizations
              </p>
            </div>
            
            {/* Feature Cards */}
            <div className="space-y-4">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 shadow-lg hover:bg-white/20 transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-semibold text-slate-800 dark:text-white text-base">Automated Processing</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300">Streamlined payroll calculations</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 shadow-lg hover:bg-white/20 transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-semibold text-slate-800 dark:text-white text-base">Real-time Tracking</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300">Live attendance monitoring</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 shadow-lg hover:bg-white/20 transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-red-700 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-semibold text-slate-800 dark:text-white text-base">Advanced Reports</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300">Comprehensive analytics & insights</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Trust Badge */}
            <div className="mt-12 pt-6 border-t border-white/20">
              <div className="flex items-center justify-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-green-500/20 rounded-full">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">Secure & Reliable</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">Bank-level encryption</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
