import type { NextAuthConfig } from 'next-auth'

// 添加时间戳日志辅助函数
function logWithTimestamp(message: string, ...args: any[]) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${message}`, ...args)
}

export const authConfig = {
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

        if (token && token.sub) {
          // 确保会话中包含完整的用户信息
          const [, chainId, address] = token.sub.split(':')
          if (chainId && address) {
            const userInfo = {
              ...session.user,
              id: token.sub,
              address: address,
            }

            newSession = {
              ...newSession,
              user: userInfo as any, // 使用类型断言处理复杂的类型问题
              address: address,
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
