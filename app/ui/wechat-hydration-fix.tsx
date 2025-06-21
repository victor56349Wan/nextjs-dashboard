'use client'

import { useEffect } from 'react'

export default function WeChatHydrationFix() {
  useEffect(() => {
    // 检测微信浏览器
    const isWeChat = /MicroMessenger/i.test(navigator.userAgent)

    if (isWeChat) {
      // 为微信浏览器添加特殊的CSS类
      document.documentElement.classList.add('wechat-browser')
      document.body.classList.add('wechat-browser')

      // 强制设置样式以防止hydration错误
      const style = document.createElement('style')
      style.textContent = `
        .wechat-browser,
        .wechat-browser * {
          -webkit-touch-callout: none !important;
        }
      `
      document.head.appendChild(style)
    }
  }, [])

  return null // 这是一个无渲染组件
}
