// Renders stored HTML content safely
export function RichContent({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={['prose prose-sm max-w-none prose-slate', className].filter(Boolean).join(' ')}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
