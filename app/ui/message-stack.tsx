'use client'

import {
  ExclamationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'

export type MessageType = 'success' | 'error' | 'info'

interface MessageInstance {
  id: string
  type: MessageType
  content: string
  duration: number
}

interface MessageProps {
  type: MessageType
  content: string
  duration?: number
  onRemove: (id: string) => void
  id: string
  offset: number
}

function Message({
  type,
  content,
  duration = 3000,
  onRemove,
  id,
  offset,
}: MessageProps) {
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLeaving(true)
      setTimeout(() => {
        onRemove(id)
      }, 200)
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onRemove, id])

  const Icon = {
    success: CheckCircleIcon,
    error: ExclamationCircleIcon,
    info: XCircleIcon,
  }[type]

  const baseStyles =
    'fixed left-1/2 transform -translate-x-1/2 flex items-center space-x-2 px-4 py-2 rounded-lg shadow-lg transition-all duration-200'
  const typeStyles = {
    success: 'bg-green-50 text-green-800 border border-green-200',
    error: 'bg-red-50 text-red-800 border border-red-200',
    info: 'bg-blue-50 text-blue-800 border border-blue-200',
  }[type]

  const animationStyles = isLeaving
    ? 'opacity-0 translate-y-[-20px]'
    : 'opacity-100 translate-y-0'

  const topPosition = `top-${4 + offset * 16}` // 每个消息之间的间距

  return (
    <div
      className={`${baseStyles} ${typeStyles} ${animationStyles} ${topPosition}`}
      style={{ top: `${16 + offset * 64}px` }}>
      <Icon className="h-5 w-5 flex-shrink-0" />
      <p className="text-sm font-medium">{content}</p>
    </div>
  )
}

export function MessageStack() {
  const [messages, setMessages] = useState<MessageInstance[]>([])

  const removeMessage = (id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id))
  }

  const addMessage = (type: MessageType, content: string, duration = 3000) => {
    const id = Math.random().toString(36).substr(2, 9)
    setMessages((prev) => [...prev, { id, type, content, duration }])
  }

  return {
    messageComponent: (
      <div className="fixed z-50 pointer-events-none">
        {messages.map((msg, index) => (
          <Message
            key={msg.id}
            id={msg.id}
            type={msg.type}
            content={msg.content}
            duration={msg.duration}
            onRemove={removeMessage}
            offset={index}
          />
        ))}
      </div>
    ),
    addMessage,
  }
}
