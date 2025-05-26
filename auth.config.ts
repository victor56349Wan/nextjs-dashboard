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
      console.log(
        `callback authorized, auth:${auth}, nextUrl: ${nextUrl.toString()}, isLogedin: ${isLoggedIn}`
      )

      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard')
      if (isOnDashboard) {
        if (isLoggedIn) return true
        return false // Redirect unauthenticated users to login page
      } else if (isLoggedIn) {
        return Response.redirect(new URL('/dashboard', nextUrl))
      }
      return true
    },
    // async jwt({ token, user }) {
    //   console.log(`get jwt here...user:${user}, token:${token}`)
    //   if (user) {
    //     token.address = user.address
    //     token.chainId = user.chainId
    //     token.id = user.id
    //     console.log(`user:${user}, token:${token}`)
    //   }
    //   return token
    // },
    // session({ session, token }) {
    //   console.log(`get sesson here... session :${session}, token:${token}`)
    //   if (!token.sub) {
    //     return session
    //   }
    //   if (token) {
    //     session.user = {
    //       ...session.user,
    //       id: token.sub as string,
    //       email: token.email as string,
    //       address: token.address as string,
    //       chainId: token.chainId as number,
    //     }
    //   }
    //   /* const [, chainId, address] = token.sub.split(':')
    //   if (chainId && address) {
    //     session.address = address
    //     session.chainId = parseInt(chainId, 10)
    //   } */

    //   return session
    // },
  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig
