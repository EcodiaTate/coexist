import { z } from 'zod'

/* ------------------------------------------------------------------ */
/*  Shared validation schemas for Supabase mutations                   */
/*                                                                     */
/*  5b.F4, 2026-09-06: this file used to export FIFTEEN zod schemas    */
/*  with zero consumers, a whole validation layer built for forms that */
/*  never adopted it. The half-state is worse than either end of it:   */
/*  a reader finds a schema named for their form, assumes it is the    */
/*  rule, and does not look for the real one. So every one of the 15   */
/*  was re-derived against the form it names and either adopted there  */
/*  or deleted, with the probe recorded in the consolidation fix-log.  */
/*                                                                     */
/*  What survives is what something calls. Nothing here is aspirational:*/
/*  if you add a schema, adopt it in the same commit.                   */
/* ------------------------------------------------------------------ */

/** Reusable field validators */
const trimmedString = (min: number, max: number, label: string) =>
  z.string().trim().min(min, `${label} is required`).max(max, `${label} is too long (max ${max} chars)`)

const optionalTrimmedString = (max: number, label: string) =>
  z.string().trim().max(max, `${label} is too long (max ${max} chars)`).optional().or(z.literal(''))

const emailField = z.string().trim().email('Invalid email address').max(254, 'Email too long')

// Canonical phone format: 6-20 chars of digits, spaces and + - ( ) .
// Deliberately permissive so any country's number passes without a
// libphonenumber dependency or a country dropdown: +44 7911 123456,
// +1 (415) 555-0100, +81 90-1234-5678 all validate. Backpackers and other
// non-Australian members must not be blocked by the (non-dismissable) phone
// gate, so do NOT tighten this to an AU-only pattern. Shared by
// profileUpdateSchema.phone, the PhoneGate and edit-profile so all three agree.
export const PHONE_REGEX = /^[\d\s+\-().]{6,20}$/
export const isValidPhone = (value: string): boolean => PHONE_REGEX.test(value.trim())

const phoneField = z.string().trim().regex(
  PHONE_REGEX,
  'Invalid phone number',
).optional().or(z.literal(''))

const australianPostcode = z.string().trim().regex(/^\d{4}$/, 'Postcode must be 4 digits')

/* ------------------------------------------------------------------ */
/*  Contact form                                                       */
/* ------------------------------------------------------------------ */

export const contactFormSchema = z.object({
  name: trimmedString(1, 200, 'Name'),
  email: emailField,
  subject: trimmedString(1, 200, 'Subject'),
  message: trimmedString(1, 5000, 'Message'),
})

/* ------------------------------------------------------------------ */
/*  Collective application                                             */
/* ------------------------------------------------------------------ */

export const collectiveApplicationSchema = z.object({
  firstName: trimmedString(1, 100, 'First name'),
  lastName: trimmedString(1, 100, 'Last name'),
  email: emailField,
  phone: phoneField,
  addressLine1: trimmedString(1, 200, 'Address'),
  suburb: trimmedString(1, 100, 'Suburb'),
  postcode: australianPostcode,
  whyVolunteer: trimmedString(1, 2000, 'Reason'),
  additionalInfo: optionalTrimmedString(2000, 'Additional info'),
})

/* ------------------------------------------------------------------ */
/*  Chat                                                               */
/* ------------------------------------------------------------------ */

export const MAX_MESSAGE_LENGTH = 4000

/** Adopted at create-poll-sheet.tsx, which checked non-empty and a
 *  two-option minimum but capped no length. */
export const chatPollSchema = z.object({
  question: trimmedString(1, 500, 'Question'),
  options: z.array(z.string().trim().min(1).max(200)).min(2, 'At least 2 options').max(20, 'Max 20 options'),
  allow_multiple: z.boolean().optional(),
  anonymous: z.boolean().optional(),
})

/* ------------------------------------------------------------------ */
/*  Admin: Roles                                                       */
/*                                                                     */
/*  Adopted at admin/users.tsx, which previously wrote                 */
/*  `.update({ role: role as UserRole })`: a CAST, which tells the      */
/*  compiler a string is a role and checks nothing at runtime.          */
/* ------------------------------------------------------------------ */

export const VALID_ROLES = ['participant', 'assist_leader', 'co_leader', 'leader', 'manager', 'admin'] as const
export const roleChangeSchema = z.object({
  role: z.enum(VALID_ROLES),
})

/* ------------------------------------------------------------------ */
/*  Helper: validate and return typed result or throw                   */
/* ------------------------------------------------------------------ */

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data)
}

/** Validate without throwing - returns { success, data, error } */
export function safeValidate<T>(schema: z.ZodSchema<T>, data: unknown) {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true as const, data: result.data, error: null }
  }
  const message = result.error.issues.map((i) => i.message).join(', ')
  return { success: false as const, data: null, error: message }
}
