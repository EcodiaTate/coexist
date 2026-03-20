// @ts-nocheck — Deno Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

/* ------------------------------------------------------------------ */
/*  Content Moderation Stub                                            */
/*                                                                     */
/*  Skeleton Edge Function for image NSFW detection.                   */
/*  When ready, integrate with a moderation API:                       */
/*  - Google Cloud Vision SafeSearch                                   */
/*  - AWS Rekognition Content Moderation                               */
/*  - Sightengine                                                      */
/*  - Azure Content Moderator                                          */
/*                                                                     */
/*  Flow:                                                              */
/*  1. Upload image to Supabase Storage                                */
/*  2. Storage trigger / webhook calls this function                   */
/*  3. Function downloads image, sends to moderation API               */
/*  4. If flagged: move to quarantine bucket, notify admin              */
/*  5. If clean: mark as approved                                      */
/* ------------------------------------------------------------------ */

interface ModerationRequest {
  /** Supabase Storage path (e.g. "chat-images/abc123.jpg") */
  storagePath: string
  /** Bucket name */
  bucket: string
  /** Who uploaded it */
  userId: string
  /** Context: where was it uploaded */
  context: 'chat' | 'feed' | 'event' | 'profile' | 'impact'
}

interface ModerationResult {
  safe: boolean
  categories: {
    adult: 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY'
    violence: 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY'
    racy: 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY'
  }
  confidence: number
}

async function moderateImage(_imageUrl: string): Promise<ModerationResult> {
  // TODO: Integrate with moderation API
  // Example with Google Cloud Vision:
  //
  // const resp = await fetch(
  //   `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_API_KEY}`,
  //   {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({
  //       requests: [{
  //         image: { source: { imageUri: imageUrl } },
  //         features: [{ type: 'SAFE_SEARCH_DETECTION' }],
  //       }],
  //     }),
  //   },
  // )
  // const data = await resp.json()
  // const safeSearch = data.responses[0].safeSearchAnnotation

  // Stub: approve everything
  return {
    safe: true,
    categories: {
      adult: 'VERY_UNLIKELY',
      violence: 'VERY_UNLIKELY',
      racy: 'VERY_UNLIKELY',
    },
    confidence: 1.0,
  }
}

serve(async (req: Request) => {
  try {
    const payload = (await req.json()) as ModerationRequest

    // Get public URL for the image
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const imageUrl = `${supabaseUrl}/storage/v1/object/public/${payload.bucket}/${payload.storagePath}`

    const result = await moderateImage(imageUrl)

    if (!result.safe) {
      console.warn(
        `[moderate-content] Flagged image: ${payload.storagePath} by user ${payload.userId}`,
        result.categories,
      )

      // TODO: Move to quarantine bucket
      // TODO: Create moderation queue entry in DB
      // TODO: Notify admin via push notification

      return new Response(
        JSON.stringify({ approved: false, reason: 'Content flagged for review', categories: result.categories }),
        { headers: { 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ approved: true }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[moderate-content] Error:', err)
    // Default to approved to prevent blocking uploads
    return new Response(
      JSON.stringify({ approved: true, error: 'Moderation service unavailable' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }
})
