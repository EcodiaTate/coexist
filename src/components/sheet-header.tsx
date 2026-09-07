import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * The icon-box header at the top of a bottom sheet.
 *
 * Copy-pasted at nine render sites across eight files (CA3 finding 4.F2) in
 * two idioms that differ only in the icon box and the title weight. Nothing
 * bound them, so a change to the box size or the subtitle colour reached one
 * sheet and left eight behind.
 *
 * The finding counted eight sites across seven files; re-running its own two
 * greps at this HEAD returns eight FILES, and create-carpool-sheet.tsx holds
 * two of them, so the true figure is nine sites in eight files. The eighth
 * file is walk-in-sheet.tsx, which the finding lists under idiom B.
 *
 * `panel` is the 40px square-cornered box with a bold title: the create and
 * broadcast sheets. `compact` is the 36px circle with a semibold heading
 * face: the moderation sheets. The colour pair stays the caller's, because
 * that is the one thing each sheet genuinely says for itself (warning for a
 * broadcast, error for a block, success for a carpool).
 *
 * The icon element is the caller's too, size included, rather than a name this
 * component maps: the two idioms ship 20px and 16px glyphs and one sheet puts
 * the colour on the glyph rather than the box.
 */
type SheetHeaderVariant = 'panel' | 'compact'

const VARIANT: Record<SheetHeaderVariant, { box: string; title: string }> = {
  panel: {
    box: 'flex h-10 w-10 items-center justify-center rounded-sm',
    title: 'text-base font-bold',
  },
  compact: {
    box: 'flex items-center justify-center w-9 h-9 rounded-full',
    title: 'font-heading text-base font-semibold',
  },
}

interface SheetHeaderProps {
  variant: SheetHeaderVariant
  /** The glyph, sized by the caller. */
  icon: ReactNode
  /** Background and foreground classes for the icon box, e.g. 'bg-error-100 text-error-600'. */
  iconClassName: string
  title: ReactNode
  subtitle?: ReactNode
  /** Extra classes on the title, for the one sheet that titles in primary-900. */
  titleClassName?: string
  /** Clip a long title and subtitle rather than wrapping (save-seat's event names). */
  truncate?: boolean
  /**
   * Overrides on the header row itself. Exists for walk-in-sheet, whose parent
   * is a `space-y-4` stack: the shared `mb-4` would stack on top of the parent's
   * own 16px and double the gap under that one header. `cn` is tailwind-merge,
   * so a conflicting utility passed here replaces the default rather than
   * racing it in the class string.
   */
  className?: string
}

export function SheetHeader({
  variant,
  icon,
  iconClassName,
  title,
  subtitle,
  titleClassName,
  truncate,
  className,
}: SheetHeaderProps) {
  const v = VARIANT[variant]
  return (
    <div
      data-eos-id="src/components/sheet-header.tsx#0"
      className={cn('flex items-center gap-2.5 mb-4', className)}
    >
      <div data-eos-id="src/components/sheet-header.tsx#1" className={cn(v.box, iconClassName)}>
        {icon}
      </div>
      <div data-eos-id="src/components/sheet-header.tsx#2" className={cn(truncate && 'min-w-0')}>
        <h3
          data-eos-id="src/components/sheet-header.tsx#3"
          className={cn(v.title, 'text-neutral-900', truncate && 'truncate', titleClassName)}
        >
          {title}
        </h3>
        {subtitle !== undefined && (
          <p
            data-eos-id="src/components/sheet-header.tsx#4"
            className={cn('text-xs text-neutral-500', truncate && 'truncate')}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}
