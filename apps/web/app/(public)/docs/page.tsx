import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Documentation — OpenSourceCommunity',
  description: 'Guides and reference documentation for self-hosting, configuring, and contributing to OpenSourceCommunity.',
}

const DOCS = [
  {
    category: 'Getting Started',
    items: [
      {
        slug: 'self-hosting',
        title: 'Self-Hosting Guide',
        description: 'Deploy OpenSourceCommunity on Cloudflare Pages + Workers with your own Supabase project. Covers prerequisites, environment variables, database setup, and going live.',
      },
      {
        slug: 'social-pipeline',
        title: 'Social Pipeline Setup',
        description: 'Configure the social intelligence pipeline to monitor brand mentions across all 11 platforms — Reddit, Twitter/X, LinkedIn, YouTube, GitHub, Discord, TikTok, G2, Trustpilot, Product Hunt, and HackerNews.',
      },
      {
        slug: 'contributing',
        title: 'Contributing',
        description: 'Set up a local dev environment, understand the project structure, and learn how to add new modules, submit PRs, and follow the commit conventions.',
      },
    ],
  },
  {
    category: 'Reference',
    items: [
      {
        slug: 'architecture',
        title: 'Technical Architecture',
        description: 'Deep dive into the system architecture — monorepo structure, multi-tenancy model, API layer, social listening pipeline, auth, real-time layer, and infrastructure decisions.',
      },
      {
        slug: 'prd',
        title: 'Product Requirements',
        description: 'The original product requirements document (PRD v1.0) covering target personas, module feature breakdown, information architecture, and success metrics.',
      },
    ],
  },
  {
    category: 'Policies',
    items: [
      {
        slug: 'security',
        title: 'Security Policy',
        description: 'How to responsibly disclose security vulnerabilities, what to include in a report, and what to expect in terms of response.',
      },
      {
        slug: 'code-of-conduct',
        title: 'Code of Conduct',
        description: 'Community guidelines and expected behaviour for contributors, maintainers, and community members.',
      },
    ],
  },
]

export default function DocsIndexPage() {
  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-surface-foreground">Documentation</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Everything you need to deploy, configure, and contribute to OpenSourceCommunity.
        </p>
      </div>

      {DOCS.map((group) => (
        <section key={group.category}>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 pb-2 border-b border-border">
            {group.category}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {group.items.map((doc) => (
              <Link
                key={doc.slug}
                href={`/docs/${doc.slug}`}
                className="group block rounded-xl border border-border bg-card p-5 hover:border-brand/40 hover:shadow-sm transition-all"
              >
                <h3 className="font-semibold text-surface-foreground group-hover:text-brand transition-colors mb-2">
                  {doc.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{doc.description}</p>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-brand opacity-0 group-hover:opacity-100 transition-opacity">
                  Read more
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <div className="rounded-xl border border-border bg-muted/40 p-6 flex items-start gap-4">
        <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <svg className="h-5 w-5 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-surface-foreground">Something missing?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Open a{' '}
            <a href="https://github.com/JonJLevesque/OpenSourceCommunity/discussions" className="text-brand hover:underline" target="_blank" rel="noopener noreferrer">
              GitHub Discussion
            </a>{' '}
            or{' '}
            <a href="https://github.com/JonJLevesque/OpenSourceCommunity/issues" className="text-brand hover:underline" target="_blank" rel="noopener noreferrer">
              file an issue
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
