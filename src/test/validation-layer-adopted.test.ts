import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/* ------------------------------------------------------------------ *
 *  5b.F4 - a validation layer nobody adopted.
 *
 *  src/lib/validation.ts exported SIXTEEN zod schemas with zero
 *  consumers: a whole layer built for forms that never wired it up.
 *  The half-state is worse than either end of it. A reader finds a
 *  schema named for their form, assumes it is the rule, and stops
 *  looking for the real one, which is somewhere else and different.
 *  The audit found exactly that next door: edit-profile was saving an
 *  unvalidated phone while the schema that would have caught it sat
 *  unused in this file.
 *
 *  Each of the sixteen was re-derived against the form it names and
 *  either adopted there or deleted. This is the guard that keeps the
 *  half-state gone: a schema added here and not called is a FAILURE,
 *  not a plan.
 * ------------------------------------------------------------------ */

const ROOT = path.resolve(__dirname, '../..')
const VALIDATION = 'src/lib/validation.ts'

/** Every exported const in validation.ts whose name ends in Schema. */
function exportedSchemas(): string[] {
  const body = fs.readFileSync(path.join(ROOT, VALIDATION), 'utf8')
  return [...body.matchAll(/^export const (\w+Schema)\b/gm)].map((m) => m[1])
}

/** Every .ts/.tsx file under src, except validation.ts itself. */
function sourceFiles(dir = path.join(ROOT, 'src')): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...sourceFiles(full))
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full)
  }
  return out.filter((f) => f !== path.join(ROOT, VALIDATION))
}

/**
 * Files that IMPORT the name, not merely mention it. The audit's own census
 * counted a DOC COMMENT as a consumer and so filed `profileUpdateSchema` as
 * test-only when it had no reference of any kind; a full-text word-boundary
 * scan cannot tell a comment from a call. Match the import statement instead.
 */
function importersOf(name: string): string[] {
  const re = new RegExp(String.raw`import\s*\{[^}]*\b${name}\b[^}]*\}\s*from\s*['"]@/lib/validation['"]`, 's')
  return sourceFiles().filter((f) => re.test(fs.readFileSync(f, 'utf8')))
}

describe('every schema in validation.ts is actually used', () => {
  it('exports at least one schema, so an empty file cannot pass this vacuously', () => {
    // Without this the suite below is satisfied by deleting the whole file,
    // which is the shape of a control that agrees rather than works.
    expect(exportedSchemas().length).toBeGreaterThan(0)
  })

  it.each(exportedSchemas())('%s is imported by something that is not a test', (name) => {
    const importers = importersOf(name)
    const production = importers.filter((f) => !f.includes(`${path.sep}test${path.sep}`))
    expect(
      production,
      `${name} is exported from ${VALIDATION} and imported by no production file. ` +
        'Adopt it at the form it names, or delete it. A schema nobody calls is a ' +
        'rule a reader will believe is enforced.',
    ).not.toHaveLength(0)
  })

  it('the schemas that were adopted are called, not merely imported', () => {
    const users = fs.readFileSync(path.join(ROOT, 'src/pages/admin/users.tsx'), 'utf8')
    const poll = fs.readFileSync(path.join(ROOT, 'src/components/create-poll-sheet.tsx'), 'utf8')
    // Parenthesis, not a bare name: an import that is never called still
    // contains the name, which is exactly how this layer went dead.
    expect(users).toMatch(/roleChangeSchema\.(safeParse|parse)\(/)
    expect(poll).toMatch(/chatPollSchema\.(safeParse|parse)\(/)
  })

  it('the role write parses instead of casting', () => {
    const users = fs.readFileSync(path.join(ROOT, 'src/pages/admin/users.tsx'), 'utf8')
    // `role as UserRole` told the compiler a string was a role and checked
    // nothing at runtime. A cast is not a validation.
    expect(users).not.toMatch(/update\(\{\s*role:\s*role as UserRole\s*\}\)/)
  })

  it('the chat message cap is one constant, not two', () => {
    const chat = fs.readFileSync(path.join(ROOT, 'src/hooks/use-chat.ts'), 'utf8')
    // use-chat imported the shared MAX_MESSAGE_LENGTH under a throwaway alias
    // and then declared its own local 4000, so changing the shared one moved
    // nothing at all.
    expect(chat).not.toMatch(/^const MAX_MESSAGE_LENGTH\s*=/m)
    expect(chat).toMatch(/import\s*\{[^}]*\bMAX_MESSAGE_LENGTH\b[^}]*\}\s*from\s*'@\/lib\/validation'/)
  })
})
