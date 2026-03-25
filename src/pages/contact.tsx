import { useState } from 'react'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import {
  Mail,
  MapPin,
  Send,
  Globe,
  Instagram,
  Facebook,
} from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } },
}

/* ------------------------------------------------------------------ */
/*  Contact details                                                    */
/* ------------------------------------------------------------------ */

const CONTACT_INFO = [
  {
    icon: <Mail size={18} />,
    label: 'Email',
    value: 'hello@coexistaus.org',
    href: 'mailto:hello@coexistaus.org',
  },
  {
    icon: <Globe size={18} />,
    label: 'Website',
    value: 'coexistaus.org',
    href: 'https://coexistaus.org',
  },
  {
    icon: <Instagram size={18} />,
    label: 'Instagram',
    value: '@coexistaus',
    href: 'https://instagram.com/coexistaus',
  },
  {
    icon: <Facebook size={18} />,
    label: 'Facebook',
    value: '@coexistaus',
    href: 'https://facebook.com/coexistaus',
  },
]

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ContactPage() {
  const shouldReduceMotion = useReducedMotion()
  const { profile } = useAuth()
  const toast = useToast()

  const [name, setName] = useState(profile?.display_name ?? '')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const canSubmit = name.trim() && email.trim() && message.trim() && !sending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setSending(true)
    try {
      const { error } = await supabase
        .from('contact_submissions')
        .insert({
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
          user_id: profile?.id ?? null,
        })

      if (error) throw error

      toast.toast.success('Message sent! We\'ll get back to you soon.')
      setMessage('')
    } catch {
      toast.toast.error('Something went wrong. Please try emailing us directly.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Page
      swipeBack
      header={<Header title="" back />}
      className="bg-surface-1"
    >
      <motion.div
        className="space-y-6 pb-10"
        initial="hidden"
        animate="visible"
        variants={shouldReduceMotion ? undefined : stagger}
      >
        {/* Contact form */}
        <motion.form
          variants={shouldReduceMotion ? undefined : fadeUp}
          onSubmit={handleSubmit}
          className="rounded-2xl bg-surface-0 shadow-sm p-5 space-y-4"
        >
          <h2 className="font-heading text-[15px] font-semibold text-primary-900">
            Send us a message
          </h2>

          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
          />

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />

          <Input
            type="textarea"
            label="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="How can we help?"
            required
            rows={5}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={sending}
            disabled={!canSubmit}
            icon={<Send size={16} />}
          >
            Send Message
          </Button>
        </motion.form>

        {/* Contact details */}
        <motion.section variants={shouldReduceMotion ? undefined : fadeUp}>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-primary-400/70 mb-1.5 px-1">
            Get in touch
          </h3>
          <div className="rounded-2xl bg-surface-0 shadow-sm overflow-hidden">
            {CONTACT_INFO.map(({ icon, label, value, href }, idx) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex items-center gap-3.5 px-4 py-3.5',
                  'transition-colors duration-150',
                  'active:bg-surface-3',
                  idx > 0 && 'border-t border-primary-100/20',
                )}
              >
                <span className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 bg-primary-50 text-primary-600">
                  {icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-primary-400 leading-tight">{label}</p>
                  <p className="text-[15px] font-medium text-primary-900 truncate">{value}</p>
                </div>
              </a>
            ))}
          </div>
        </motion.section>

        {/* Location note */}
        <motion.div
          variants={shouldReduceMotion ? undefined : fadeUp}
          className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-primary-50/60"
        >
          <MapPin size={18} className="text-primary-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-[13px] font-medium text-primary-700">
              Based in Australia
            </p>
            <p className="text-[12px] text-primary-400 mt-0.5">
              Co-Exist Australia is a registered charity operating nationwide with collectives across the country.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </Page>
  )
}
