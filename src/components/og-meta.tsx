import { Helmet } from 'react-helmet-async'

interface OGMetaProps {
  title: string
  description: string
  url?: string
  image?: string
  type?: 'website' | 'article' | 'profile'
}

export function OGMeta({
  title,
  description,
  url,
  image,
  type = 'website',
}: OGMetaProps) {
  const fullTitle = `${title} — Co-Exist`

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      {url && <meta property="og:url" content={url} />}
      {image && <meta property="og:image" content={image} />}
      {image && <meta property="og:image:width" content="1200" />}
      {image && <meta property="og:image:height" content="630" />}
      <meta property="og:site_name" content="Co-Exist" />
      <meta property="og:locale" content="en_AU" />

      {/* Twitter */}
      <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}

      {/* App Links (Smart App Banners + deep linking) */}
      <meta name="apple-itunes-app" content="app-id=COEXIST_APP_ID" />
      {url && <meta property="al:ios:url" content={url.replace(/^https?:\/\/[^/]+/, 'coexist:/')} />}
      {url && <meta property="al:android:url" content={url.replace(/^https?:\/\/[^/]+/, 'coexist:/')} />}
      <meta property="al:android:package" content="org.coexistaus.app" />
      <meta property="al:web:should_fallback" content="true" />
    </Helmet>
  )
}
