import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Hind_Siliguri } from 'next/font/google'
import './globals.css'

const hindSiliguri = Hind_Siliguri({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['bengali', 'latin'],
})

export const metadata: Metadata = {
  title: 'মেসফ্লো (MessFlow) · ডিজিটাল মেস ম্যানেজমেন্ট',
  description: 'মিল হিসাব, বাজার খরচ, বাসা ভাড়া, ইউটিলিটি বিল এবং মাসিক ফাইনাল হিসাব পরিচালনায় আপনার স্মার্ট ডিজিটাল মেস সহকারী।',
  generator: 'shishir',
 
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="bn" className={`${hindSiliguri.className} bg-background`}>
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
