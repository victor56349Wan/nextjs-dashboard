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
import WeChatProvider from 'next-auth/providers/wechat'

// SIWE related error types
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

// Extend NextAuth type definitions
declare module 'next-auth' {
  interface Session extends SIWESession {
    address: string | null
    chainId: number | null
    user: {
      id: string
      email?: string | null
      address?: string | null
      wechatId?: string | null
    }
  }

  interface User {
    id: string
    email?: string | null
    address?: string | null
    chainId?: number | null
    wechatId?: string | null
  }
}

// JWT interface extension
declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string
    wechatId?: string
  }
}

const sql = postgres(process.env.POSTGRES_URL!, {
  ssl: 'require',
  max: 10, // Maximum number of connections in pool
  idle_timeout: 20, // Idle connection timeout (seconds)
  connect_timeout: 10, // Connection timeout (seconds)
  max_lifetime: 60 * 30, // Maximum connection lifetime (seconds)
  //max_retries: 3, // Number of retries for failed queries
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

// Add timestamp log helper function
function logWithTimestamp(message: string, ...args: any[]) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${message}`, ...args)
}
/**
 * !!! need to distribute auth config bwtn auth.ts and middleware.ts  carefully w/ below constraints found so far
 *
 https://amazing-accurately-penguin.ngrok-free.app/api/auth/callback/wechat
 http://localhost:3000/api/auth/callback/wechat
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: nextAuthSecret,
  pages: {
    signIn: '/login',
  },

  providers: [
    WeChatProvider({
      clientId: process.env.WECHAT_CLIENT_ID as string,
      clientSecret: process.env.WECHAT_CLIENT_SECRET as string,
      /**
       *  Notes: 
       *  1, have to do web authentication in wechat app(or wechat web dev tool, as depicted in https://github.com/nextauthjs/next-auth/pull/10236),
       *   or will see 'Oops! Something went wrong error ' when clicking 'Log in with Wechat' button from regular PC browser
       *  2, adding '#wechat_redirect' in URL will lead to no response after clicking wechat login button
      platformType: 'WebsiteApp',
      authorization: {
        url: 'https://open.weixin.qq.com/connect/oauth2/authorize#wechat_redirect',
      }, */
    }),
    credentialsProvider({
      id: 'credentials',
      name: 'Email',
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials)

        logWithTimestamp('Email auth - Request received:', credentials)

        if (!parsedCredentials.success) {
          throw new CredentialsSigninError(
            AuthErrorType.USER_NOT_FOUND +
              ': ' +
              'Invalid email or password format'
          )
        }

        const { email, password } = parsedCredentials.data
        const user = await getUser(email)

        if (!user) {
          logWithTimestamp('Email auth - User not found')
          throw new CredentialsSigninError(
            AuthErrorType.USER_NOT_FOUND + ': ' + 'Email not found'
          )
        }

        const passwordsMatch = await bcrypt.compare(password, user.password)
        if (!passwordsMatch) {
          logWithTimestamp('Email auth - Incorrect password')
          throw new CredentialsSigninError(
            AuthErrorType.USER_NOT_FOUND + ': ' + 'Invalid password'
          )
        }

        logWithTimestamp('Email auth - Authentication successful')
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
      async authorize(credentials) {
        try {
          if (!credentials?.message) {
            logWithTimestamp('SIWE authorize() - Error: No message provided')
            throw new CredentialsSigninError(AuthErrorType.SIGNATURE_INVALID)
          }

          const { message, signature } = credentials
          const address = getAddressFromMessage(message as string)
          const chainId = getChainIdFromMessage(message as string)

          logWithTimestamp(
            'SIWE authorize() - Request received:',
            '\n\tAddress:',
            address,
            '\n\tChain ID:',
            chainId
          )

          // Check if user is registered
          const dbUser = await getUserByAddress(address)
          if (!dbUser) {
            logWithTimestamp('SIWE authorize() - User not registered:', address)
            throw new CredentialsSigninError(AuthErrorType.USER_NOT_FOUND)
          }
          // TODO:
          // 1. to call siwe verifyMsg to validate signature. DONE
          // 2. simplify error rendering for both auth methods(still 2 different approaches)

          // we are going to use https://viem.sh/docs/actions/public/verifyMessage.html
          const publicClient = createPublicClient({
            transport: http(
              `https://rpc.walletconnect.org/v1/?chainId=${chainId}&projectId=${projectId}`
            ),
          })
          const isValid = await publicClient.verifyMessage({
            message: message as `0x${string}`,
            address: address as `0x${string}`,
            signature: signature as `0x${string}`,
          })
          // end o view verifyMessage
          if (isValid) {
            const user = {
              ...dbUser,
              id: `${chainId}:${address}`,
              // !!! id is relevant in authorize() return value as being passed in token
              //address: address,
              //chainId: parseInt(chainId.split(':')[1]),
            }
            logWithTimestamp(
              'SIWE authorize() - Authentication successful:',
              address,
              'reUser: ',
              user
            )
            return user
          } else {
            logWithTimestamp(
              'SIWE authorize() - Error: signature verification failed'
            )
            throw new CredentialsSigninError(AuthErrorType.SIGNATURE_INVALID)
          }
        } catch (error) {
          logWithTimestamp('SIWE authorize() - Error:', error)
          throw error
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      // 初始登录
      logWithTimestamp(
        'Callback jwt, token: ',
        token,
        'account: ',
        account,
        'user: ',
        user
      )
      if (account && user) {
        /*        if (account.provider === 'wechat') {
          // 微信登录，处理微信用户信息
          const dbUser = await getUserByWechatId(user.id as string)

          // 如果用户在数据库中不存在，创建新用户
          if (!dbUser) {
            // 这里应该添加创建用户的逻辑
            console.log('Creating new user with WeChat info:', user)

            // 示例创建用户逻辑
            await createUser({
              name: user.name || '',
              email: user.email || '',
              wechatId: user.id,
              wechatOpenId: account.providerAccountId,
            })
          }
        } */

        return {
          ...token,
          userId: user.id,
          wechatId:
            account.provider === 'wechat'
              ? account.providerAccountId
              : undefined,
        }
      }
      return token
    },

    async session({ session, token }) {
      logWithTimestamp('Callback session, token: ', token, 'session: ', session)
      if (session.user) {
        session.user.id = token.userId as string
        if (token.wechatId) {
          session.user.wechatId = token.wechatId as string
        }
      }
      return session
    },
  },
})

// 根据微信ID获取用户函数
async function getUserByWechatId(wechatId: string) {
  try {
    const user = await sql`
      SELECT * FROM users 
      WHERE wechat_id = ${wechatId}
    `
    return user[0] || null
  } catch (error) {
    console.error('Database error:', error)
    throw new Error('Failed to fetch user by wechat id.')
  }
}
