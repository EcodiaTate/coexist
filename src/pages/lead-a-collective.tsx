import { useState, useCallback } from 'react'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import {
  Star,
  Send,
  Upload,
  X,
  Users,
  Megaphone,
  TreePine,
  FileText,
  MapPin,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Dropdown } from '@/components/dropdown'
import { Checkbox } from '@/components/checkbox'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } },
}

/* ------------------------------------------------------------------ */
/*  Options                                                            */
/* ------------------------------------------------------------------ */

const AUSTRALIAN_STATES = [
  { value: 'ACT', label: 'Australian Capital Territory' },
  { value: 'NSW', label: 'New South Wales' },
  { value: 'NT', label: 'Northern Territory' },
  { value: 'QLD', label: 'Queensland' },
  { value: 'SA', label: 'South Australia' },
  { value: 'TAS', label: 'Tasmania' },
  { value: 'VIC', label: 'Victoria' },
  { value: 'WA', label: 'Western Australia' },
]

const TIME_OPTIONS = [
  { value: '1-2 hours/week', label: '1-2 hours/week' },
  { value: '2-4 hours/week', label: '2-4 hours/week' },
  { value: '4-8 hours/week', label: '4-8 hours/week' },
  { value: '8+ hours/week', label: '8+ hours/week' },
]

const ATTENDED_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unsure', label: 'Not sure' },
]

const HOW_HEARD_OPTIONS = [
  { value: 'social_media', label: 'Social Media' },
  { value: 'friend', label: 'Friend or Family' },
  { value: 'event', label: 'At an Event' },
  { value: 'school_uni', label: 'School or University' },
  { value: 'google', label: 'Google Search' },
  { value: 'news', label: 'News or Media' },
  { value: 'other', label: 'Other' },
]

const ROLE_OPTIONS = [
  { key: 'social_media', label: 'Social media & Content creation' },
  { key: 'collective_leader', label: 'Collective Leader' },
  { key: 'assistant_leader', label: 'Assistant Leader' },
  { key: 'other', label: 'Other' },
]

const SKILL_OPTIONS = [
  { key: 'public_speaking', label: 'Public Speaking' },
  { key: 'event_organisation', label: 'Event Organisation' },
  { key: 'event_facilitation', label: 'Event Facilitation' },
  { key: 'social_media_content', label: 'Social Media Content Creation' },
]

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LeadACollectivePage() {
  const shouldReduceMotion = useReducedMotion()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const toast = useToast()

  // Form state
  const [firstName, setFirstName] = useState(profile?.display_name?.split(' ')[0] ?? '')
  const [lastName, setLastName] = useState(profile?.display_name?.split(' ').slice(1).join(' ') ?? '')
  const [email, setEmail] = useState('')
  const [newsOptIn, setNewsOptIn] = useState(false)
  const [dob, setDob] = useState('')
  const [phone, setPhone] = useState('')

  // Address
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [suburb, setSuburb] = useState('')
  const [state, setState] = useState('')
  const [postcode, setPostcode] = useState('')

  // Application content
  const [whyVolunteer, setWhyVolunteer] = useState('')
  const [roles, setRoles] = useState<string[]>([])
  const [timeCommitment, setTimeCommitment] = useState('')
  const [attendedEvents, setAttendedEvents] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [additionalInfo, setAdditionalInfo] = useState('')
  const [howHeard, setHowHeard] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const toggleRole = useCallback((key: string) => {
    setRoles(prev => prev.includes(key) ? prev.filter(r => r !== key) : [...prev, key])
  }, [])

  const toggleSkill = useCallback((key: string) => {
    setSkills(prev => prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key])
  }, [])

  const canSubmit =
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    addressLine1.trim() &&
    suburb.trim() &&
    state &&
    postcode.trim() &&
    whyVolunteer.trim() &&
    roles.length > 0 &&
    timeCommitment &&
    howHeard &&
    !submitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    try {
      // Upload resume if provided
      let resumeUrl: string | null = null
      if (resumeFile) {
        const ext = resumeFile.name.split('.').pop()
        const path = `resumes/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('collective-applications')
          .upload(path, resumeFile, { upsert: false })
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('collective-applications')
            .getPublicUrl(path)
          resumeUrl = urlData.publicUrl
        }
      }

      const { error } = await supabase
        .from('collective_applications')
        .insert({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          date_of_birth: dob || null,
          phone: phone || null,
          country: 'Australia',
          address_line1: addressLine1.trim(),
          address_line2: addressLine2.trim() || null,
          suburb: suburb.trim(),
          state,
          postcode: postcode.trim(),
          why_volunteer: whyVolunteer.trim(),
          roles,
          time_commitment: timeCommitment,
          attended_events: attendedEvents || null,
          skills,
          resume_url: resumeUrl,
          additional_info: additionalInfo.trim() || null,
          how_heard: howHeard,
          news_opt_in: newsOptIn,
          user_id: profile?.id ?? null,
        })

      if (error) throw error

      // Trigger staff notification via edge function
      try {
        await supabase.functions.invoke('notify-application', {
          body: {
            applicant_name: `${firstName.trim()} ${lastName.trim()}`,
            applicant_email: email.trim(),
            roles,
            suburb: suburb.trim(),
            state,
          },
        })
      } catch {
        // Non-blocking - application is saved regardless
      }

      setSubmitted(true)
      toast.toast.success('Application submitted! We\'ll be in touch soon.')
    } catch {
      toast.toast.error('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <Page noBackground className="!px-0 bg-primary-50" stickyOverlay={<Header title="" back transparent className="collapse-header" />}>
        <div className="relative overflow-hidden bg-gradient-to-br from-sprout-600 via-primary-700 to-secondary-800">
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/5" />
          <div
            className="relative z-10 px-6 pb-16 text-center"
            style={{ paddingTop: '4.5rem' }}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15 mb-5">
              <Star size={32} className="text-white" />
            </div>
            <h1 className="font-heading text-3xl font-bold text-white mb-3">
              Application Received!
            </h1>
            <p className="text-sm text-white/70 max-w-md mx-auto leading-relaxed">
              Thank you for your interest in leading a Co-Exist Collective.
              Our team will review your application and be in touch soon.
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 z-20">
            <svg viewBox="0 0 1440 70" preserveAspectRatio="none" className="w-full h-7 sm:h-10 block" xmlns="http://www.w3.org/2000/svg">
              <path d="M0,25 C60,22 100,18 140,20 C180,22 200,15 220,18 L228,8 L234,5 L240,10 C280,18 340,24 400,20 C440,16 470,22 510,25 C560,28 600,20 640,22 C670,24 690,18 710,20 L718,10 L722,6 L728,12 C760,20 820,26 880,22 C920,18 950,24 990,26 C1020,28 1050,20 1080,18 C1100,16 1120,22 1140,24 L1148,12 L1153,7 L1158,9 L1165,16 C1200,22 1260,26 1320,22 C1360,18 1400,24 1440,22 L1440,70 L0,70 Z" className="fill-primary-50" />
            </svg>
          </div>
        </div>
        <div className="px-6 pt-6 pb-12 space-y-4">
          <Button variant="primary" size="lg" fullWidth onClick={() => navigate('/leadership')}>
            Back to Leadership
          </Button>
          <Button variant="ghost" size="lg" fullWidth onClick={() => navigate('/')}>
            Go Home
          </Button>
        </div>
      </Page>
    )
  }

  return (
    <Page noBackground className="!px-0 bg-primary-50" stickyOverlay={<Header title="" back transparent className="collapse-header" />}>
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-sprout-600 via-primary-700 to-secondary-800">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute -left-10 bottom-0 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute right-12 bottom-16 w-24 h-24 rounded-full border border-white/8" />

        <div
          className="relative z-10 px-6 pb-16"
          style={{ paddingTop: '4.5rem' }}
        >
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 mb-4"
          >
            <Users size={28} className="text-white" />
          </motion.div>

          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/60 block mb-1.5">
              Join the Movement
            </span>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white">
              Lead a Collective
            </h1>
            <p className="text-[13px] sm:text-sm text-white/70 mt-2 max-w-md leading-relaxed">
              Co-Exist is powered by passionate young people driving real impact.
              Fill out this form and we'll be in touch!
            </p>
          </motion.div>
        </div>

        {/* Wave - fills into the tinted page bg */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <svg viewBox="0 0 1440 70" preserveAspectRatio="none" className="w-full h-7 sm:h-10 block" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,25 C60,22 100,18 140,20 C180,22 200,15 220,18 L228,8 L234,5 L240,10 C280,18 340,24 400,20 C440,16 470,22 510,25 C560,28 600,20 640,22 C670,24 690,18 710,20 L718,10 L722,6 L728,12 C760,20 820,26 880,22 C920,18 950,24 990,26 C1020,28 1050,20 1080,18 C1100,16 1120,22 1140,24 L1148,12 L1153,7 L1158,9 L1165,16 C1200,22 1260,26 1320,22 C1360,18 1400,24 1440,22 L1440,70 L0,70 Z" className="fill-primary-50" />
          </svg>
        </div>
      </div>

      {/* Form */}
      <motion.form
        className="px-5 space-y-5 pb-12 pt-5"
        initial="hidden"
        animate="visible"
        variants={shouldReduceMotion ? undefined : stagger}
        onSubmit={handleSubmit}
      >
        {/* Intro banner - rich gradient */}
        <motion.div
          variants={shouldReduceMotion ? undefined : fadeUp}
          className="rounded-2xl bg-gradient-to-br from-sprout-600 via-primary-700 to-secondary-800 shadow-xl shadow-primary-900/25 p-5"
        >
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/15 shrink-0">
              <Megaphone size={18} className="text-white" />
            </span>
            <div>
              <p className="text-[14px] font-semibold text-white">Who We're Looking For</p>
              <p className="text-[13px] text-white/70 mt-1 leading-relaxed">
                Young people passionate about connecting people with nature and driving social impact,
                with skills or interest in social media, content creation, community engagement, or event facilitation.
              </p>
            </div>
          </div>
        </motion.div>

        {/* ---- Personal Details ---- */}
        <motion.section
          variants={shouldReduceMotion ? undefined : fadeUp}
          className="rounded-2xl overflow-hidden bg-white shadow-md border border-primary-200/40"
        >
          {/* Colored section header */}
          <div className="bg-gradient-to-r from-primary-700 to-primary-800 px-5 py-3">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-white/80">
              Your Details
            </h3>
          </div>
          <div className="p-5 space-y-4">

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              inputClassName="bg-primary-50 border border-primary-200/60"
            />
            <Input
              label="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              inputClassName="bg-primary-50 border border-primary-200/60"
            />
          </div>

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            inputClassName="bg-primary-50 border border-primary-200/60"
          />

          <div className="rounded-xl bg-primary-50 border border-primary-200/40 px-4 py-3">
            <Checkbox
              checked={newsOptIn}
              onChange={setNewsOptIn}
              label="Sign up for news and updates"
            />
          </div>

          <Input
            label="Date of Birth"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            helperText="dd/mm/yyyy"
            inputClassName="bg-primary-50 border border-primary-200/60"
          />

          <Input
            label="Phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputClassName="bg-primary-50 border border-primary-200/60"
          />
          </div>
        </motion.section>

        {/* ---- Location ---- */}
        <motion.section
          variants={shouldReduceMotion ? undefined : fadeUp}
          className="rounded-2xl overflow-hidden bg-white shadow-md border border-primary-200/40"
        >
          {/* Colored section header */}
          <div className="bg-gradient-to-r from-sky-600 to-sky-700 px-5 py-3">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-white/80 flex items-center gap-1.5">
              <MapPin size={12} />
              Location
            </h3>
          </div>
          <div className="p-5 space-y-4">

          <div className="rounded-xl bg-white border border-primary-200/40 px-4 py-2.5 text-[14px] text-primary-700 font-medium">
            Australia
          </div>

          <Input
            label="Address Line 1"
            value={addressLine1}
            onChange={(e) => setAddressLine1(e.target.value)}
            required
            inputClassName="border border-primary-200/50"
          />

          <Input
            label="Address Line 2"
            value={addressLine2}
            onChange={(e) => setAddressLine2(e.target.value)}
            inputClassName="border border-primary-200/50"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Suburb"
              value={suburb}
              onChange={(e) => setSuburb(e.target.value)}
              required
              inputClassName="border border-primary-200/50"
            />
            <Dropdown
              label="State"
              options={AUSTRALIAN_STATES}
              value={state}
              onChange={setState}
              placeholder="Select state"
              triggerClassName="border border-primary-200/50"
            />
          </div>

          <Input
            label="Postcode"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            required
            inputClassName="border border-primary-200/50"
          />
          </div>
        </motion.section>

        {/* ---- Application Questions ---- */}
        <motion.section
          variants={shouldReduceMotion ? undefined : fadeUp}
          className="rounded-2xl overflow-hidden bg-white shadow-md border border-primary-200/40"
        >
          <div className="bg-gradient-to-r from-moss-600 to-moss-700 px-5 py-3">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-white/80">
              Application
            </h3>
          </div>
          <div className="p-5 space-y-4">

          <Input
            type="textarea"
            label="Why do you want to volunteer with Co-Exist's core team?"
            value={whyVolunteer}
            onChange={(e) => setWhyVolunteer(e.target.value)}
            required
            rows={4}
            placeholder="Tell us about your passion for conservation and community..."
          />

          {/* Roles */}
          <div className="rounded-xl bg-primary-50 border border-primary-200/40 p-4">
            <label className="block text-[13px] font-medium text-primary-700 mb-1.5">
              What Role/s are you interested in? <span className="text-error">*</span>
            </label>
            <p className="text-[12px] text-primary-400 mb-3">
              Please read the Position Descriptions before applying. Select all that apply.
            </p>
            <div className="space-y-2">
              {ROLE_OPTIONS.map(({ key, label }) => (
                <Checkbox
                  key={key}
                  checked={roles.includes(key)}
                  onChange={() => toggleRole(key)}
                  label={label}
                />
              ))}
            </div>
          </div>

          <Dropdown
            label="How much time can you realistically commit? *"
            options={TIME_OPTIONS}
            value={timeCommitment}
            onChange={setTimeCommitment}
            placeholder="Select an option"
            triggerClassName="bg-primary-50 border border-primary-200/60"
          />

          <Dropdown
            label="Have you previously attended any Co-Exist events?"
            options={ATTENDED_OPTIONS}
            value={attendedEvents}
            onChange={setAttendedEvents}
            placeholder="Select an option"
            triggerClassName="bg-primary-50 border border-primary-200/60"
          />
          </div>
        </motion.section>

        {/* ---- Skills ---- */}
        <motion.section
          variants={shouldReduceMotion ? undefined : fadeUp}
          className="rounded-2xl overflow-hidden bg-white shadow-md border border-primary-200/40"
        >
          <div className="bg-gradient-to-r from-sprout-600 to-sprout-700 px-5 py-3">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-white/80">
              Skills
            </h3>
          </div>
          <div className="p-5 space-y-3">
          <p className="text-[12px] text-primary-500">
            Not required for the role - we are just curious to see where we can help!
          </p>
          <div className="space-y-1">
            {SKILL_OPTIONS.map(({ key, label }) => (
              <Checkbox
                key={key}
                checked={skills.includes(key)}
                onChange={() => toggleSkill(key)}
                label={label}
              />
            ))}
          </div>
          </div>
        </motion.section>

        {/* ---- Resume Upload ---- */}
        <motion.section
          variants={shouldReduceMotion ? undefined : fadeUp}
          className="rounded-2xl overflow-hidden bg-white shadow-md border border-primary-200/40"
        >
          <div className="bg-gradient-to-r from-bark-600 to-bark-700 px-5 py-3">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-white/80 flex items-center gap-1.5">
              <Upload size={12} />
              Resume
            </h3>
          </div>
          <div className="p-5 space-y-3">

          {resumeFile ? (
            <div className="flex items-center gap-3 rounded-xl bg-primary-50 border border-primary-200/40 px-4 py-3">
              <FileText size={18} className="text-primary-600 shrink-0" />
              <span className="text-[14px] text-primary-800 truncate flex-1">{resumeFile.name}</span>
              <button
                type="button"
                onClick={() => setResumeFile(null)}
                className="text-primary-400 hover:text-primary-700 active:scale-[0.90] transition-[colors,transform] duration-150 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <label className={cn(
              'relative flex items-center gap-3 rounded-xl border-2 border-dashed border-primary-200 bg-primary-50',
              'px-4 py-4 cursor-pointer transition-colors',
              'hover:border-primary-400 hover:bg-primary-100/50',
            )}>
              <Upload size={18} className="text-primary-400" />
              <span className="text-[14px] text-primary-500 font-medium">Attach your resume</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) setResumeFile(file)
                }}
              />
            </label>
          )}
          </div>
        </motion.section>

        {/* ---- Additional Info + How Heard ---- */}
        <motion.section
          variants={shouldReduceMotion ? undefined : fadeUp}
          className="rounded-2xl overflow-hidden bg-white shadow-md border border-primary-200/40"
        >
          <div className="bg-gradient-to-r from-warning-500 to-bark-600 px-5 py-3">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-white/80">
              Anything Else
            </h3>
          </div>
          <div className="p-5 space-y-4">

          <Input
            type="textarea"
            label="Additional Info"
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            rows={3}
            placeholder="Anything else you'd like to share?"
          />

          <Dropdown
            label="How did you hear about us? *"
            options={HOW_HEARD_OPTIONS}
            value={howHeard}
            onChange={setHowHeard}
            placeholder="Select an option"
            triggerClassName="bg-white border border-primary-200/50"
          />
          </div>
        </motion.section>

        {/* ---- Submit ---- */}
        <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={submitting}
            disabled={!canSubmit}
            icon={<Send size={16} />}
          >
            Submit Application
          </Button>
        </motion.div>

        {/* Acknowledgement */}
        <motion.div
          variants={shouldReduceMotion ? undefined : fadeUp}
          className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-primary-100/40"
        >
          <TreePine size={18} className="text-primary-400 mt-0.5 shrink-0" />
          <p className="text-[12px] text-primary-400 leading-relaxed">
            We respectfully acknowledge the Traditional Custodians of the lands on which we live,
            work, and gather, paying our respects to their elders past, present, and emerging.
          </p>
        </motion.div>
      </motion.form>
    </Page>
  )
}
