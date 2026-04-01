export interface EmailMessage {
  to: string
  subject: string
  html: string
  text?: string
  from?: string
}

export interface EmailProvider {
  send(msg: EmailMessage): Promise<void>
}

class ResendProvider implements EmailProvider {
  constructor(private apiKey: string, private defaultFrom: string) {}

  async send(msg: EmailMessage): Promise<void> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        from: msg.from ?? this.defaultFrom,
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Resend API error ${res.status}: ${body}`)
    }
  }
}

class MailgunProvider implements EmailProvider {
  constructor(
    private apiKey: string,
    private domain: string,
    private defaultFrom: string,
  ) {}

  async send(msg: EmailMessage): Promise<void> {
    const form = new FormData()
    form.append('from', msg.from ?? this.defaultFrom)
    form.append('to', msg.to)
    form.append('subject', msg.subject)
    form.append('html', msg.html)
    if (msg.text) form.append('text', msg.text)

    const res = await fetch(
      `https://api.mailgun.net/v3/${this.domain}/messages`,
      {
        method: 'POST',
        headers: { Authorization: `Basic ${btoa(`api:${this.apiKey}`)}` },
        body: form,
      },
    )
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Mailgun API error ${res.status}: ${body}`)
    }
  }
}

/** No-op provider — used when no email config is set. Logs to console. */
class NoopProvider implements EmailProvider {
  async send(msg: EmailMessage): Promise<void> {
    console.log('[Email noop] Would send:', msg.subject, '->', msg.to)
  }
}

export function createEmailProvider(env: {
  EMAIL_PROVIDER?: string
  EMAIL_API_KEY?: string
  EMAIL_FROM?: string
  EMAIL_DOMAIN?: string
}): EmailProvider {
  const from = env.EMAIL_FROM ?? 'Community <noreply@example.com>'
  const apiKey = env.EMAIL_API_KEY ?? ''

  if (!apiKey) return new NoopProvider()

  const provider = env.EMAIL_PROVIDER ?? 'resend'
  if (provider === 'mailgun') {
    return new MailgunProvider(apiKey, env.EMAIL_DOMAIN ?? '', from)
  }
  return new ResendProvider(apiKey, from)
}
