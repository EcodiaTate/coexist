/** Shared error message constants for check-in flows (page + sheet). */
export const CHECK_IN_ERROR_MESSAGES = {
  not_registered: "You're not registered for this event. Register first, then try again.",
  already_checked_in: "You've already checked in to this event!",
  invalid_qr: 'This QR code is not valid for this event.',
  event_cancelled: 'This event has been cancelled.',
  event_not_active: 'Check-in is not available for this event right now.',
  generic: 'Something went wrong. Please try again.',
} as const

export type CheckInErrorKind = keyof typeof CHECK_IN_ERROR_MESSAGES
