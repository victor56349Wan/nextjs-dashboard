import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import credentialsProvider from 'next-auth/providers/credentials'
import { authConfig } from './auth.config'
import { z } from 'zod'
import type { User } from '@/app/lib/definitions'
import bcrypt from 'bcryptjs'
import postgres from 'postgres'
import jwt from 'jsonwebtoken'
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
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: nextAuthSecret,
  debug: true, // 添加调试模式
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30天
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30天
  },
  providers: [
    Credentials({
      id: 'credentials',
      name: 'Email',
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials)

        console.log('credentials authorize() called: ', credentials)
        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data
          const user = await getUser(email)
          if (!user) return null
          const passwordsMatch = await bcrypt.compare(password, user.password)

          if (passwordsMatch) return user
        }

        console.log('Invalid credentials111')
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
      async authorize(credentials) {
        try {
          if (!credentials?.message) {
            throw new Error('SiweMessage is undefined')
          }
          const { message, signature } = credentials
          const address = getAddressFromMessage(message)
          const chainId = getChainIdFromMessage(message)

          console.log(`siwe authorize() called, credentials: ${credentials}`)
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

          console.log(
            `siwe authorize() called, address: ${address} chainid: ${chainId} verifed: ${isValid} msg: ${message}`
          )
          if (isValid) {
            return {
              id: `${chainId}:${address}`,
              address: address,
              chainId: parseInt(chainId.split(':')[1]), // 从 'eip155:1' 格式中提取数字
            }
          }

          return null
        } catch (e) {
          console.error('SIWE authorize error:', e)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user && account?.provider === 'siwe') {
        token.address = user.address
        token.chainId = user.chainId
        token.sub = user.id
      }
      console.log(
        'JWT Callback - user:',
        user,
        'Token:',
        token,
        'Account:',
        account
      )
      return token
    },
    async session({ session, token }) {
      if (!token.sub) {
        return session
      }

      const [, chainId, address] = token.sub.split(':')
      if (chainId && address) {
        session.address = address
        session.chainId = parseInt(chainId, 10)
      }

      console.log('Session Callback - Session:', session, 'Token:', token)
      return session
    },
  },
})
