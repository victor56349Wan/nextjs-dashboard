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
  //max_retries: 3, // 查询失败重试次数
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
/*
 * !!! need to distribute auth config bwtn auth.ts and middleware.ts  carefully w/ below constraints found so far
 *
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: nextAuthSecret,
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },

  providers: [
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
})
