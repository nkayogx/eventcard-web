// "Sign up your company" - creates the company and the owner's account in one step.

import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/apiClient'
import type { LoginResponse } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { countryChoices, myTimeZone, timeZoneChoices } from '../components/choices'
import { Button, ErrorBox, SelectField, TextField } from '../components/shared'
import { PublicLayout } from '../layout/PublicLayout'

export function SignupPage() {
  const { logIn } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    companyName: '',
    fullName: '',
    email: '',
    phone: '+255',
    password: '',
    countryCode: 'TZ',
    timeZone: myTimeZone,
  })

  const signup = useMutation({
    mutationFn: () => api.post<LoginResponse>('/api/auth/signup-company', form),
    onSuccess: (response) => {
      logIn(response)
      navigate('/')
    },
  })

  function update(field: keyof typeof form, value: string) {
    setForm({ ...form, [field]: value })
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    signup.mutate()
  }

  return (
    <PublicLayout title="Create your company account" subtitle="Start sending digital invitation cards in minutes.">
      <form onSubmit={submit} className="space-y-4">
        <TextField label="Company name" name="companyName" required value={form.companyName}
          onChange={(e) => update('companyName', e.target.value)} error={signup.error} />
        <TextField label="Your full name" name="fullName" required value={form.fullName}
          onChange={(e) => update('fullName', e.target.value)} error={signup.error} />
        <TextField label="Email" name="email" type="email" required value={form.email}
          onChange={(e) => update('email', e.target.value)} error={signup.error} />
        <TextField label="Phone" name="phone" required value={form.phone} hint="International format, e.g. +255712345678"
          onChange={(e) => update('phone', e.target.value)} error={signup.error} />
        <TextField label="Password" name="password" type="password" required minLength={8} value={form.password}
          hint="At least 8 characters" onChange={(e) => update('password', e.target.value)} error={signup.error} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField label="Country" name="countryCode" options={countryChoices} value={form.countryCode}
            onChange={(e) => update('countryCode', e.target.value)} error={signup.error} />
          <SelectField label="Time zone" name="timeZone" options={timeZoneChoices} value={form.timeZone}
            onChange={(e) => update('timeZone', e.target.value)} error={signup.error} />
        </div>

        <ErrorBox error={signup.error} />
        <Button type="submit" busy={signup.isPending} className="w-full">
          Create account
        </Button>
        <p className="text-center text-sm text-ink-soft">
          Already have an account? <Link to="/login" className="text-brand hover:underline">Log in</Link>
        </p>
      </form>
    </PublicLayout>
  )
}
