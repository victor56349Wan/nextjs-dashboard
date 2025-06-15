import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              process.env.NODE_ENV === 'development'
                ? "script-src 'self' 'unsafe-inline' 'unsafe-eval';"
                : "script-src 'self' 'unsafe-inline';",
          },
          /* Error: Coinbase Wallet SDK requires the Cross-Origin-Opener-Policy header to not be set to 'same-origin'. This is to ensure that the SDK can communicate with the Coinbase Smart Wallet app.

Please see https://www.smartwallet.dev/guides/tips/popup-tips#cross-origin-opener-policy for more information.
    at createConsoleError (http://localhost:3000/_next/static/chunks/32a9e_next_dist_client_56a827c2._.js:882:71)
    at handleConsoleError (http://localhost:3000/_next/static/chunks/32a9e_next_dist_client_56a827c2._.js:1058:54)
    at console.error (http://localhost:3000/_next/static/chunks/32a9e_next_dist_client_56a827c2._.js:1223:57)
    at checkCrossOriginOpenerPolicy (http://localhost:3000/_next/static/chunks/node_modules__pnpm_0174e9a6._.js:6293:29) */
          /*           {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          }, */
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ]
  },
  // 启用source map支持
  productionBrowserSourceMaps: true,
}

export default nextConfig
