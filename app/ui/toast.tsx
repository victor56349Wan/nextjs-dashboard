'use client'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

type ToastType = 'error' | 'success' | 'info'

interface ToastMessage {
  id: number
  type: ToastType
  message: string
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: ToastMessage[]
  onRemove: (id: number) => void
}) {
  return createPortal(
    <div className="fixed left-0 right-0 top-4 z-50 mx-auto flex justify-center">
      <div className="flex flex-col items-center gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              animate-slide-down px-6 py-3 rounded-lg shadow-lg text-white min-w-[300px] text-center
              ${
                toast.type === 'error'
                  ? 'bg-red-500'
                  : toast.type === 'success'
                  ? 'bg-green-500'
                  : 'bg-blue-500'
              }
            `}
            onClick={() => onRemove(toast.id)}>
            {toast.message}
          </div>
        ))}
      </div>
    </div>,
    document.body
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    // 如果消息为空，清除所有消息
    if (!message) {
      setToasts([])
      return
    }

    const id = Date.now()
    setToasts((prev) => [...prev, { id, type, message }])

    // 5秒后自动移除
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 10000)
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {isMounted && <ToastContainer toasts={toasts} onRemove={removeToast} />}
    </ToastContext.Provider>
  )
}
