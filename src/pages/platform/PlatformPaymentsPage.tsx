// Platform admin: payments waiting to be checked. After checking that the money arrived
// on the Lipa Namba / till, press Confirm - the plan or credits switch on at once.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../../api/apiClient'
import { formatTzs, paymentStatusNames, type Payment, type PaymentStatus } from '../../api/types'
import { Button, Card, ErrorBox, PageTitle } from '../../components/shared'

const statusTabs: PaymentStatus[] = ['WAITING_FOR_PAYMENT', 'PAID', 'REJECTED', 'CANCELLED']

export function PlatformPaymentsPage() {
  const [status, setStatus] = useState<PaymentStatus>('WAITING_FOR_PAYMENT')
  const payments = useQuery({
    queryKey: ['platform-payments', status],
    queryFn: () => api.get<Payment[]>(`/api/platform/payments?status=${status}`),
  })

  return (
    <div className="max-w-5xl space-y-6">
      <PageTitle title="Payments" subtitle="Check that the money arrived, then confirm. Oldest first." />
      <div className="flex flex-wrap gap-1">
        {statusTabs.map((tab) => (
          <button key={tab} onClick={() => setStatus(tab)}
            className={`rounded-full px-3 py-1.5 text-sm ${status === tab ? 'bg-brand text-white' : 'bg-card text-ink-soft ring-1 ring-line'}`}>
            {paymentStatusNames[tab]}
          </button>
        ))}
      </div>

      <ErrorBox error={payments.error} />
      {payments.data && payments.data.length === 0 && <p className="text-sm text-ink-soft">Nothing here.</p>}
      <div className="space-y-3">
        {payments.data?.map((payment) => <PaymentRow key={payment.id} payment={payment} />)}
      </div>
    </div>
  )
}

function PaymentRow({ payment }: { payment: Payment }) {
  const queryClient = useQueryClient()
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['platform-payments'] })
    queryClient.invalidateQueries({ queryKey: ['platform-companies'] })
  }

  const confirm = useMutation({
    mutationFn: () => api.put<Payment>(`/api/platform/payments/${payment.id}/confirm`),
    onSuccess: refresh,
  })
  const reject = useMutation({
    mutationFn: () => api.put<Payment>(`/api/platform/payments/${payment.id}/reject`, { note }),
    onSuccess: refresh,
  })

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{payment.companyName}</p>
          <p className="text-sm">{payment.description} · <strong>{formatTzs(payment.amountTzs)}</strong></p>
          <p className="text-xs text-ink-soft">
            Reference {payment.reference} · ordered {new Date(payment.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="text-right text-sm">
          {payment.transactionReference ? (
            <>
              <p>Code: <span className="font-mono font-semibold">{payment.transactionReference}</span></p>
              <p className="text-ink-soft">Paid from {payment.payerPhone}</p>
            </>
          ) : (
            <p className="text-ink-soft">{payment.status === 'WAITING_FOR_PAYMENT' ? 'No payment details sent yet' : ''}</p>
          )}
          {payment.adminNote && <p className="text-danger">{payment.adminNote}</p>}
        </div>
      </div>

      {payment.status === 'WAITING_FOR_PAYMENT' && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button busy={confirm.isPending} onClick={() => confirm.mutate()}>Confirm – money received</Button>
            <Button look="danger" onClick={() => setRejecting(!rejecting)}>Reject</Button>
          </div>
          {rejecting && (
            <div className="flex flex-wrap gap-2">
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why? e.g. No money received"
                className="min-w-64 flex-1 rounded-lg border border-line px-3 py-2 text-sm" />
              <Button look="danger" busy={reject.isPending} disabled={!note.trim()} onClick={() => reject.mutate()}>
                Reject payment
              </Button>
            </div>
          )}
          <ErrorBox error={confirm.error ?? reject.error} />
        </div>
      )}
    </Card>
  )
}
