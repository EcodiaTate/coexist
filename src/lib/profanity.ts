import filter from 'leo-profanity'

// Load the English dictionary on module init
filter.loadDictionary('en')

/**
 * Check if a message contains profanity.
 * Returns true if profanity is detected.
 */
export function containsProfanity(text: string): boolean {
  return filter.check(text)
}

/**
 * Clean a message by replacing profane words with asterisks.
 */
export function cleanProfanity(text: string): string {
  return filter.clean(text)
}
