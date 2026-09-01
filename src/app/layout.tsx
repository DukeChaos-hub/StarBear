import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'StarBear',
  description: 'AI-Native API client and testing tool',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">{children}</body>
    </html>
  );
}
