import NextAuth from 'next-auth'
import { authConfig } from './auth.config'

export default NextAuth(authConfig).auth

export const config = {
  matcher: [
    /*
     * 匹配所有路径，但排除:
     * - api (API路由)
     * - _next/static (静态文件)
     * - _next/image (图片优化文件))
     * - favicon.ico (网站图标)
     */
    '/((?!api|_next/static|_next/image|.*\\.png$|favicon\\.ico).*)',
  ],
}
