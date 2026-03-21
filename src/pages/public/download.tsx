import { motion, useReducedMotion } from 'framer-motion'
import { TreePine, Smartphone, Globe } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/button'
import { OGMeta } from '@/components/og-meta'
import { APP_NAME, TAGLINE, WEBSITE_URL, INSTAGRAM_URL } from '@/lib/constants'
import { useAppImage } from '@/hooks/use-app-images'
import { WebFooter } from '@/components/web-footer'

// Placeholder store URLs - replace with real ones when published
const APP_STORE_URL = '#'
const PLAY_STORE_URL = '#'
const WEB_APP_URL = '/'

const stats = [
  { value: '5,500+', label: 'Volunteers' },
  { value: '13', label: 'Collectives' },
  { value: '35,500+', label: 'Native Plants' },
  { value: '4,900 kg', label: 'Litter Removed' },
]

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

export default function DownloadPage() {
  const shouldReduceMotion = useReducedMotion()
  const heroDownload = useAppImage('hero_download')

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <OGMeta
        title="Download the App"
        description="Join the Co-Exist movement. Download the app to explore conservation events, connect with your local collective, and protect the environment."
      />

      {/* Hero section */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-16 sm:py-24">
        {/* Background hero photo */}
        <div className="absolute inset-0" aria-hidden="true">
          <img
            src={heroDownload}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/50 to-white/90" />
        </div>

        <motion.div
          className="relative z-10 mx-auto max-w-lg text-center"
          variants={shouldReduceMotion ? undefined : stagger}
          initial="hidden"
          animate="visible"
        >
          {/* Logo / Icon */}
          <motion.div variants={shouldReduceMotion ? undefined : fadeUp} className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-100 shadow-md">
            <TreePine size={40} className="text-primary-400" />
          </motion.div>

          <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
            <h1 className="font-heading text-3xl font-bold text-primary-800 sm:text-4xl">
              {APP_NAME}
            </h1>
            <p className="mt-2 text-lg font-medium text-primary-400">{TAGLINE}</p>
            <p className="mt-4 text-primary-400 leading-relaxed">
              Join Australia's youth conservation movement. Find events near you,
              connect with your local Collective, and track your real-world impact.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div variants={shouldReduceMotion ? undefined : fadeUp} className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl bg-white p-3 shadow-sm"
              >
                <p className="font-heading text-lg font-bold text-primary-400">{stat.value}</p>
                <p className="text-xs text-primary-400">{stat.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Download buttons */}
          <motion.div
            variants={shouldReduceMotion ? undefined : fadeUp}
            className="mt-10 flex flex-col gap-3"
          >
            <Button
              variant="primary"
              size="lg"
              fullWidth
              icon={<Smartphone size={18} />}
              onClick={() => window.open(APP_STORE_URL, '_blank')}
            >
              Download on the App Store
            </Button>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              icon={<Smartphone size={18} />}
              onClick={() => window.open(PLAY_STORE_URL, '_blank')}
            >
              Get it on Google Play
            </Button>
            <Button
              variant="ghost"
              size="lg"
              fullWidth
              icon={<Globe size={18} />}
              onClick={() => window.location.href = WEB_APP_URL}
            >
              Continue on Web
            </Button>
          </motion.div>

          {/* Links */}
          <motion.div variants={shouldReduceMotion ? undefined : fadeUp} className="mt-10 flex items-center justify-center gap-4 text-sm text-primary-400">
            <a
              href={WEBSITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary-400 transition-colors"
            >
              Website
            </a>
            <span aria-hidden="true">·</span>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary-400 transition-colors"
            >
              @coexistaus
            </a>
          </motion.div>
        </motion.div>
      </div>

      <WebFooter />
    </div>
  )
}
