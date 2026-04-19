import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '纸片人男友 | Paper Boyfriend',
  description: '你的专属虚拟男友聊天体验',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: 'resizes-content',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh">
      <body>
        {children}
      </body>
    </html>
  )
}
