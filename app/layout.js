export const metadata = {
  title: 'ひとあし - 今日の小さな一歩を、一緒に。',
  description: '完璧じゃなくていい。今日できる小さな一歩を。',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;700;900&family=Noto+Serif+JP:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        {/* PWA / iOS ホーム画面対応 */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ひとあし" />
        <meta name="theme-color" content="#4a7c59" />
        <link rel="apple-touch-icon" href="/icons/icon-180.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body style={{ margin: 0, background: '#faf7f2' }}>{children}</body>
    </html>
  )
}
