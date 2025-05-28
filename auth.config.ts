import type { NextAuthConfig } from 'next-auth'

// 添加时间戳日志辅助函数
function logWithTimestamp(message: string, ...args: any[]) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${message}`, ...args)
}

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  debug: true, // 添加调试模式
  session: {
    strategy: 'jwt',
  },

  callbacks: {
    // !!!! auth para is the object returned by session() callback running in middleware context
    async authorized({ auth, request }) {
      // 增强用户状态检查
      const hasValidSession = !!(
        auth?.expires &&
        new Date(auth.expires) > new Date() &&
        auth?.user
      )
      const { nextUrl } = request

      logWithTimestamp('Callback authorized, Input:\n\tauth:', auth)

      logWithTimestamp(
        'Callback authorized -',
        '\n\tauth:',
        JSON.stringify(
          {
            ...auth,
            //user: auth?.user || {},
            user: auth?.user,
            session: auth?.session,
          },
          null,
          2
        ),
        '\n\thasValidSession:',
        hasValidSession,
        '\n\tnextUrl:',
        nextUrl.toString()
      )

      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard')
      if (isOnDashboard) {
        return hasValidSession
      }
      return true
    },
    // jwt({ token, user, account, trigger }) {
    //   logWithTimestamp(
    //     'JWT Callback - Input:',
    //     '\n\ttoken:',
    //     token,
    //     '\n\tuser:',
    //     user,
    //     '\n\taccount:',
    //     account,
    //     '\n\ttrigger:',
    //     trigger
    //   )

    //   // 初次登录时设置用户信息
    //   if (user && account?.provider === 'siwe') {
    //     token = {
    //       ...token,
    //       //sub: user.id,
    //       address: user.address,
    //       chainId: user.chainId,
    //     }
    //   }

    //   logWithTimestamp('JWT Callback - Output:\n\tToken:', token)
    //   return token
    // },

    // !!! BE CAREFUL return value of ths session() callback as they will be used by client(like metamask wallet) and middleware in callback authorized()
    session({ session, token, user }) {
      logWithTimestamp(
        'Session Callback - Input:',
        '\n\tsession:',
        session,
        '\n\ttoken:',
        token,
        '\n\tuser:',
        user
      )
      try {
        let newSession = session

        if (token) {
          // 确保会话中包含完整的用户信息
          const userInfo = {
            ...session.user,
            id: token.sub,
            //address: token.address as string,
            //name: token.address as string,
          }

          const [, chainId, address] = token.sub.split(':')
          if (chainId && address) {
            newSession = {
              ...newSession,
              user: userInfo, // !!! used by authorized() ONLY running in middleware context
              // !!! below 2 fields mainly consumed by client
              address: address as string,
              chainId: parseInt(chainId, 10),
            }
          }
        }
        logWithTimestamp('Session Callback - Output:\n\tSession:', newSession)
        return newSession
      } catch (error) {
        logWithTimestamp('Session error:', error)
        return session
      }
    },
  },
  providers: [],
} satisfies NextAuthConfig
