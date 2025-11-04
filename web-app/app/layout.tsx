import "./globals.css";
import "../styles/global.css";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Henze Trivia',
  description: 'Multiplayer trivia game with AI-generated questions from your group chats',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
