import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
  try {
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

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'mail.blyftit.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false, // STARTTLS on port 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false, // cPanel self-signed certs
      },
    })

    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'BLYFT'}" <${process.env.SMTP_USER}>`,
      to: validEmails.join(', '),
      subject: subject.trim(),
      text: body,
      html: body.replace(/\n/g, '<br />'),
    })

    return NextResponse.json({ success: true, sent: validEmails.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send email'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
