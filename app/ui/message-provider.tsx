'use client'
import { message } from 'antd'
import { ReactNode } from 'react'

export function MessageProvider({ children }: { children: ReactNode }) {
  const [messageApi, contextHolder] = message.useMessage()

  return (
    <>
      {contextHolder}
      {children}
    </>
  )
}
