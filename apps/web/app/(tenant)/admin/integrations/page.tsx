import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Integrations \u2014 Admin' }

const INTEGRATIONS = [
  {
    name: 'Salesforce',
    description: 'Sync community members and activity with Salesforce CRM contacts and accounts.',
    icon: '\u2601\ufe0f',
    status: 'available',
    docsHref: '#',
  },
  {
    name: 'HubSpot',
    description: 'Push community engagement data into HubSpot contacts and track lifecycle stages.',
    icon: '\ud83d\udd36',
    status: 'available',
    docsHref: '#',
  },
  {
    name: 'Slack',
    description: 'Receive notifications in Slack for new threads, ideas, and moderation flags.',
    icon: '\ud83d\udcac',
    status: 'available',
    docsHref: '#',
  },
  {
    name: 'Zapier',
    description: 'Connect to 6,000+ apps with no-code automations triggered by community events.',
    icon: '\u26a1',
    status: 'available',
    docsHref: '#',
  },
  {
    name: 'Webhooks',
    description: 'Send real-time event payloads to any endpoint when members post, vote, or join.',
    icon: '\ud83d\udd17',
    status: 'available',
    href: '/admin/integrations/webhooks',
  },
  {
    name: 'SSO / SAML',
    description: 'Enable single sign-on with Okta, Azure AD, or any SAML 2.0 identity provider.',
    icon: '\ud83d\udd10',
    status: 'enterprise',
    docsHref: '#',
  },
]

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-surface-foreground">Integrations</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your community to the tools your team already uses
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INTEGRATIONS.map((intg) => (
          <div key={intg.name} className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{intg.icon}</span>
                <p className="text-sm font-semibold text-surface-foreground">{intg.name}</p>
              </div>
              {intg.status === 'enterprise' && (
                <span className="rounded-full bg-violet-50 border border-violet-200 px-2 py-0.5 text-xs font-medium text-violet-700">
                  Enterprise
                </span>
              )}
            </div>
            <p className="mb-4 text-xs text-muted-foreground leading-relaxed">{intg.description}</p>
            {'href' in intg && intg.href ? (
              <Link
                href={intg.href}
                className="flex w-full items-center justify-center rounded-lg border border-border px-3 py-2 text-xs font-semibold text-surface-foreground hover:bg-muted transition-colors"
              >
                Configure →
              </Link>
            ) : (
              <button
                type="button"
                className="w-full rounded-lg border border-border px-3 py-2 text-xs font-semibold text-surface-foreground hover:bg-muted transition-colors"
              >
                {intg.status === 'enterprise' ? 'Configure' : 'Connect'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
