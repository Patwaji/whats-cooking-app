import type { NextApiRequest, NextApiResponse } from 'next'
import emailjs from 'emailjs-com'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { to_email, otp_code } = req.body

  if (!to_email || !otp_code) {
    return res.status(400).json({ success: false, error: 'Missing to_email or otp_code' })
  }

  try {
    const result = await emailjs.send(
      process.env.EMAILJS_SERVICE_ID!,
      process.env.EMAILJS_TEMPLATE_ID!,
      { to_email, otp_code },
      process.env.EMAILJS_PUBLIC_KEY!
    )
    res.status(200).json({ success: true, result })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.text || error.message })
  }
}
