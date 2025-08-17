import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface PaymentRequest {
  amount: number
  currency: string
  donor_email?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { amount, currency, donor_email }: PaymentRequest = await req.json()

    // Get Stripe keys from environment
    const stripeSecretKey = Deno.env.get('STRIPE_RESTRICTED_KEY')
    if (!stripeSecretKey) {
      console.error('STRIPE_RESTRICTED_KEY not found in environment variables')
      return new Response(
        JSON.stringify({ error: 'Payment service configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate amount (minimum $1.00)
    if (!amount || amount < 100) {
      return new Response(
        JSON.stringify({ error: 'Minimum donation amount is $1.00' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create payment intent with Stripe
    const paymentIntentData = {
      amount: amount,
      currency: currency || 'usd',
      automatic_payment_methods: {
        enabled: true
      },
      description: 'Donation to The Open Church Project',
      metadata: {
        project: 'open-church-project',
        donor_email: donor_email || 'anonymous'
      }
    }

    console.log('Creating Stripe payment intent:', { amount, currency })

    const stripeResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: amount.toString(),
        currency: currency || 'usd',
        'automatic_payment_methods[enabled]': 'true',
        description: 'Donation to The Open Church Project',
        'metadata[project]': 'open-church-project',
        'metadata[donor_email]': donor_email || 'anonymous'
      })
    })

    if (!stripeResponse.ok) {
      const errorData = await stripeResponse.text()
      console.error('Stripe API error:', {
        status: stripeResponse.status,
        statusText: stripeResponse.statusText,
        errorData
      })
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create payment intent',
          details: errorData
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const paymentIntent = await stripeResponse.json()
    console.log('Payment intent created successfully:', paymentIntent.id)

    return new Response(
      JSON.stringify({ 
        success: true,
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        amount: paymentIntent.amount
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in process-payment function:', error)
    
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