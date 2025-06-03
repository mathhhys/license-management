import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_KEY as string);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

export async function POST(request: NextRequest) {
  console.log('Received a webhook event');

  const updateLicenseCount = async (stripeCustomerId: string, quantity: number) => {
    console.log('Updating license count for Stripe customer ID:', stripeCustomerId);
    const sql = neon(process.env.DATABASE_URL as string);

    try {
      // First, get the current license count
      const [result] = await sql`SELECT license_count FROM orgs WHERE stripe_customer_id = ${stripeCustomerId}`;
      const currentLicenseCount = result?.license_count || 0;
      console.log(`Current license count is ${currentLicenseCount}, adding ${quantity}`);

      // Calculate the new total
      const newTotal = currentLicenseCount + quantity;

      // Update with the new total
      await sql`UPDATE orgs SET license_count = ${newTotal} WHERE stripe_customer_id = ${stripeCustomerId}`;
      console.log('License count updated to:', newTotal);
    } catch (error) {
      console.error('Error updating license count:', error);
      throw error;
    }
  };

  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    const errorMsg = "Missing signature";
    console.error(errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  try {
    const body = await request.text();
    const event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    console.log('Successfully constructed webhook event:', event.type);

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const { customer, quantity } = event.data.object as any;
        console.log('Subscription event for customer:', customer, 'Quantity:', quantity);
        await updateLicenseCount(customer, quantity);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new NextResponse(null, { status: 200 });
  } catch (err) {
    console.error('Error processing webhook:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 400 });
  }
}
