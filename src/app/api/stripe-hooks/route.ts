import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_KEY as string);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

export async function POST(request: NextRequest) {
  const updateLicenseCount = async (stripeCustomerId: string, newQuantity: number, eventType: string) => {
    const sql = neon(process.env.DATABASE_URL as string);
    
    // For subscription.created events, we just set the license count directly
    if (eventType === 'customer.subscription.created') {
      await sql`UPDATE orgs SET license_count=${newQuantity} WHERE stripe_customer_id=${stripeCustomerId}`;
      return;
    }
    
    // For subscription.updated events, we need to get the previous quantity and calculate the difference
    if (eventType === 'customer.subscription.updated') {
      // Get the current license count from the database
      const result = await sql`SELECT license_count FROM orgs WHERE stripe_customer_id=${stripeCustomerId}`;
      
      // Set current license count to 0 if not found
      let currentCount = 0;
      if (result && result.length > 0) {
        currentCount = result[0].license_count || 0;
      }
      
      // Get the previous subscription data to see the old quantity
      const subscriptions = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        limit: 1
      });
      
      if (subscriptions.data.length > 0) {
        // Update the license count to the new quantity
        await sql`UPDATE orgs SET license_count=${newQuantity} WHERE stripe_customer_id=${stripeCustomerId}`;
      } else {
        // If we can't find previous subscription data, just set to the new quantity
        await sql`UPDATE orgs SET license_count=${newQuantity} WHERE stripe_customer_id=${stripeCustomerId}`;
      }
    }
  };

  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    throw new Error("Missing signature");
  }

  try {
    const body = await request.text();
    const event = stripe.webhooks.constructEvent(body, sig, endpointSecret);

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await updateLicenseCount(
          event.data.object.customer as string,
          // @ts-ignore
          event.data.object.quantity,
          event.type
        );
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    return new NextResponse(null, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({
      "error": err?.toString()
    }, { status: 400 });
  }
}