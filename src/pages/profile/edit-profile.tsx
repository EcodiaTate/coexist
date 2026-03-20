import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Camera, MapPin, X } from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { Avatar } from '@/components/avatar'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Chip } from '@/components/chip'
import { Toggle } from '@/components/toggle'
import { Skeleton } from '@/components/skeleton'
import { UploadProgress } from '@/components/upload-progress'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
import { useProfile, useUpdateProfile } from '@/hooks/use-profile'
import { useCamera } from '@/hooks/use-camera'
import { useImageUpload } from '@/hooks/use-image-upload'
import { getTierFromPoints } from '@/hooks/use-points'
import type { TierName } from '@/hooks/use-points'
import { supabase } from '@/lib/supabase'

const INTEREST_OPTIONS = [
  'Tree Planting',
  'Beach Cleanup',
  'Habitat Restoration',
  'Wildlife Surveys',
  'Nature Walks',
  'Education',
  'Seed Collecting',
  'Weed Removal',
  'Waterway Cleanup',
  'Community Gardens',
  'Photography',
  'Citizen Science',
]

const PRONOUN_OPTIONS = ['he/him', 'she/her', 'they/them', 'he/they', 'she/they', 'Custom']

type Visibility = 'public' | 'collective-only' | 'private'

export default function EditProfilePage() {
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const { profile: authProfile } = useAuth()
  const { data: profile, isLoading } = useProfile()
  const updateProfile = useUpdateProfile()
  const { capture, pickFromGallery, loading: cameraLoading } = useCamera()
  const { upload, progress, uploading, error: uploadError } = useImageUpload({ bucket: 'avatars' })
  const { toast } = useToast()

  const [displayName, setDisplayName] = useState('')
  const [pronouns, setPronouns] = useState('')
  const [bio, setBio] = useState('')
  const [instagramHandle, setInstagramHandle] = useState('')
  const [location, setLocation] = useState('')
  const [phone, setPhone] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [initialized, setInitialized] = useState(false)

  // Initialize form with profile data
  if (profile && !initialized) {
    setDisplayName(profile.display_name ?? '')
    setPronouns(profile.pronouns ?? '')
    setBio(profile.bio ?? '')
    setInstagramHandle(profile.instagram_handle ?? '')
    setLocation(profile.location ?? '')
    setPhone(profile.phone ?? '')
    setInterests(profile.interests ?? [])
    setInitialized(true)
  }

  const tier = getTierFromPoints(profile?.points ?? 0)

  const handleAvatarChange = async () => {
    const result = await pickFromGallery()
    if (!result) return

    try {
      const path = `${authProfile?.id}/avatar.jpg`
      const uploaded = await upload(result.blob, path)

      // Update profile with new avatar URL
      await supabase
        .from('profiles')
        .update({ avatar_url: uploaded.url })
        .eq('id', authProfile!.id)

      toast.success('Avatar updated!')
    } catch {
      toast.error('Failed to upload avatar')
    }
  }

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest],
    )
  }

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({
        display_name: displayName || null,
        pronouns: pronouns || null,
        bio: bio || null,
        instagram_handle: instagramHandle || null,
        location: location || null,
        phone: phone || null,
        interests,
      })
      toast.success('Profile updated!')
      navigate('/profile')
    } catch {
      toast.error('Failed to update profile')
    }
  }

  if (isLoading) {
    return (
      <Page header={<Header title="Edit Profile" back />}>
        <div className="p-4 space-y-4">
          <div className="flex justify-center">
            <Skeleton variant="avatar" className="h-24 w-24" />
          </div>
          <Skeleton variant="text" count={5} />
        </div>
      </Page>
    )
  }

  return (
    <Page
      header={<Header title="Edit Profile" back />}
      footer={
        <Button
          variant="primary"
          size="lg"
          fullWidth
          loading={updateProfile.isPending}
          onClick={handleSave}
        >
          Save Changes
        </Button>
      }
    >
      <div className="px-4 pb-8">
        {/* Avatar */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center pt-6 pb-4"
        >
          <div className="relative">
            <Avatar
              src={profile?.avatar_url}
              name={displayName || 'User'}
              size="xl"
              tier={tier as TierName}
            />
            <button
              onClick={handleAvatarChange}
              disabled={cameraLoading || uploading}
              className="absolute -bottom-1 -right-1 flex items-center justify-center w-9 h-9 rounded-full bg-primary-500 text-white shadow-md hover:bg-primary-800 transition-colors disabled:opacity-50"
              aria-label="Change avatar"
            >
              <Camera size={16} />
            </button>
          </div>
          <UploadProgress
            progress={progress}
            uploading={uploading}
            error={uploadError}
            className="mt-2 max-w-[200px]"
          />
        </motion.div>

        {/* Form fields */}
        <div className="space-y-5 mt-4">
          <Input
            label="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            maxLength={50}
          />

          <div>
            <label className="block text-sm font-medium text-primary-800 mb-1.5">Pronouns</label>
            <div className="flex flex-wrap gap-2">
              {PRONOUN_OPTIONS.map((opt) => (
                <Chip
                  key={opt}
                  label={opt}
                  selected={pronouns === opt}
                  onSelect={() => setPronouns(pronouns === opt ? '' : opt)}
                />
              ))}
            </div>
            {pronouns === 'Custom' && (
              <Input
                label="Custom Pronouns"
                value={pronouns === 'Custom' ? '' : pronouns}
                onChange={(e) => setPronouns(e.target.value)}
                placeholder="Enter your pronouns"
                className="mt-2"
              />
            )}
          </div>

          <Input
            label="Bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell people about yourself..."
            maxLength={500}
          />

          <Input
            label="Instagram Handle"
            value={instagramHandle}
            onChange={(e) => setInstagramHandle(e.target.value)}
            placeholder="@coexistaus"
            maxLength={30}
          />

          <Input
            label="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Byron Bay, NSW"
            icon={<MapPin size={16} />}
            maxLength={100}
          />

          <Input
            label="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0400 000 000"
            type="tel"
            maxLength={20}
          />

          {/* Interests */}
          <div>
            <label className="block text-sm font-medium text-primary-800 mb-2">
              Conservation Interests
            </label>
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((interest) => (
                <Chip
                  key={interest}
                  label={interest}
                  selected={interests.includes(interest)}
                  onSelect={() => toggleInterest(interest)}
                />
              ))}
            </div>
          </div>

          {/* Privacy */}
          <div>
            <h3 className="font-heading text-sm font-semibold text-primary-800 mb-3">
              Privacy Settings
            </h3>
            <div className="space-y-3">
              {([
                { value: 'public' as const, label: 'Public', desc: 'Anyone can see your profile' },
                {
                  value: 'collective-only' as const,
                  label: 'Collective Only',
                  desc: 'Only members of your collectives can see',
                },
                { value: 'private' as const, label: 'Private', desc: 'Only you can see your profile' },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setVisibility(opt.value)}
                  className={cn(
                    'w-full flex items-start gap-3 rounded-xl px-4 py-3 border text-left transition-colors',
                    visibility === opt.value
                      ? 'border-primary-300 bg-white'
                      : 'border-primary-200 hover:bg-primary-50',
                  )}
                >
                  <div
                    className={cn(
                      'mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                      visibility === opt.value ? 'border-primary-500' : 'border-primary-200',
                    )}
                  >
                    {visibility === opt.value && (
                      <div className="w-2 h-2 rounded-full bg-primary-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary-800">{opt.label}</p>
                    <p className="text-xs text-primary-400">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Page>
  )
}
