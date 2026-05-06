import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'MedicoseBuddy — BPT Study Platform',
  description: 'MP Medical Science University, Jabalpur — BPT Chapter Notes, PYQ Papers & Solutions',
  keywords: 'BPT notes, MPMSU, physiotherapy, PYQ papers, BPT study material',
  openGraph: {
    title: 'MedicoseBuddy — BPT Study Platform',
    description: 'MPMSU BPT ke liye chapter notes, PYQ papers aur solutions',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Razorpay Script */}
        <script src="https://checkout.razorpay.com/v1/checkout.js" async />
      </head>
      <body className={`${outfit.variable} font-outfit bg-[#07090F] text-[#EEF2FF] antialiased`}>
        {children}
      </body>
    </html>
  )
}
