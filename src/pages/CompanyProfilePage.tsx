// Company profile: everyone in the company can see it, only the owner can change it.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { api } from '../api/apiClient'
import type { CompanyDetails } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { countryChoices, timeZoneChoices } from '../components/choices'
import { Button, Card, ErrorBox, PageTitle, SelectField, SuccessBox, TextField } from '../components/ui'

const DEFAULT_PRIMARY = '#7A1F3D'
const DEFAULT_SECONDARY = '#F7E9EE'

/** The editable part of the profile, as kept in the form. */
interface ProfileForm {
  name: string
  slug: string
  contactPhone: string
  contactEmail: string
  address: string
  city: string
  countryCode: string
  timeZone: string
  primaryColor: string
  secondaryColor: string
}

function toForm(company: CompanyDetails): ProfileForm {
  return {
    name: company.name,
    slug: company.slug,
    contactPhone: company.contactPhone,
    contactEmail: company.contactEmail,
    address: company.address ?? '',
    city: company.city ?? '',
    countryCode: company.countryCode,
    timeZone: company.timeZone,
    primaryColor: company.primaryColor ?? DEFAULT_PRIMARY,
    secondaryColor: company.secondaryColor ?? DEFAULT_SECONDARY,
  }
}

export function CompanyProfilePage() {
  const { me } = useAuth()
  const isOwner = me?.role === 'OWNER'
  const queryClient = useQueryClient()
  const [form, setForm] = useState<ProfileForm | null>(null)

  const company = useQuery({
    queryKey: ['my-company'],
    queryFn: () => api.get<CompanyDetails>('/api/my-company'),
  })

  // Fill the form once the company has loaded
  useEffect(() => {
    if (company.data && form === null) setForm(toForm(company.data))
  }, [company.data, form])

  // After any change, refresh both this page and the side menu (logo, name)
  function showUpdatedCompany(updated: CompanyDetails) {
    queryClient.setQueryData(['my-company'], updated)
    queryClient.invalidateQueries({ queryKey: ['me'] })
  }

  const save = useMutation({
    mutationFn: (values: ProfileForm) =>
      api.put<CompanyDetails>('/api/my-company', {
        ...values,
        address: values.address || null,
        city: values.city || null,
      }),
    onSuccess: showUpdatedCompany,
  })

  const uploadLogo = useMutation({
    mutationFn: (file: File) => {
      const upload = new FormData()
      upload.append('file', file)
      return api.post<CompanyDetails>('/api/my-company/logo', upload)
    },
    onSuccess: showUpdatedCompany,
  })

  if (company.isLoading || !form) return <p className="text-ink-soft">Loading…</p>
  if (company.error) return <ErrorBox error={company.error} />

  function update(field: keyof ProfileForm, value: string) {
    if (form) setForm({ ...form, [field]: value })
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (form) save.mutate(form)
  }

  function chooseLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) uploadLogo.mutate(file)
  }

  const logoUrl = company.data?.logoUrl ?? null

  return (
    <div className="max-w-4xl">
      <PageTitle
        title="Company profile"
        subtitle={isOwner ? 'These details appear on your invitation cards.' : 'Only the company owner can change these details.'}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <form onSubmit={submit} className="space-y-6">
          <Card className="space-y-4">
            <h2 className="font-semibold">Details</h2>
            <fieldset disabled={!isOwner} className="space-y-4">
              <TextField label="Company name" name="name" required value={form.name}
                onChange={(e) => update('name', e.target.value)} error={save.error} />
              <TextField label="Short name for links" name="slug" required value={form.slug}
                hint={`Your links will look like …/${form.slug}/…`}
                onChange={(e) => update('slug', e.target.value.toLowerCase())} error={save.error} />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Contact phone" name="contactPhone" required value={form.contactPhone}
                  onChange={(e) => update('contactPhone', e.target.value)} error={save.error} />
                <TextField label="Contact email" name="contactEmail" type="email" required value={form.contactEmail}
                  onChange={(e) => update('contactEmail', e.target.value)} error={save.error} />
                <TextField label="Address" name="address" value={form.address}
                  onChange={(e) => update('address', e.target.value)} error={save.error} />
                <TextField label="City" name="city" value={form.city}
                  onChange={(e) => update('city', e.target.value)} error={save.error} />
                <SelectField label="Country" name="countryCode" options={countryChoices} value={form.countryCode}
                  onChange={(e) => update('countryCode', e.target.value)} error={save.error} />
                <SelectField label="Time zone" name="timeZone" options={timeZoneChoices} value={form.timeZone}
                  onChange={(e) => update('timeZone', e.target.value)} error={save.error} />
              </div>
            </fieldset>
          </Card>

          <Card className="space-y-4">
            <h2 className="font-semibold">Brand colours</h2>
            <fieldset disabled={!isOwner} className="grid gap-4 sm:grid-cols-2">
              <ColourPicker label="Main colour" name="primaryColor" value={form.primaryColor}
                onChange={(value) => update('primaryColor', value)} error={save.error} />
              <ColourPicker label="Second colour" name="secondaryColor" value={form.secondaryColor}
                onChange={(value) => update('secondaryColor', value)} error={save.error} />
            </fieldset>
          </Card>

          {isOwner && (
            <div className="space-y-3">
              <ErrorBox error={save.error} />
              {save.isSuccess && <SuccessBox>Saved.</SuccessBox>}
              <Button type="submit" busy={save.isPending}>Save changes</Button>
            </div>
          )}
        </form>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 font-semibold">Logo</h2>
            <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-line bg-paper">
              {logoUrl ? (
                <img src={logoUrl} alt="Company logo" className="max-h-24 max-w-full object-contain" />
              ) : (
                <span className="text-sm text-ink-soft">No logo yet</span>
              )}
            </div>
            {isOwner && (
              <label className="mt-3 block cursor-pointer text-center text-sm text-brand hover:underline">
                {uploadLogo.isPending ? 'Uploading…' : 'Upload logo (PNG, JPG or SVG, max 2 MB)'}
                <input type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={chooseLogo} />
              </label>
            )}
            {uploadLogo.error && <p className="mt-2 text-sm text-danger">{(uploadLogo.error as Error).message}</p>}
          </Card>

          <CardPreview name={form.name} logoUrl={logoUrl} primary={form.primaryColor} secondary={form.secondaryColor} />
        </div>
      </div>
    </div>
  )
}

function ColourPicker(props: {
  label: string
  name: string
  value: string
  onChange: (value: string) => void
  error: unknown
}) {
  return (
    <div className="flex items-end gap-3">
      <input
        type="color"
        aria-label={`${props.label} picker`}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value.toUpperCase())}
        className="h-10 w-12 cursor-pointer rounded border border-line bg-white p-1"
      />
      <div className="flex-1">
        <TextField label={props.label} name={props.name} value={props.value} error={props.error}
          onChange={(e) => props.onChange(e.target.value)} />
      </div>
    </div>
  )
}

/** A small live preview of how the brand colours will look on an invitation card. */
function CardPreview(props: { name: string; logoUrl: string | null; primary: string; secondary: string }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-ink-soft">Card preview</p>
      <div className="overflow-hidden rounded-xl border border-line shadow-sm" style={{ backgroundColor: props.secondary }}>
        <div className="px-5 py-3 text-sm font-medium text-white" style={{ backgroundColor: props.primary }}>
          {props.name}
        </div>
        <div className="space-y-2 px-5 py-6 text-center">
          {props.logoUrl && <img src={props.logoUrl} alt="" className="mx-auto h-10 object-contain" />}
          <p className="text-xs uppercase tracking-widest" style={{ color: props.primary }}>You are invited</p>
          <p className="text-lg font-semibold">Asha &amp; Baraka's Wedding</p>
          <p className="text-sm text-ink-soft">Saturday, 12 December · 4:00 PM</p>
          <span className="mt-2 inline-block rounded-full px-4 py-1.5 text-xs font-medium text-white"
            style={{ backgroundColor: props.primary }}>
            RSVP
          </span>
        </div>
      </div>
    </div>
  )
}
