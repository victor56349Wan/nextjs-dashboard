'use client'
import { useSearchParams } from 'next/navigation'

export default function ErrorPage({
  error1,
  reset,
}: {
  error1: Error & { digest?: string }
  reset: () => void
}) {
  const searchParams = useSearchParams()

  const error = searchParams.get('error')
  const message = searchParams.get('code')

  const getErrorMessage = () => {
    // 处理特定的错误类型
    switch (error) {
      case 'CredentialsSignin':
        return message || '登录失败，请检查您的钱包地址'
      case 'UNREGISTERED_WALLET':
        return '该钱包地址尚未注册'
      default:
        return message || '发生错误，请稍后重试'
    }
  }

  console.log('auth/error:  ', error)
  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <div className="rounded-lg bg-red-50 p-8 text-center">
        <h1 className="mb-4 text-2xl font-bold text-red-600">出错了</h1>
        <p className="text-lg text-gray-700">{getErrorMessage()}</p>
        <button
          onClick={() => (window.location.href = '/login')}
          className="mt-6 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
          返回登录页面
        </button>
      </div>
    </div>
  )
}
