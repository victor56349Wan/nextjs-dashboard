'use client'

import {
  ExclamationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'

export type MessageType = 'success' | 'error' | 'info'

interface MessageProps {
  type?: MessageType
  content: string
  duration?: number
  onClose?: () => void
  visible?: boolean
}

export function Message({
  type = 'info',
  content,
  duration = 3000,
  onClose,
  visible = true,
}: MessageProps) {
  const [isVisible, setIsVisible] = useState(visible)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    setIsVisible(visible)
    if (visible && duration > 0) {
      const timer = setTimeout(() => {
        setIsLeaving(true)
        setTimeout(() => {
          setIsVisible(false)
          setIsLeaving(false)
          onClose?.()
        }, 200) // 动画持续时间
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [visible, duration, onClose])

  if (!isVisible) return null

  const Icon = {
    success: CheckCircleIcon,
    error: ExclamationCircleIcon,
    info: XCircleIcon,
  }[type]

  const baseStyles =
    'fixed top-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-2 px-4 py-2 rounded-lg shadow-lg transition-all duration-200'
  const typeStyles = {
    success: 'bg-green-50 text-green-800 border border-green-200',
    error: 'bg-red-50 text-red-800 border border-red-200',
    info: 'bg-blue-50 text-blue-800 border border-blue-200',
  }[type]

  const animationStyles = isLeaving
    ? 'opacity-0 translate-y-[-20px]'
    : 'opacity-100 translate-y-0'

  return (
    <div className={`${baseStyles} ${typeStyles} ${animationStyles}`}>
      <Icon className="h-5 w-5 flex-shrink-0" />
      <p className="text-sm font-medium">{content}</p>
    </div>
  )
}

export function useMessage() {
  const [messageProps, setMessageProps] = useState<Omit<
    MessageProps,
    'visible'
  > | null>(null)
  const [visible, setVisible] = useState(false)

  const show = (props: Omit<MessageProps, 'visible'>) => {
    setMessageProps(props)
    setVisible(true)
  }

  const hide = () => {
    setVisible(false)
  }

  const messageComponent = messageProps ? (
    <Message {...messageProps} visible={visible} onClose={hide} />
  ) : null

  return { show, hide, messageComponent }
}
