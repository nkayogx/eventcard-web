// Lists used in drop-down menus.

export const countryChoices = [
  { value: 'TZ', label: 'Tanzania' },
  { value: 'KE', label: 'Kenya' },
  { value: 'UG', label: 'Uganda' },
  { value: 'RW', label: 'Rwanda' },
  { value: 'BI', label: 'Burundi' },
  { value: 'CD', label: 'DR Congo' },
  { value: 'ZM', label: 'Zambia' },
  { value: 'MW', label: 'Malawi' },
  { value: 'MZ', label: 'Mozambique' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'NG', label: 'Nigeria' },
  { value: 'GH', label: 'Ghana' },
  { value: 'ET', label: 'Ethiopia' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'US', label: 'United States' },
]

/** Every time zone the browser knows, e.g. "Africa/Dar_es_Salaam". */
export const timeZoneChoices = Intl.supportedValuesOf('timeZone').map((zone) => ({
  value: zone,
  label: zone.replaceAll('_', ' '),
}))

/** The browser's own time zone - a good default for new companies. */
export const myTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
