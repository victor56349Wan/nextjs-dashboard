import { request } from 'http'
import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  debug: true,
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      console.log('auth', auth, { nextUrl: nextUrl.toString() }) // 只打印 nextUrl

      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard')
      if (isOnDashboard) {
        if (isLoggedIn) return true
        return false // Redirect unauthenticated users to login page
      } else if (isLoggedIn) {
        return Response.redirect(new URL('/dashboard', nextUrl))
      }
      return true
    },
    async jwt({ token, user }) {
      console.log('get jwt here...', user, token)
      if (user) {
        token.address = user.address
        token.chainId = user.chainId
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      console.log('get session here...', session, token)
      if (!token.sub) {
        return session
      }
      console.log('!!!session req!!!')
      const [, chainId, address] = token.sub.split(':')
      if (chainId && address) {
        session.address = address
        session.chainId = parseInt(chainId, 10)
      }

      return session
    },
  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig
