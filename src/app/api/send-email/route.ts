import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { to, subject, body } = await req.json() as {
      to: string[]
      subject: string
      body: string
    }

    if (!to?.length || !subject?.trim() || !body?.trim()) {
      return NextResponse.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 })
    }

    const validEmails = to.filter((e) => e && e.includes('@'))
    if (!validEmails.length) {
      return NextResponse.json({ error: 'No valid email addresses provided' }, { status: 400 })
    }

    const { error } = await resend.emails.send({
      from: `${process.env.SMTP_FROM_NAME || 'BLYFT'} <${process.env.SMTP_USER || 'clientservice@blyftit.com'}>`,
      to: validEmails,
      subject: subject.trim(),
      text: body,
      html: body.replace(/\n/g, '<br />'),
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, sent: validEmails.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send email'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
