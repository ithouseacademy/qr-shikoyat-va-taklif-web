import { Facebook, Globe, Instagram, Linkedin, Send, Twitter, Youtube } from 'lucide-react'

export type SocialLink = { platform: string; name: string; url: string }

export const SOCIAL_PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'X (Twitter)' },
  { value: 'website', label: 'Veb-sayt' },
]

const ICONS: Record<string, any> = {
  instagram: Instagram,
  telegram: Send,
  facebook: Facebook,
  youtube: Youtube,
  linkedin: Linkedin,
  twitter: Twitter,
  website: Globe,
}

export function SocialIcon({ platform, size = 18 }: { platform: string; size?: number }) {
  const I = ICONS[platform] || Globe
  return <I size={size} />
}

export function platformLabel(platform: string) {
  return SOCIAL_PLATFORMS.find((p) => p.value === platform)?.label || 'Veb-sayt'
}
