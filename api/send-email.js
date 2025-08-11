// api/send-email.js
import { Resend } from 'resend';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { to, subject, html } = req.body;

    const data = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
}
