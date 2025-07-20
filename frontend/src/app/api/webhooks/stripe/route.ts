import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  console.log('Received webhook event:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Checkout session completed:', session.id);
  
  // Here you would typically:
  // 1. Store subscription data in your database
  // 2. Update user's subscription status
  // 3. Send welcome email
  // 4. Enable premium features
  
  const clerkUserId = session.metadata?.clerkUserId;
  const planName = session.metadata?.planName;
  
  if (clerkUserId && planName) {
    console.log(`User ${clerkUserId} subscribed to ${planName} plan`);
    // TODO: Update user record in your database
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Subscription created:', subscription.id);
  
  const clerkUserId = subscription.metadata?.clerkUserId;
  const planName = subscription.metadata?.planName;
  
  if (clerkUserId) {
    console.log(`Subscription created for user ${clerkUserId}: ${planName}`);
    // TODO: Update user's subscription status in database
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id);
  
  const clerkUserId = subscription.metadata?.clerkUserId;
  
  if (clerkUserId) {
    console.log(`Subscription updated for user ${clerkUserId}, status: ${subscription.status}`);
    // TODO: Update user's subscription status in database
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id);
  
  const clerkUserId = subscription.metadata?.clerkUserId;
  
  if (clerkUserId) {
    console.log(`Subscription cancelled for user ${clerkUserId}`);
    // TODO: Update user's subscription status to cancelled
    // TODO: Disable premium features
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Invoice payment succeeded:', invoice.id);
  
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    const clerkUserId = subscription.metadata?.clerkUserId;
    
    if (clerkUserId) {
      console.log(`Payment successful for user ${clerkUserId}`);
      // TODO: Extend subscription period
      // TODO: Send payment confirmation email
    }
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Invoice payment failed:', invoice.id);
  
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    const clerkUserId = subscription.metadata?.clerkUserId;
    
    if (clerkUserId) {
      console.log(`Payment failed for user ${clerkUserId}`);
      // TODO: Send payment failed email
      // TODO: Implement grace period logic
    }
  }
}