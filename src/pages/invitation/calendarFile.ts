// Makes an ".ics" calendar file for the event, which phones and computers
// open in their calendar app ("Add to calendar").

import type { InvitationPage } from '../../api/types'

/** "2026-12-12T16:00:00" -> "20261212T160000" (the calendar file date format) */
function calendarTime(localDateTime: string): string {
  return localDateTime.slice(0, 19).replaceAll('-', '').replaceAll(':', '')
}

/** Calendar files need commas, semicolons and new lines written in a special way. */
function calendarText(text: string): string {
  return text.replaceAll('\\', '\\\\').replaceAll(',', '\\,').replaceAll(';', '\\;').replaceAll('\n', '\\n')
}

export function downloadCalendarFile(code: string, invitation: InvitationPage) {
  const event = invitation.event
  const nowInUtc = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
  const place = [event.venueName, event.venueAddress].filter(Boolean).join(', ')

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EventCard//Invitation//EN',
    'BEGIN:VEVENT',
    `UID:${code}@eventcard`,
    `DTSTAMP:${nowInUtc}`,
    // The time is the venue's local time, in the event's time zone
    `DTSTART;TZID=${event.timeZone}:${calendarTime(event.startsAt)}`,
    event.endsAt ? `DTEND;TZID=${event.timeZone}:${calendarTime(event.endsAt)}` : 'DURATION:PT4H',
    `SUMMARY:${calendarText(event.name)}`,
    `LOCATION:${calendarText(place)}`,
    event.mapLink ? `URL:${event.mapLink}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)

  const file = new Blob([lines.join('\r\n')], { type: 'text/calendar' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(file)
  link.download = 'invitation.ics'
  link.click()
  URL.revokeObjectURL(link.href)
}
