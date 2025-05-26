import '@/app/ui/global.css'
import { inter } from '@/app/ui/fonts'

import { Metadata } from 'next'

import { headers } from 'next/headers'

import { cookieToInitialState } from 'wagmi'

import { wagmiAdapter } from './config'
import AppKitProvider from './context'

export const metadata: Metadata = {
  title: {
    template: '%s | Acme Dashboard by Victor Wan',
    default: 'Acme Dashboard by Victor Wan',
  },
  description: 'Victor built Learn Dashboard, with App Router.',
  metadataBase: new URL('https://next-learn-dashboard.vercel.sh'),
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  /*console.log('http headers: ', headersList)
   const key = `${wagmiAdapter.wagmiConfig.storage?.key}.store`
  console.log('key config: ', key) */
  const cookie = headersList.get('cookie')
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig, cookie)
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <AppKitProvider initialState={initialState}>{children}</AppKitProvider>
      </body>
    </html>
  )
}
