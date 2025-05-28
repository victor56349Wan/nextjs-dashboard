import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
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
const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' })

async function getUser(email: string): Promise<User | undefined> {
  try {
    const user = await sql<User[]>`SELECT * FROM users WHERE email=${email}`
    return user[0]
  } catch (error) {
    console.error('Failed to fetch user:', error)
    throw new Error('Failed to fetch user.')
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

  providers: [
    credentialsProvider({
      id: 'credentials',
      name: 'Email',
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials)

        logWithTimestamp('credentials authorize() called: ', credentials)
        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data
          const user = await getUser(email)
          if (!user) return null
          const passwordsMatch = await bcrypt.compare(password, user.password)

          if (passwordsMatch) return user
        }

        logWithTimestamp('Invalid credentials111')
        return null
      },
    }),
    credentialsProvider({
      id: 'siwe',
      name: 'Ethereum',
      credentials: {
        message: {
          label: 'Message',
          type: 'text',
          placeholder: '0x0',
        },
        signature: {
          label: 'Signature',
          type: 'text',
          placeholder: '0x0',
        },
      },
      async authorize(credentials, request) {
        try {
          if (!credentials?.message) {
            throw new Error('SiweMessage is undefined')
          }
          const { message, signature } = credentials
          const address = getAddressFromMessage(message)
          const chainId = getChainIdFromMessage(message)

          logWithTimestamp(
            'SIWE authorize() called, INPUT:\n\tcredentials:',
            credentials,
            '\n\trequest:',
            request
          )
          // for the moment, the verifySignature is not working with social logins and emails  with non deployed smart accounts
          /*  const isValid = await verifySignature({
          address,
          message,
          signature,
          chainId,
          projectId,
        }); */
          // we are going to use https://viem.sh/docs/actions/public/verifyMessage.html
          const publicClient = createPublicClient({
            transport: http(
              `https://rpc.walletconnect.org/v1/?chainId=${chainId}&projectId=${projectId}`
            ),
          })
          const isValid = await publicClient.verifyMessage({
            message,
            address: address as `0x${string}`,
            signature: signature as `0x${string}`,
          })
          // end o view verifyMessage

          logWithTimestamp(
            `SIWE authorize() result - \n\taddress: ${address}, chainid: ${chainId}, verified: ${isValid}, \n\tmsg: ${message}`
          )
          if (isValid) {
            // Add logic here to look up the user from the credentials supplied
            const user = {
              id: `${chainId}:${address}`,
              address: address,
              chainId: parseInt(chainId.split(':')[1]), // 从 'eip155:1' 格式中提取数字
            }
            return user
          }

          return null
        } catch (e) {
          logWithTimestamp('SIWE authorize error:', e)
          return null
        }
      },
    }),
  ],
  // callbacks: {
  //   async authorized({ auth, request }) {
  //     // 增强用户状态检查
  //     const hasValidSession = !!(
  //       auth?.expires &&
  //       new Date(auth.expires) > new Date() &&
  //       auth?.user
  //     )
  //     const { nextUrl } = request

  //     logWithTimestamp('Callback in auth.ts authorized, Input:\n\tauth:', auth)

  //     logWithTimestamp(
  //       'Callback in auth.ts authorized -',
  //       '\n\tauth:',
  //       JSON.stringify(
  //         {
  //           ...auth,
  //           //user: auth?.user || {},
  //           user: auth?.user,
  //           session: auth?.session,
  //         },
  //         null,
  //         2
  //       ),
  //       '\n\thasValidSession:',
  //       hasValidSession,
  //       '\n\tnextUrl:',
  //       nextUrl.toString()
  //     )

  //     const isOnDashboard = nextUrl.pathname.startsWith('/dashboard')
  //     if (isOnDashboard) {
  //       return hasValidSession
  //     }
  //     return true
  //   },
  //   jwt({ token, user, account, trigger }) {
  //     logWithTimestamp(
  //       'JWT Callback in auth.ts - Input:',
  //       '\n\ttoken:',
  //       token,
  //       '\n\tuser:',
  //       user,
  //       '\n\taccount:',
  //       account,
  //       '\n\ttrigger:',
  //       trigger
  //     )

  //     // 初次登录时设置用户信息
  //     if (user && account?.provider === 'siwe') {
  //       token = {
  //         ...token,
  //         sub: user.id,
  //         address: user.address,
  //         //chainId: user.chainId,
  //       }
  //     }

  //     logWithTimestamp('JWT Callback in auth.ts - Output:\n\tToken:', token)
  //     return token
  //   },

  //   session({ session, token }) {
  //     logWithTimestamp(
  //       'Session Callback in auth.ts - Input:',
  //       '\n\tsession:',
  //       session,
  //       '\n\ttoken:',
  //       token
  //     )
  //     try {
  //       let newSession = session

  //       if (token) {
  //         // 确保会话中包含完整的用户信息
  //         const userInfo = {
  //           id: token.sub,
  //           address: token.address as string,
  //           //name: token.address as string,
  //         }

  //         newSession = {
  //           ...newSession,
  //           user: userInfo,
  //           //address: token.address as string,
  //           //chainId: token.chainId as number,
  //         }
  //       }
  //       logWithTimestamp(
  //         'Session Callback in auth.ts - Output:\n\tSession:',
  //         newSession
  //       )
  //       return newSession
  //     } catch (error) {
  //       logWithTimestamp('Session error:', error)
  //       return session
  //     }
  //   },
  // },
})
