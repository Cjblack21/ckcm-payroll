import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

type Role = 'ADMIN' | 'PERSONNEL' | 'SETUP_REQUIRED'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    // Allow access to auth pages, API routes, and static assets
    if (
      pathname.startsWith("/api/auth") ||
      pathname.startsWith("/api/test-db") ||
      pathname.startsWith("/api/admin") ||
      pathname.startsWith("/api/personnel") ||
      pathname.startsWith("/auth") ||
      pathname === "/" ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/favicon") ||
      pathname === "/attendance-portal" ||
      pathname.startsWith("/api/attendance") ||
      pathname.startsWith("/api/personnel-types") ||
      pathname === "/account-setup" ||
      // Allow static image files
      pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|avif)$/i) ||
      // Allow any file in uploads directory
      pathname.startsWith("/uploads/")
    ) {
      return NextResponse.next()
    }

    // Redirect to login if not authenticated
    if (!token) {
      return NextResponse.redirect(new URL("/", req.url))
    }

    // Role-based access control
    const userRole = token.role as Role

    // If user needs setup, redirect to account setup page
    if (userRole === 'SETUP_REQUIRED') {
      if (pathname !== '/account-setup') {
        return NextResponse.redirect(new URL("/account-setup", req.url))
      }
      return NextResponse.next()
    }

    // Admin routes
    if (pathname.startsWith("/admin")) {
      if (userRole !== 'ADMIN') {
        return NextResponse.redirect(new URL("/unauthorized", req.url))
      }
    }

    // Personnel routes
    if (pathname.startsWith("/personnel")) {
      if (userRole !== 'PERSONNEL' && userRole !== 'ADMIN') {
        return NextResponse.redirect(new URL("/unauthorized", req.url))
      }
    }

    // Dashboard redirects based on role
    if (pathname === "/dashboard") {
      if (userRole === 'ADMIN') {
        return NextResponse.redirect(new URL("/admin/dashboard", req.url))
      } else if (userRole === 'PERSONNEL') {
        return NextResponse.redirect(new URL("/personnel/dashboard", req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Always allow access to auth pages and public assets
        if (
          pathname.startsWith("/api/auth") ||
          pathname.startsWith("/api/test-db") ||
          pathname.startsWith("/api/admin") ||
          pathname.startsWith("/api/personnel") ||
          pathname.startsWith("/auth") ||
          pathname === "/" ||
          pathname.startsWith("/_next") ||
          pathname.startsWith("/favicon") ||
          pathname === "/attendance-portal" ||
          pathname.startsWith("/api/attendance") ||
          pathname.startsWith("/api/personnel-types") ||
          pathname === "/account-setup" ||
          // Allow static image files
          pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|avif)$/i) ||
          // Allow any file in uploads directory
          pathname.startsWith("/uploads/")
        ) {
          return true
        }

        // Require authentication for protected routes
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - auth (auth pages)
     * - api/admin (admin API routes - handled by individual route auth)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Static image files
     * - uploads directory
     */
    "/((?!api/auth|auth|api/admin|_next/static|_next/image|favicon.ico|ckcm.png|pmslogo.jpg|uploads/).*)"
  ],
}

