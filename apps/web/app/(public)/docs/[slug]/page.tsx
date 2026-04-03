import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { marked } from 'marked'

// All docs imported as raw strings at build time — works on Cloudflare Pages (no runtime fs)
import selfHosting from '../../../../../../docs/self-hosting.md'
import socialPipeline from '../../../../../../docs/social-pipeline.md'
import architecture from '../../../../../../docs/ENGINEERING.md'
import prd from '../../../../../../docs/PRD.md'
import contributing from '../../../../../../CONTRIBUTING.md'
import security from '../../../../../../SECURITY.md'
import codeOfConduct from '../../../../../../CODE_OF_CONDUCT.md'

const DOCS: Record<string, { title: string; category: string; content: string }> = {
  'self-hosting':    { title: 'Self-Hosting Guide',     category: 'Getting Started', content: selfHosting },
  'social-pipeline': { title: 'Social Pipeline Setup',  category: 'Getting Started', content: socialPipeline },
  'contributing':    { title: 'Contributing',           category: 'Getting Started', content: contributing },
  'architecture':    { title: 'Technical Architecture', category: 'Reference',       content: architecture },
  'prd':             { title: 'Product Requirements',   category: 'Reference',       content: prd },
  'security':        { title: 'Security Policy',        category: 'Policies',        content: security },
  'code-of-conduct': { title: 'Code of Conduct',       category: 'Policies',        content: codeOfConduct },
}

export function generateStaticParams() {
  return Object.keys(DOCS).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const doc = DOCS[slug]
  if (!doc) return {}
  return {
    title: `${doc.title} — OpenSourceCommunity Docs`,
  }
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const doc = DOCS[slug]
  if (!doc) notFound()

  const html = await marked(doc.content, { gfm: true })

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{doc.category}</p>
        <h1 className="text-3xl font-bold tracking-tight text-surface-foreground">{doc.title}</h1>
      </div>

      <article
        className="prose prose-slate max-w-none
          prose-headings:text-surface-foreground
          prose-p:text-surface-foreground
          prose-strong:text-surface-foreground
          prose-code:text-brand
          prose-code:bg-muted
          prose-code:px-1
          prose-code:py-0.5
          prose-code:rounded
          prose-code:font-mono
          prose-code:text-sm
          prose-code:before:content-none
          prose-code:after:content-none
          prose-pre:bg-neutral-900
          prose-pre:border
          prose-pre:border-border
          prose-a:text-brand
          prose-a:no-underline
          prose-a:hover:underline
          prose-th:text-surface-foreground
          prose-td:text-surface-foreground
          prose-li:text-surface-foreground
          prose-blockquote:text-muted-foreground
          prose-blockquote:border-l-brand/40
        "
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
