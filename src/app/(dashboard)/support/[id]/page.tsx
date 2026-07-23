"use client"

import { useParams } from 'next/navigation'
import { TicketDetail } from '@/components/support/ticket-detail'

export default function TicketDetailPage() {
  const params = useParams()
  const ticketId = params.id as string

  return (
    <div className="p-6">
      <TicketDetail ticketId={ticketId} />
    </div>
  )
}
