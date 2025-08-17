import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface EmailRequest {
  formType: string
  formData: Record<string, any>
  submissionTime: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { formType, formData, submissionTime }: EmailRequest = await req.json()

    // Get Brevo API key from environment
    const brevoApiKey = Deno.env.get('BREVO_API_KEY')
    if (!brevoApiKey) {
      console.error('BREVO_API_KEY not found in environment variables')
      return new Response(
        JSON.stringify({ error: 'Email service configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Format form data for email
    const formatFormData = (data: Record<string, any>) => {
      return Object.entries(data)
        .map(([key, value]) => {
          const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          if (Array.isArray(value)) {
            return `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${label}:</td><td style="padding: 8px; border: 1px solid #ddd;">${value.join(', ')}</td></tr>`
          }
          return `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${label}:</td><td style="padding: 8px; border: 1px solid #ddd;">${value || 'Not provided'}</td></tr>`
        })
        .join('')
    }

    // Create HTML content based on form type
    const getSubjectAndContent = (type: string, data: Record<string, any>) => {
      const baseStyle = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px;">
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
      `

      const endStyle = `
          </div>
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>This notification was sent from The Open Church Project website</p>
            <p>Submission Time: ${submissionTime}</p>
          </div>
        </div>
      `

      switch (type) {
        case 'church':
          return {
            subject: '🏛️ New Church Registration - The Open Church Project',
            content: `${baseStyle}
              <h1 style="color: #1e3a8a; margin-bottom: 20px;">🏛️ New Church Wants to Join the Movement!</h1>
              <p style="font-size: 16px; color: #666; margin-bottom: 20px;">A new church has registered to join The Open Church Project 24/7 network:</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                ${formatFormData(data)}
              </table>
              <div style="background: #eab308; color: white; padding: 15px; border-radius: 5px; margin-top: 20px;">
                <strong>Next Steps:</strong> Contact this church to discuss implementation timeline and support needs.
              </div>
              ${endStyle}`
          }

        case 'contact':
          return {
            subject: '📬 New Contact Message - The Open Church Project',
            content: `${baseStyle}
              <h1 style="color: #1e3a8a; margin-bottom: 20px;">📬 New Contact Message</h1>
              <p style="font-size: 16px; color: #666; margin-bottom: 20px;">Someone has reached out through the website contact form:</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                ${formatFormData(data)}
              </table>
              ${data.subject === 'Need Help/Crisis' ? `
                <div style="background: #dc2626; color: white; padding: 15px; border-radius: 5px; margin-top: 20px;">
                  <strong>⚠️ URGENT:</strong> This message indicates a crisis situation. Please respond immediately.
                </div>
              ` : ''}
              ${endStyle}`
          }

        case 'volunteer':
          return {
            subject: '🙋‍♀️ New Volunteer Application - The Open Church Project',
            content: `${baseStyle}
              <h1 style="color: #1e3a8a; margin-bottom: 20px;">🙋‍♀️ New Volunteer Application</h1>
              <p style="font-size: 16px; color: #666; margin-bottom: 20px;">Someone wants to volunteer with The Open Church Project:</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                ${formatFormData(data)}
              </table>
              <div style="background: #059669; color: white; padding: 15px; border-radius: 5px; margin-top: 20px;">
                <strong>Next Steps:</strong> Follow up with volunteer opportunities in their area.
              </div>
              ${endStyle}`
          }

        case 'story':
          return {
            subject: '📖 New Story Submission - The Open Church Project',
            content: `${baseStyle}
              <h1 style="color: #1e3a8a; margin-bottom: 20px;">📖 New Story Submission</h1>
              <p style="font-size: 16px; color: #666; margin-bottom: 20px;">Someone has shared their story about The Open Church Project:</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                ${formatFormData(data)}
              </table>
              <div style="background: #7c3aed; color: white; padding: 15px; border-radius: 5px; margin-top: 20px;">
                <strong>Review Required:</strong> Please review this story for potential publication on the website.
              </div>
              ${endStyle}`
          }

        case 'newsletter':
          return {
            subject: '📧 New Newsletter Subscription - The Open Church Project',
            content: `${baseStyle}
              <h1 style="color: #1e3a8a; margin-bottom: 20px;">📧 New Newsletter Subscriber</h1>
              <p style="font-size: 16px; color: #666; margin-bottom: 20px;">Someone has subscribed to The Open Church Project newsletter:</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                ${formatFormData(data)}
              </table>
              <div style="background: #0ea5e9; color: white; padding: 15px; border-radius: 5px; margin-top: 20px;">
                <strong>Growing Network:</strong> Add this email to your newsletter distribution list.
              </div>
              ${endStyle}`
          }

        case 'donation':
          return {
            subject: '💝 New Donation - The Open Church Project',
            content: `${baseStyle}
              <h1 style="color: #1e3a8a; margin-bottom: 20px;">💝 New Donation Received</h1>
              <p style="font-size: 16px; color: #666; margin-bottom: 20px;">A donation has been submitted through The Open Church Project website:</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                ${formatFormData(data)}
              </table>
              <div style="background: #eab308; color: white; padding: 15px; border-radius: 5px; margin-top: 20px;">
                <strong>Action Required:</strong> Process this donation and send receipt if email was provided.
              </div>
              ${endStyle}`
          }

        default:
          return {
            subject: '📋 New Website Submission - The Open Church Project',
            content: `${baseStyle}
              <h1 style="color: #1e3a8a; margin-bottom: 20px;">📋 New Website Submission</h1>
              <p style="font-size: 16px; color: #666; margin-bottom: 20px;">A new form submission has been received:</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                ${formatFormData(data)}
              </table>
              ${endStyle}`
          }
      }
    }

    const { subject, content } = getSubjectAndContent(formType, formData)

    // Prepare Brevo email payload
    const emailPayload = {
      sender: { 
        name: "The Open Church Project", 
        email: "titanbusinesspros@gmail.com" 
      },
      to: [{ 
        email: "titanbusinesspros@gmail.com", 
        name: "Titan Business Pros" 
      }],
      subject: subject,
      htmlContent: content
    }

    console.log('Sending email notification:', { formType, subject })

    // Send email via Brevo API
    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(emailPayload)
    })

    if (!brevoResponse.ok) {
      const errorData = await brevoResponse.text()
      console.error('Brevo API error:', {
        status: brevoResponse.status,
        statusText: brevoResponse.statusText,
        errorData
      })
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send email notification',
          details: errorData
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const result = await brevoResponse.json()
    console.log('Email sent successfully:', result)

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.messageId,
        message: 'Email notification sent successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in send-notification-email function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})