import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import bcrypt from "bcryptjs"
import { Role } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture, // Explicitly map the picture field
          role: 'PERSONNEL' as const, // Default role for OAuth users
        }
      },
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log("Missing credentials")
          return null
        }

        try {
          const inputEmail = credentials.email.trim().toLowerCase()
          const inputPassword = credentials.password.trim()
          console.log("Attempting to authenticate user:", inputEmail)

          const user = await prisma.user.findUnique({
            where: {
              email: inputEmail
            }
          })

          if (!user) {
            console.log("User not found:", inputEmail)
            return null
          }

          if (!user.isActive) {
            console.log("User account is inactive:", inputEmail)
            return null
          }

          if (!user.password) {
            console.log("No password set for user (OAuth-only account):", inputEmail)
            return null
          }

          const isPasswordValid = await bcrypt.compare(
            inputPassword,
            user.password
          )

          if (!isPasswordValid) {
            console.log("Invalid password for user:", inputEmail)
            return null
          }

          console.log("Authentication successful for user:", inputEmail)
          return {
            id: user.users_id,
            email: user.email,
            name: user.name,
            role: user.role,
            avatar: user.avatar,
          }
        } catch (error) {
          console.error("Auth error:", error)
          // Return null instead of throwing to prevent JSON parsing errors
          return null
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: process.env.NODE_ENV === "development",
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        // Only require email verification
        const googleProfile = profile as any
        return googleProfile?.email_verified === true
      }
      return true // Allow other providers (credentials)
    },
    async jwt({ token, user, account, profile, trigger }) {
      console.log('JWT callback called:', {
        hasAccount: !!account,
        provider: account?.provider,
        hasProfile: !!profile,
        hasUser: !!user,
        trigger,
        existingPicture: token.picture
      })

      // Always refresh avatar from database on every request
      if (token.userId) {
        try {
          const freshUser = await prisma.user.findUnique({
            where: { users_id: token.userId as string },
            select: { avatar: true }
          })
          if (freshUser) {
            token.avatar = freshUser.avatar
          }
        } catch (error) {
          console.error("Error refreshing avatar:", error)
        }
      }

      if (account?.provider === "google" && profile) {
        const googleProfile = profile as any
        console.log('Processing Google OAuth user:', googleProfile.email)
        console.log('Google profile picture URL:', googleProfile.picture)
        console.log('Full Google profile:', googleProfile)

        // Check if user exists in database with timeout
        try {
          const existingUser = await Promise.race([
            prisma.user.findUnique({
              where: { email: googleProfile.email as string }
            }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Database query timeout')), 5000)
            )
          ]) as any

          if (existingUser) {
            console.log('Existing user found:', existingUser.users_id, existingUser.role)
            // User exists, use their data
            token.role = existingUser.role
            token.userId = existingUser.users_id
            token.avatar = existingUser.avatar
            // Still keep the picture from Google for display
            token.picture = googleProfile.picture
          } else {
            console.log('New user, setting up for account setup')
            console.log('Storing picture URL:', googleProfile.picture)
            // New user, mark as needing setup
            token.role = "SETUP_REQUIRED"
            token.email = googleProfile.email
            token.name = googleProfile.name
            token.picture = googleProfile.picture
          }
        } catch (error) {
          console.error("Error checking user in JWT callback:", error)
          // Fallback to setup required to prevent auth failure
          token.role = "SETUP_REQUIRED"
          token.email = googleProfile.email
          token.name = googleProfile.name
          token.picture = googleProfile.picture
        }
      } else if (user) {
        console.log('Processing credentials user:', user.id, user.role)
        token.role = user.role
        token.userId = user.id
        token.avatar = user.avatar
      }

      console.log('JWT token final state:', {
        role: token.role,
        userId: token.userId,
        hasEmail: !!token.email,
        avatar: token.avatar,
        picture: token.picture
      })

      return token
    },
    async session({ session, token }) {
      console.log('Session callback - token.picture:', token.picture)
      console.log('Session callback - token.role:', token.role)

      if (token) {
        // Ensure userId is set - critical for API routes
        const userId = (token.userId as string) || (token.sub as string) || ''
        session.user.id = userId
        session.user.role = token.role as Role || 'SETUP_REQUIRED'
        session.user.avatar = token.avatar as string || null

        if (token.role === "SETUP_REQUIRED") {
          session.user.email = token.email as string || ''
          session.user.name = token.name as string || ''
          session.user.image = token.picture as string || ''
          console.log('Setting SETUP_REQUIRED user image to:', session.user.image)
        } else {
          // For existing users, use their stored avatar or image
          session.user.image = token.avatar as string || null
          console.log('Setting existing user image to:', session.user.image)
        }
      }

      console.log('Final session.user.image:', session.user.image)
      return session
    },
    async redirect({ url, baseUrl }) {
      console.log('Redirect callback:', { url, baseUrl })

      // If user needs setup, redirect to account setup page
      if (url.includes("/account-setup")) {
        // If url is already absolute, return as is
        if (url.startsWith("http")) return url
        // If url is relative, prepend baseUrl
        return `${baseUrl}${url}`
      }

      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`

      // Allows callback URLs on the same origin
      if (url.startsWith("http")) {
        try {
          const urlObj = new URL(url)
          if (urlObj.origin === baseUrl) return url
        } catch (error) {
          console.error("Invalid URL in redirect:", error)
        }
      }

      return baseUrl
    }
  },
  pages: {
    signIn: "/",
    error: "/auth/error",
  },
}

// Types for NextAuth
declare module "next-auth" {
  interface User {
    role: Role | "SETUP_REQUIRED"
    avatar?: string | null
  }

  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      avatar?: string | null
      role: Role | "SETUP_REQUIRED"
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role | "SETUP_REQUIRED"
    userId?: string
    email?: string
    name?: string
    picture?: string
    avatar?: string | null
  }
}
