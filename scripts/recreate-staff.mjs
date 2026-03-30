import { createClient } from '@supabase/supabase-js'

// Use your service role key from Supabase dashboard > Settings > API
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tjutlbzekfouwsiaplbr.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY env var first')
  console.error('Usage: SUPABASE_SERVICE_ROLE_KEY=your-key node scripts/recreate-staff.mjs')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const emails = [
  'aadyapandit@coexistaus.org',
  'alanahforbes@coexistaus.org',
  'alyssahead@coexistaus.org',
  'andreadacunha@coexistaus.org',
  'benbloom@coexistaus.org',
  'benhobbsgordon@coexistaus.org',
  'benjaminmonga@coexistaus.org',
  'benphythian@coexistaus.org',
  'billyradalj@coexistaus.org',
  'brandonmarlow@coexistaus.org',
  'caitlyndipasquale@coexistaus.org',
  'ceo@coexistaus.org',
  'charliebennett@coexistaus.org',
  'charlottekenning@coexistaus.org',
  'devonasabu@coexistaus.org',
  'emiliecorkeron@coexistaus.org',
  'emilyoulton@coexistaus.org',
  'ezratalivmo@coexistaus.org',
  'feicastillo@coexistaus.org',
  'gabrielcorbidge@coexistaus.org',
  'gracesweaney@coexistaus.org',
  'hannahlyttle@coexistaus.org',
  'hannahperry@coexistaus.org',
  'jamieearl@coexistaus.org',
  'jamiesondykes@coexistaus.org',
  'jessicaditchfield@coexistaus.org',
  'jessodonoghue@coexistaus.org',
  'joeengel@coexistaus.org',
  'jorgierainbird@coexistaus.org',
  'jorjawarren@coexistaus.org',
  'joshsmith@coexistaus.org',
  'julianemateo@coexistaus.org',
  'karacharlton@coexistaus.org',
  'karintraeger@coexistaus.org',
  'keelydeklerk@coexistaus.org',
  'keelysmall@coexistaus.org',
  'laurenrailey@coexistaus.org',
  'lorenzoseneci@coexistaus.org',
  'lorinmahney@coexistaus.org',
  'louisecourt@coexistaus.org',
  'lydiasheehan@coexistaus.org',
  'macyscott@coexistaus.org',
  'madisencoelho@coexistaus.org',
  'mattpascoe@coexistaus.org',
  'mayanorris@coexistaus.org',
  'miabetteridge@coexistaus.org',
  'milagower@coexistaus.org',
  'nickfallaw@coexistaus.org',
  'oskarwatkins@coexistaus.org',
  'piafinn@coexistaus.org',
  'rebeccakelso@coexistaus.org',
  'rileydoyle@coexistaus.org',
  'samlundberg@coexistaus.org',
  'sarahstgeorge@coexistaus.org',
  'sayaokakuchi@coexistaus.org',
  'shannonfisher@coexistaus.org',
  'shizukuyamagishi@coexistaus.org',
  'sophienelson@coexistaus.org',
  'starbright@coexistaus.org',
  'stutigovil@coexistaus.org',
  'subithomas@coexistaus.org',
  'talicoleman@coexistaus.org',
  'tamikawilton@coexistaus.org',
  'willfelesina@coexistaus.org',
  'winnieliang@coexistaus.org',
  'yeezhao@coexistaus.org',
]

async function main() {
  let created = 0
  let failed = 0

  for (const email of emails) {
    const password = email.split('@')[0]
    const displayName = password
      // split camelCase or joined names - just use the raw username as display name
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      // capitalize first letter of each word
      .replace(/\b\w/g, c => c.toUpperCase())

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
        email_verified: true,
      },
    })

    if (error) {
      console.error(`FAIL ${email}: ${error.message}`)
      failed++
      continue
    }

    // Update profile role to national_leader
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role: 'national_leader' })
      .eq('id', data.user.id)

    if (profileError) {
      console.error(`PROFILE FAIL ${email}: ${profileError.message}`)
    }

    console.log(`OK ${email} (${data.user.id})`)
    created++
  }

  console.log(`\nDone: ${created} created, ${failed} failed`)
}

main()
