// A payment that is waiting for money: shows how to pay, then the "I have paid" form.

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { api } from '../../api/apiClient'
import { formatTzs, type Payment } from '../../api/types'
import { Button, Card, ErrorBox, TextField } from '../../components/ui'

export function PaymentPanel({ payment, canPay }: { payment: Payment; canPay: boolean }) {
  const queryClient = useQueryClient()
  const [payerPhone, setPayerPhone] = useState(payment.payerPhone ?? '')
  const [transactionReference, setTransactionReference] = useState(payment.transactionReference ?? '')
  const alreadySubmitted = payment.submittedAt !== null

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['billing'] })
    queryClient.invalidateQueries({ queryKey: ['payments'] })
  }

  const submit = useMutation({
    mutationFn: () => api.put<Payment>(`/api/billing/payments/${payment.id}/submit`, { payerPhone, transactionReference }),
    onSuccess: refresh,
  })
  const cancel = useMutation({
    mutationFn: () => api.post<Payment>(`/api/billing/payments/${payment.id}/cancel`),
    onSuccess: refresh,
  })

  function send(formEvent: FormEvent) {
    formEvent.preventDefault()
    submit.mutate()
  }

  return (
    <Card className="space-y-4 border-brand/30">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">Payment {payment.reference}</p>
          <h2 className="text-lg font-semibold">{payment.description}</h2>
          <p className="text-sm text-ink-soft">{formatTzs(payment.amountTzs)}</p>
        </div>
        {alreadySubmitted && (
          <span className="rounded-full bg-warning-soft px-3 py-1 text-xs font-medium">
            Waiting for confirmation – usually within a few hours
          </span>
        )}
      </div>

      {payment.instructions && !alreadySubmitted && (
        <div className="rounded-lg bg-paper p-4">
          <p className="mb-2 font-medium">{payment.instructions.title}</p>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {payment.instructions.steps.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </div>
      )}

      {canPay && (
        <form onSubmit={send} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Phone number you paid with" name="payerPhone" required placeholder="0712 345 678"
              value={payerPhone} onChange={(e) => setPayerPhone(e.target.value)} error={submit.error} />
            <TextField label="Transaction code from the SMS" name="transactionReference" required placeholder="QK12AB34CD"
              value={transactionReference} onChange={(e) => setTransactionReference(e.target.value)} error={submit.error} />
          </div>
          <ErrorBox error={submit.error ?? cancel.error} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" busy={submit.isPending}>{alreadySubmitted ? 'Update details' : 'I have paid'}</Button>
            <Button type="button" look="secondary" busy={cancel.isPending} onClick={() => cancel.mutate()}>
              Cancel this payment
            </Button>
          </div>
        </form>
      )}
    </Card>
  )
}
