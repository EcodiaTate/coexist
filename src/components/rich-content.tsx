import { ExternalLink } from 'lucide-react'
import { parseRichLinks } from '@/lib/rich-links'

/* ------------------------------------------------------------------ */
/*  RichContent: announcement body text with clickable links           */
/*                                                                     */
/*  Was implemented twice, once on the member-facing Updates page and   */
/*  once in the admin authoring preview. The parse loop was identical;  */
/*  only the link styling and the admin copy's trailing icon differed,  */
/*  so those two are the props.                                         */
/* ------------------------------------------------------------------ */

/** `member` is the reading surface, `admin` the authoring preview. */
export type RichContentVariant = 'member' | 'admin'

const LINK_CLASS: Record<RichContentVariant, string> = {
  member:
    'text-primary-600 font-semibold underline underline-offset-2 decoration-primary-300 hover:decoration-primary-500 hover:text-primary-700 transition-colors',
  admin:
    'inline-flex items-center gap-1 text-neutral-600 font-semibold underline underline-offset-2 decoration-primary-300 hover:decoration-primary-500 hover:text-neutral-700 transition-colors',
}

interface RichContentProps {
  text: string
  className?: string
  variant?: RichContentVariant
}

export function RichContent({ text, className, variant = 'member' }: RichContentProps) {
  const tokens = parseRichLinks(text)

  return (
    <div className={className}>
      {tokens.map((token, i) =>
        token.type === 'text' ? (
          token.value
        ) : (
          <a
            key={i}
            href={token.href}
            target="_blank"
            rel="noopener noreferrer"
            // A bare URL can be long enough to overflow its container, which is
            // why both prior copies added break-all to that branch only.
            className={token.bare ? `${LINK_CLASS[variant]} break-all` : LINK_CLASS[variant]}
          >
            {token.label}
            {variant === 'admin' && <ExternalLink size={11} className="shrink-0" />}
          </a>
        ),
      )}
    </div>
  )
}
