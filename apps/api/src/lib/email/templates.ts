interface TemplateResult {
  subject: string
  html: string
  text: string
}

function layout(content: string, communityName: string, unsubscribeUrl?: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Email</title></head>
<body style="font-family:ui-sans-serif,system-ui,sans-serif;background:#f8fafc;margin:0;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">
    <div style="background:#6366f1;padding:20px 24px">
      <p style="color:#fff;font-size:14px;font-weight:600;margin:0">${escHtml(communityName)}</p>
    </div>
    <div style="padding:24px">
      ${content}
    </div>
    <div style="padding:16px 24px;border-top:1px solid #e2e8f0;text-align:center">
      <p style="color:#94a3b8;font-size:11px;margin:0">
        You're receiving this because you're a member of ${escHtml(communityName)}.
        ${unsubscribeUrl ? `<a href="${unsubscribeUrl}" style="color:#94a3b8">Unsubscribe</a>` : ''}
      </p>
    </div>
  </div>
</body>
</html>`
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function templateNewReply(params: {
  communityName: string
  recipientName: string
  authorName: string
  threadTitle: string
  threadUrl: string
  replySnippet: string
  unsubscribeUrl?: string
}): TemplateResult {
  const subject = `Re: ${params.threadTitle}`
  const content = `
    <p style="color:#0f172a;font-size:15px;font-weight:600;margin:0 0 16px">New reply to your thread</p>
    <p style="color:#475569;font-size:14px;margin:0 0 12px">
      Hi ${escHtml(params.recipientName)}, <strong>${escHtml(params.authorName)}</strong> replied to your thread
      <strong>${escHtml(params.threadTitle)}</strong>:
    </p>
    <blockquote style="margin:0 0 16px;padding:12px 16px;background:#f8fafc;border-left:3px solid #6366f1;border-radius:0 8px 8px 0">
      <p style="color:#475569;font-size:13px;margin:0">${escHtml(params.replySnippet.slice(0, 300))}</p>
    </blockquote>
    <a href="${params.threadUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none">View reply →</a>
  `
  return {
    subject,
    html: layout(content, params.communityName, params.unsubscribeUrl),
    text: `${params.authorName} replied to "${params.threadTitle}":\n\n${params.replySnippet}\n\nView: ${params.threadUrl}`,
  }
}

export function templateNewIdeaComment(params: {
  communityName: string
  recipientName: string
  authorName: string
  ideaTitle: string
  ideaUrl: string
  commentSnippet: string
  unsubscribeUrl?: string
}): TemplateResult {
  const subject = `New comment on your idea: ${params.ideaTitle}`
  const content = `
    <p style="color:#0f172a;font-size:15px;font-weight:600;margin:0 0 16px">New comment on your idea</p>
    <p style="color:#475569;font-size:14px;margin:0 0 12px">
      Hi ${escHtml(params.recipientName)}, <strong>${escHtml(params.authorName)}</strong> commented on
      <strong>${escHtml(params.ideaTitle)}</strong>:
    </p>
    <blockquote style="margin:0 0 16px;padding:12px 16px;background:#f8fafc;border-left:3px solid #6366f1;border-radius:0 8px 8px 0">
      <p style="color:#475569;font-size:13px;margin:0">${escHtml(params.commentSnippet.slice(0, 300))}</p>
    </blockquote>
    <a href="${params.ideaUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none">View idea →</a>
  `
  return {
    subject,
    html: layout(content, params.communityName, params.unsubscribeUrl),
    text: `${params.authorName} commented on "${params.ideaTitle}":\n\n${params.commentSnippet}\n\nView: ${params.ideaUrl}`,
  }
}

export function templateIdeaStatusChanged(params: {
  communityName: string
  recipientName: string
  ideaTitle: string
  newStatus: string
  ideaUrl: string
  unsubscribeUrl?: string
}): TemplateResult {
  const subject = `Your idea status changed: ${params.ideaTitle}`
  const content = `
    <p style="color:#0f172a;font-size:15px;font-weight:600;margin:0 0 16px">Idea status updated</p>
    <p style="color:#475569;font-size:14px;margin:0 0 16px">
      Hi ${escHtml(params.recipientName)}, your idea <strong>${escHtml(params.ideaTitle)}</strong>
      has been updated to <strong>${escHtml(params.newStatus)}</strong>.
    </p>
    <a href="${params.ideaUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none">View idea →</a>
  `
  return {
    subject,
    html: layout(content, params.communityName, params.unsubscribeUrl),
    text: `Your idea "${params.ideaTitle}" status changed to "${params.newStatus}".\n\nView: ${params.ideaUrl}`,
  }
}

export function templateWeeklyDigest(params: {
  communityName: string
  recipientName: string
  topThreads: { title: string; url: string; replyCount: number }[]
  topIdeas: { title: string; url: string; voteCount: number }[]
  newMemberCount: number
  communityUrl: string
  unsubscribeUrl?: string
}): TemplateResult {
  const threadItems = params.topThreads
    .map(t => `<li style="margin-bottom:8px"><a href="${t.url}" style="color:#6366f1;text-decoration:none;font-size:13px">${escHtml(t.title)}</a> <span style="color:#94a3b8;font-size:12px">(${t.replyCount} replies)</span></li>`)
    .join('')

  const ideaItems = params.topIdeas
    .map(i => `<li style="margin-bottom:8px"><a href="${i.url}" style="color:#6366f1;text-decoration:none;font-size:13px">${escHtml(i.title)}</a> <span style="color:#94a3b8;font-size:12px">(${i.voteCount} votes)</span></li>`)
    .join('')

  const content = `
    <p style="color:#0f172a;font-size:15px;font-weight:600;margin:0 0 16px">Your weekly digest</p>
    <p style="color:#475569;font-size:14px;margin:0 0 20px">
      Hi ${escHtml(params.recipientName)}, here's what happened in ${escHtml(params.communityName)} this week.
      ${params.newMemberCount > 0 ? `<strong>${params.newMemberCount} new members</strong> joined.` : ''}
    </p>
    ${threadItems ? `<p style="color:#0f172a;font-size:13px;font-weight:600;margin:0 0 8px">Top discussions</p><ul style="padding-left:16px;margin:0 0 20px">${threadItems}</ul>` : ''}
    ${ideaItems ? `<p style="color:#0f172a;font-size:13px;font-weight:600;margin:0 0 8px">Top ideas</p><ul style="padding-left:16px;margin:0 0 20px">${ideaItems}</ul>` : ''}
    <a href="${params.communityUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none">Visit community →</a>
  `
  return {
    subject: `Your weekly digest from ${params.communityName}`,
    html: layout(content, params.communityName, params.unsubscribeUrl),
    text: `Weekly digest from ${params.communityName}\n\nTop threads:\n${params.topThreads.map(t => `- ${t.title}: ${t.url}`).join('\n')}\n\nTop ideas:\n${params.topIdeas.map(i => `- ${i.title}: ${i.url}`).join('\n')}`,
  }
}
