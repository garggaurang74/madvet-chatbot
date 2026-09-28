import { Metadata } from 'next'
import ChatWindow from '@/components/ChatWindow'

export const metadata: Metadata = {
  title: 'Ask AI | Madvet Animal Healthcare',
  description: 'Ask the Madvet product assistant about any product, dose or indication — in Hindi or English.',
}

export default function AskPage() {
  return <ChatWindow />
}
