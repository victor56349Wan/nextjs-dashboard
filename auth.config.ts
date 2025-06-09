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
    /*     async signIn({ user, account, profile, email, credentials }) {
      logWithTimestamp('SignIn回调 - Input:', { user, account, credentials })

      // 如果是认证错误，直接返回错误URL
      if (!user || (credentials && 'error' in credentials)) {
        const errorMessage = credentials?.error || '认证失败'
        logWithTimestamp('SignIn失败:', errorMessage)
        return `/auth/error?error=CredentialsSignin&message=${encodeURIComponent(
          errorMessage
        )}`
      }

      return true
    }, */

    /*     async redirect({ url, baseUrl }) {
      logWithTimestamp('重定向回调 - Input:', { url, baseUrl })

      // 如果URL包含错误参数，确保重定向到错误页面
      if (url.includes('error=')) {
        const errorUrl = new URL(
          url.startsWith('http') ? url : `${baseUrl}${url}`
        )
        const finalErrorUrl = new URL('/auth/error', baseUrl)

        // 复制所有错误相关参数
        errorUrl.searchParams.forEach((value, key) => {
          if (key === 'error' || key === 'message') {
            finalErrorUrl.searchParams.set(key, value)
          }
        })

        logWithTimestamp('错误重定向URL:', finalErrorUrl.toString())
        return finalErrorUrl.toString()
      }

      // 如果是成功登录，重定向到仪表板
      if (url.startsWith(baseUrl) && !url.includes('/auth/error')) {
        const finalUrl = url.includes('/dashboard')
          ? url
          : `${baseUrl}/dashboard`
        logWithTimestamp('成功登录重定向:', finalUrl)
        return finalUrl
      }

      logWithTimestamp('默认重定向:', baseUrl)
      return baseUrl
    }, */

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
