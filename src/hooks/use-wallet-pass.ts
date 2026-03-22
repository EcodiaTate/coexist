import { useMutation } from '@tanstack/react-query'
import { Capacitor } from '@capacitor/core'
import { supabase } from '@/lib/supabase'

type WalletPlatform = 'apple' | 'google'

interface WalletPassResult {
  format: 'apple_pass_json' | 'pkpass' | 'google_wallet_link'
  url?: string
  pass?: Record<string, unknown>
  data?: string
}

function getPlatform(): WalletPlatform | null {
  const platform = Capacitor.getPlatform()
  if (platform === 'ios') return 'apple'
  if (platform === 'android') return 'google'
  return null
}

export function useAddToWallet() {
  return useMutation({
    mutationFn: async (tier: string): Promise<WalletPassResult> => {
      const platform = getPlatform()
      if (!platform) throw new Error('Wallet passes are only available on mobile')

      const res = await supabase.functions.invoke('generate-wallet-pass', {
        body: { platform, tier },
      })

      if (res.error) throw res.error
      return res.data as WalletPassResult
    },
  })
}

/**
 * Handle the wallet pass result on the native platform.
 *
 * - Google: Opens the save URL in the system browser
 * - Apple: When full pkpass signing is implemented, presents the pass natively.
 *          For now, shows the pass data for debugging.
 */
export async function handleWalletPassResult(result: WalletPassResult): Promise<boolean> {
  if (result.format === 'google_wallet_link' && result.url) {
    // Open Google Wallet save link in system browser
    window.open(result.url, '_system')
    return true
  }

  if (result.format === 'pkpass' && result.data) {
    // Full .pkpass binary — download and open natively
    // Convert base64 to blob and trigger download/open
    const binary = atob(result.data)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    const blob = new Blob([bytes], { type: 'application/vnd.apple.pkpass' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    URL.revokeObjectURL(url)
    return true
  }

  if (result.format === 'apple_pass_json') {
    // Pass definition returned but not yet signed as .pkpass
    // This happens when Apple certificates aren't configured yet
    return false
  }

  return false
}
