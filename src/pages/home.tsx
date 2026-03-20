import { APP_NAME, TAGLINE } from '@/lib/constants'

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-neutral-50 px-6">
      <h1 className="font-heading text-4xl font-bold tracking-tight text-neutral-950">
        {APP_NAME}
      </h1>
      <p className="mt-3 text-lg text-primary-600">{TAGLINE}</p>
      <div className="mt-8 flex items-center gap-3">
        <div className="h-3 w-3 animate-pulse rounded-full bg-primary-400" />
        <span className="text-sm text-neutral-500">Ready to build</span>
      </div>
    </div>
  )
}
