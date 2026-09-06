/**
 * Check-in window choices, shared by create and edit (finding 2.F10).
 *
 * In its own module because react-refresh requires a component file to export
 * only components.
 */
export const CHECKIN_WINDOW_OPTIONS = [
  { value: '0', label: 'At event start time' },
  { value: '30', label: '30 minutes before (default)' },
]
