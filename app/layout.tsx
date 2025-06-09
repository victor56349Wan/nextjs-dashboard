import '@/app/ui/global.css'
import { inter } from '@/app/ui/fonts'

import { Metadata } from 'next'

import { headers } from 'next/headers'

import { cookieToInitialState } from 'wagmi'

import { wagmiAdapter } from './config'
import AppKitProvider from './context'
import { MessageProvider } from './ui/message-provider'
import { ToastProvider } from './ui/toast'

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
  const cookie = headersList.get('cookie')
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig, cookie)
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <ToastProvider>
          <AppKitProvider initialState={initialState}>
            <MessageProvider>{children}</MessageProvider>
          </AppKitProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
