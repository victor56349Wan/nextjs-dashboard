import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async headers() {
    return process.env.NODE_ENV === 'development'
      ? [
          {
            source: '/:path*',
            headers: [
              {
                key: 'Content-Security-Policy',
                value: "script-src 'self' 'unsafe-inline' 'unsafe-eval';",
              },
            ],
          },
        ]
      : [] // 生产环境不设置CSP
  },
  // 启用source map支持
  productionBrowserSourceMaps: true,
}

export default nextConfig
