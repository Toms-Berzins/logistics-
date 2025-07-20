import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { priceId, planName } = await request.json();

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      );
    }

    // Create or retrieve Stripe customer
    let stripeCustomer;
    
    // Check if user already has a Stripe customer ID
    const existingCustomers = await stripe.customers.list({
      email: user.primaryEmailAddress?.emailAddress,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      stripeCustomer = existingCustomers.data[0];
    } else {
      stripeCustomer = await stripe.customers.create({
        email: user.primaryEmailAddress?.emailAddress,
        name: `${user.firstName} ${user.lastName}`.trim(),
        metadata: {
          clerkUserId: user.id,
        },
      });
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      metadata: {
        clerkUserId: user.id,
        planName: planName,
      },
      subscription_data: {
        metadata: {
          clerkUserId: user.id,
          planName: planName,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      custom_text: {
        submit: {
          message: 'Start your LogiTrack subscription today and optimize your logistics operations!',
        },
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}