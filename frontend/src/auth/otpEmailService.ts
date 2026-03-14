type DeliveryMethod = 'email' | 'demo'

interface DeliveryResult {
  ok: boolean
  sentVia?: DeliveryMethod
  error?: string
}

const EMAILJS_URL = 'https://api.emailjs.com/api/v1.0/email/send'

function hasEmailJsConfig(): boolean {
  return Boolean(
    import.meta.env.VITE_EMAILJS_SERVICE_ID &&
    import.meta.env.VITE_EMAILJS_TEMPLATE_ID &&
    import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
  )
}

export async function deliverOtpEmail(email: string, otp: string): Promise<DeliveryResult> {
  if (!hasEmailJsConfig()) {
    // Safe fallback for local development when email provider keys are not configured.
    return { ok: true, sentVia: 'demo' }
  }

  try {
    const response = await fetch(EMAILJS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: import.meta.env.VITE_EMAILJS_SERVICE_ID,
        template_id: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        user_id: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email: email,
          otp_code: otp,
          app_name: 'Indus Inventory Management System',
        },
      }),
    })

    if (!response.ok) {
      return {
        ok: false,
        error: 'Failed to send OTP email. Check EmailJS keys and template variables.',
      }
    }

    return { ok: true, sentVia: 'email' }
  } catch {
    return {
      ok: false,
      error: 'Could not connect to OTP email service. Please try again.',
    }
  }
}
