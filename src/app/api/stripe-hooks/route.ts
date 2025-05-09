import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_KEY as string);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

export async function POST(request: NextRequest) {
  const updateLicenseCount = async (stripeCustomerId: string, quantity: number) => {
    const sql = neon(process.env.DATABASE_URL as string);
    
    // First, get the current license count
    const result = await sql`SELECT license_count FROM orgs WHERE stripe_customer_id = ${stripeCustomerId}`;
    const currentLicenseCount = result[0]?.license_count || 0;
    
    // Calculate the new total
    const newTotal = currentLicenseCount + quantity;
    
    // Update with the new total
    await sql`UPDATE orgs SET license_count = ${newTotal} WHERE stripe_customer_id = ${stripeCustomerId}`;
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
          event.data.object.quantity
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
