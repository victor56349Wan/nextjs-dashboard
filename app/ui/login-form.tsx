'use client'
import { lusitana } from '@/app/ui/fonts'
import {
  AtSymbolIcon,
  KeyIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline'
import { ArrowRightIcon } from '@heroicons/react/20/solid'
import { Button } from './button'
import { useActionState } from 'react'
import { authenticate } from '@/app/lib/actions'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useToast } from './toast'
import { signIn } from 'next-auth/react'
import Image from 'next/image'

export default function LoginForm() {
  const searchParams = useSearchParams()
  const [callbackUrl, setCallbackUrl] = useState('/dashboard')
  const [siweError, setSiweError] = useState('')
  const [errorCode, setErrorCode] = useState('')

  const [errorMessage, formAction, isPending] = useActionState(
    authenticate,
    undefined
  )

  const { showToast } = useToast()

  // 处理微信登录
  const handleWechatLogin = async () => {
    try {
      await signIn('wechat', { callbackUrl })
    } catch (error) {
      showToast('Failed to login with WeChat', 'error')
      console.error('WeChat login error:', error)
    }
  }
  // advice from copilot for hydration failure: 避免 SSR/CSR 不一致
  useEffect(() => {
    setCallbackUrl(searchParams.get('callbackUrl') || '/dashboard')
    setSiweError(searchParams.get('error') || '')
    setErrorCode(searchParams.get('code') || '')
  }, [searchParams])

  // 处理 SIWE 错误
  useEffect(() => {
    if (siweError || errorCode) {
      showToast(`siweError: ${errorCode ? ` (${errorCode})` : ''}`, 'error')
    }
  }, [siweError, errorCode, showToast])

  return (
    <div>
      <div className="absolute top-0 right-0 p-5 ">
        <appkit-button size="md" />
      </div>
      <form action={formAction} className="space-y-3">
        <div className="flex-1 rounded-lg bg-gray-50 px-6 pb-4 pt-8">
          <h1 className={`${lusitana.className} mb-3 text-2xl`}>
            Please log in to continue.
          </h1>
          <div className="w-full">
            <div>
              <label
                className="mb-3 mt-5 block text-xs font-medium text-gray-900"
                htmlFor="email">
                Email
              </label>
              <div className="relative">
                <input
                  className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
                  id="email"
                  type="email"
                  name="email"
                  placeholder="Enter your email address"
                  autoComplete="email"
                  required
                />
                <AtSymbolIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
              </div>
            </div>
            <div className="mt-4">
              <label
                className="mb-3 mt-5 block text-xs font-medium text-gray-900"
                htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
                  id="password"
                  type="password"
                  name="password"
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                  minLength={6}
                />
                <KeyIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
              </div>
            </div>
          </div>

          <input type="hidden" name="redirectTo" value={callbackUrl} />
          <Button className="mt-4 w-full" aria-disabled={isPending}>
            Log in <ArrowRightIcon className="ml-auto h-5 w-5 text-gray-50" />
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-gray-50 px-2 text-gray-500">
                Or continue with
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleWechatLogin}
            className="flex w-full items-center justify-center gap-3 rounded-md bg-green-500 px-3 py-2 text-white hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              fill="currentColor"
              viewBox="0 0 16 16">
              <path d="M11.22 8.123a.627.627 0 0 0-.623-.622.622.622 0 0 0 0 1.244.627.627 0 0 0 .623-.622zm-4.487 0a.627.627 0 0 0-.622-.622.627.627 0 0 0-.623.622.622.622 0 0 0 1.245 0z" />
              <path d="M14.425 8.12c0-2.355-2.349-4.278-5.236-4.278-2.886 0-5.236 1.923-5.236 4.278 0 2.356 2.35 4.278 5.236 4.278.615 0 1.212-.09 1.78-.245l1.623.953-.42-1.577c1.377-.837 2.253-2.084 2.253-3.41zm-7.246-1.757a.777.777 0 0 1-.773.772.776.776 0 0 1-.772-.772c0-.426.347-.773.772-.773.426 0 .773.347.773.773zm4.07 0a.776.776 0 0 1-.773.772.777.777 0 0 1-.772-.772c0-.426.347-.773.772-.773.427 0 .773.347.773.773zM12.844 0H3.156A3.156 3.156 0 0 0 0 3.156v9.688A3.156 3.156 0 0 0 3.156 16h9.688A3.156 3.156 0 0 0 16 12.844V3.156A3.156 3.156 0 0 0 12.844 0z" />
            </svg>
            Log in with WeChat
          </button>

          <div className="flex h-8 items-end space-x-1">
            {/* Add form errors here */}
            {errorMessage && (
              <>
                <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                <p className="text-sm text-red-500">{errorMessage}</p>
              </>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
