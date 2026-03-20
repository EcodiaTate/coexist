import { describe, it, expect } from 'vitest'
import { getTransformUrl, getThumbnailUrl, getMediumUrl } from '@/lib/image-utils'

describe('getTransformUrl', () => {
  const base = 'https://abc.supabase.co/storage/v1/object/public/avatars/img.jpg'

  it('replaces object path with render path', () => {
    const url = getTransformUrl(base)
    expect(url).toContain('/storage/v1/render/image/public/')
  })

  it('defaults quality to 80', () => {
    const url = getTransformUrl(base)
    expect(url).toContain('quality=80')
  })

  it('includes width and height when provided', () => {
    const url = getTransformUrl(base, { width: 300, height: 200, quality: 90 })
    expect(url).toContain('width=300')
    expect(url).toContain('height=200')
    expect(url).toContain('quality=90')
  })

  it('omits width/height params when not provided', () => {
    const url = getTransformUrl(base, { quality: 50 })
    expect(url).not.toContain('width=')
    expect(url).not.toContain('height=')
    expect(url).toContain('quality=50')
  })
})

describe('getThumbnailUrl', () => {
  const base = 'https://abc.supabase.co/storage/v1/object/public/avatars/img.jpg'

  it('returns 200x200 transform URL', () => {
    const url = getThumbnailUrl(base)
    expect(url).toContain('width=200')
    expect(url).toContain('height=200')
  })
})

describe('getMediumUrl', () => {
  const base = 'https://abc.supabase.co/storage/v1/object/public/avatars/img.jpg'

  it('returns 600x600 transform URL', () => {
    const url = getMediumUrl(base)
    expect(url).toContain('width=600')
    expect(url).toContain('height=600')
  })
})
