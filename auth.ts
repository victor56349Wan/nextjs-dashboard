import NextAuth, { CredentialsSignin } from 'next-auth'
import credentialsProvider from 'next-auth/providers/credentials'
import { authConfig } from './auth.config'
import { z } from 'zod'
import type { User } from '@/app/lib/definitions'
import bcrypt from 'bcryptjs'
import postgres from 'postgres'
import {
  type SIWESession,
  /* verifySignature, */
  getChainIdFromMessage,
  getAddressFromMessage,
} from '@reown/appkit-siwe'
import { createPublicClient, http } from 'viem'

// SIWE 认证相关错误类型
enum AuthErrorType {
  SIGNATURE_INVALID = 'SIGNATURE_INVALID',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

class CredentialsSigninError extends CredentialsSignin {
  constructor(code: string) {
    super()
    this.code = code
  }
}

/* 
// 处理认证错误
function handleAuthError(error: unknown) {
  logWithTimestamp('转换认证错误:', error)

  let errorMessage = '认证失败'
  let errorType = 'UNKNOWN_ERROR'

  if (error instanceof Error) {
    errorMessage = error.message
    errorType = error.name || 'ERROR'
  } else if (typeof error === 'string') {
    errorMessage = error
  } else if (typeof error === 'object' && error !== null) {
    const err = error as any
    errorMessage = err.message || errorMessage
    errorType = err.type || errorType
  }

  logWithTimestamp('创建的认证错误:', {
    name: 'CredentialsSignin',
    message: errorMessage,
    type: errorType,
  }) */

// 扩展 NextAuth 的类型定义
declare module 'next-auth' {
  interface Session extends SIWESession {
    address: string | null
    chainId: number | null
    user: {
      id: string
      email?: string | null
      address?: string | null
    }
  }

  interface User {
    id: string
    email?: string | null
    address?: string | null
    chainId?: number | null
  }
}
const sql = postgres(process.env.POSTGRES_URL!, {
  ssl: 'require',
  max: 10, // 连接池最大连接数
  idle_timeout: 20, // 空闲连接超时(秒)
  connect_timeout: 10, // 连接超时(秒)
  max_lifetime: 60 * 30, // 连接最大生命周期(秒)
  max_retries: 3, // 查询失败重试次数
})

async function getUser(email: string): Promise<User | undefined> {
  try {
    logWithTimestamp(`Querying user with email: ${email}`)
    const user = await sql<User[]>`SELECT * FROM users WHERE email=${email}`

    if (user.length === 0) {
      logWithTimestamp('User not found with email:', email)
      return undefined
    }

    logWithTimestamp('User query successful')
    return user[0]
  } catch (error) {
    logWithTimestamp('Database query error:', error)
    // Handle different types of database errors
    if (error instanceof Error) {
      if (error.message.includes('connection')) {
        throw new CredentialsSigninError(
          AuthErrorType.DATABASE_ERROR +
            ': ' +
            'Database connection failed, please try again later'
        )
      }
      if (error.message.includes('timeout')) {
        throw new CredentialsSigninError(
          AuthErrorType.DATABASE_ERROR +
            ': ' +
            'Database query timed out, please try again later'
        )
      }
    }
    throw new CredentialsSigninError(
      AuthErrorType.DATABASE_ERROR +
        ': ' +
        'Database query failed, please try again later'
    )
  }
}

async function getUserByAddress(address: string): Promise<User | undefined> {
  try {
    logWithTimestamp(`Querying user with wallet address: ${address}`)
    const user = await sql<User[]>`SELECT * FROM users WHERE address=${address}`

    if (user.length === 0) {
      logWithTimestamp('User not found with wallet address:', address)
      return undefined
    }

    logWithTimestamp('User query successful:', {
      id: user[0].id,
      address: user[0].address,
    })
    return user[0]
  } catch (error) {
    logWithTimestamp('Database query error:', error)
    // Handle different types of database errors
    if (error instanceof Error) {
      if (error.message.includes('connection')) {
        throw new CredentialsSigninError(
          AuthErrorType.DATABASE_ERROR +
            ': ' +
            'Database connection failed, please try again later'
        )
      }
      if (error.message.includes('timeout')) {
        throw new CredentialsSigninError(
          AuthErrorType.DATABASE_ERROR +
            ': ' +
            'Database query timed out, please try again later'
        )
      }
    }
    throw new CredentialsSigninError(
      AuthErrorType.DATABASE_ERROR +
        ': ' +
        'Database query failed, please try again later'
    )
  }
}

const nextAuthSecret = process.env.NEXTAUTH_SECRET
if (!nextAuthSecret) {
  throw new Error('NEXTAUTH_SECRET is not set')
}

const projectId = process.env.NEXT_PUBLIC_PROJECT_ID
if (!projectId) {
  throw new Error('NEXT_PUBLIC_PROJECT_ID is not set')
}

// 添加时间戳日志辅助函数
function logWithTimestamp(message: string, ...args: any[]) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${message}`, ...args)
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  /*
   * !!! need to distribute auth config bwten auth.ts and middleware.ts  carefully w/ below contraints found so far
   *
   */
  ...authConfig,
  secret: nextAuthSecret,
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  /*
  events: {
    async signInError(message) {
      logWithTimestamp('登录错误事件:', message)
    },
  },
  callbacks: {
    async signIn({ user, account, profile, credentials }) {
      logWithTimestamp('登录回调:', { user, account })
      return true
    },
         async redirect({ url, baseUrl }) {
      logWithTimestamp('111重定向回调 - Input:', { url, baseUrl })

      // 检查 URL 是否包含任何错误参数
      try {
        const currentUrl = new URL(url)
        const error = currentUrl.searchParams.get('error')

        if (error) {
          logWithTimestamp('检测到错误参数:', { error })
          const errorUrl = new URL('/auth/error', baseUrl)

          // 保留所有错误相关的参数
          for (const [key, value] of currentUrl.searchParams.entries()) {
            if (key.startsWith('error') || key === 'message') {
              errorUrl.searchParams.set(key, value)
            }
          }

          logWithTimestamp('重定向到错误页面:', errorUrl.toString())
          return errorUrl.toString()
        }
      } catch (e) {
        logWithTimestamp('解析URL时出错:', e)
      }

      // 判断是否需要重定向到指定页面
      if (url.startsWith(baseUrl)) {
        logWithTimestamp('重定向到原始URL:', url)
        return url
      }

      logWithTimestamp('重定向到基础URL:', baseUrl)
      return baseUrl
    }, 
  },*/
  providers: [
    credentialsProvider({
      id: 'credentials',
      name: 'Email',
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials)

        logWithTimestamp('邮箱认证 - 收到请求:', credentials)

        if (!parsedCredentials.success) {
          throw new CredentialsSigninError(
            AuthErrorType.USER_NOT_FOUND + ': ' + '邮箱或密码格式无效'
          )
        }

        const { email, password } = parsedCredentials.data
        const user = await getUser(email)

        if (!user) {
          logWithTimestamp('邮箱认证 - 用户不存在')
          throw new CredentialsSigninError(
            AuthErrorType.USER_NOT_FOUND + ': ' + '邮箱错误'
          )
        }

        const passwordsMatch = await bcrypt.compare(password, user.password)
        if (!passwordsMatch) {
          logWithTimestamp('邮箱认证 - 密码不正确')
          throw new CredentialsSigninError(
            AuthErrorType.USER_NOT_FOUND + ': ' + '密码错误'
          )
        }

        logWithTimestamp('邮箱认证 - 认证成功')
        return user
      },
    }),
    credentialsProvider({
      id: 'siwe',
      name: 'Ethereum',
      credentials: {
        message: { label: 'Message', type: 'text', placeholder: '0x0' },
        signature: { label: 'Signature', type: 'text', placeholder: '0x0' },
      },
      async authorize(credentials, request) {
        try {
          if (!credentials?.message) {
            logWithTimestamp('SIWE认证 - 错误: 未提供消息')
            throw new CredentialsSigninError(AuthErrorType.SIGNATURE_INVALID)
          }

          const { message, signature } = credentials
          const address = getAddressFromMessage(message as string)
          const chainId = getChainIdFromMessage(message as string)

          logWithTimestamp(
            'SIWE认证 - 收到请求:',
            '\n\t地址:',
            address,
            '\n\t链ID:',
            chainId
          )

          // 查询用户是否已注册
          const dbUser = await getUserByAddress(address)
          if (!dbUser) {
            logWithTimestamp('SIWE认证 - 用户未注册:', address)
            throw new CredentialsSigninError(AuthErrorType.USER_NOT_FOUND)
          }
          // TODO:
          // 1. to call siwe verifyMsg to validate signature
          // 2. simply error render for both auth.

          logWithTimestamp('SIWE认证 - 认证成功:', address)
          return {
            ...dbUser,
            id: `${chainId}:${address}`,
            address: address,
            chainId: parseInt(chainId.split(':')[1]),
          }
        } catch (error) {
          logWithTimestamp('SIWE认证 - 错误:', error)
          throw error
        }
      },
    }),
  ],
})
