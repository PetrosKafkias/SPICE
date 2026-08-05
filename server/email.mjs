function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[character]));
}

export async function sendAccountVerificationEmail({ email, fullName, token, returnTo = '/' }) {
  const publicUrl = (process.env.SPICE_PUBLIC_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');
  const verificationUrl = `${publicUrl}/verify-email?token=${encodeURIComponent(token)}&returnTo=${encodeURIComponent(returnTo)}`;
  const apiKey = process.env.RESEND_API_KEY;
  const developmentPreview = process.env.SPICE_EMAIL_MODE === 'preview' || (!apiKey && process.env.NODE_ENV !== 'production');

  if (developmentPreview) {
    console.info(`[SPICE email preview] Verify ${email}: ${verificationUrl}`);
    return { delivery: 'preview', previewUrl: verificationUrl };
  }
  if (!apiKey) throw new Error('RESEND_API_KEY is required to send verification emails.');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.SPICE_EMAIL_FROM || 'SPICE <no-reply@spice-toolkit.eu>',
      to: [email],
      subject: 'Verify your SPICE account',
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#333"><h1>Welcome to SPICE</h1><p>Hello ${escapeHtml(fullName)},</p><p>Please verify your email address to activate your account.</p><p><a href="${verificationUrl}" style="display:inline-block;background:#f68b2c;color:#fff;padding:12px 20px;text-decoration:none">Verify account</a></p><p>This link expires in 24 hours.</p></div>`,
    }),
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}.`);
  return { delivery: 'sent' };
}
