import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { BrandingForm } from './branding-form'

export const metadata: Metadata = { title: 'Branding \u2014 Admin' }

interface TenantConfig {
  id: string
  name: string
  logoUrl: string | null
  primaryColor: string | null
  slug: string
}

export default async function BrandingPage() {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  let tenant: TenantConfig | null = null
  try {
    tenant = await apiGet<TenantConfig>('/api/tenant', token, 30)
  } catch {}

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-surface-foreground">Branding</h2>
        <p className="mt-1 text-sm text-muted-foreground">Customise how your community appears to members</p>
      </div>
      <BrandingForm
        initialName={tenant?.name ?? ''}
        initialLogoUrl={tenant?.logoUrl ?? ''}
        initialColor={tenant?.primaryColor ?? '#6366f1'}
        token={token ?? ''}
      />
    </div>
  )
}
