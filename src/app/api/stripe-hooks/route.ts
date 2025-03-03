import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_KEY as string);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

export async function POST(request: NextRequest) {
  const updateLicenseCount = async (stripeCustomerId: string, quantity: number) => {
    const sql = neon(process.env.DATABASE_URL as string);

    // Fetch the current license count
    const result = await sql`select license_count from orgs where stripe_customer_id=${stripeCustomerId}`;
    if (!result.length) {
      throw new Error("Customer not found");
    }

    const currentLicenseCount = result[0].license_count;

    // Calculate the new license count
    const newLicenseCount = currentLicenseCount + quantity;

    // Update the license count
    await sql`update orgs set license_count=${newLicenseCount} where stripe_customer_id=${stripeCustomerId}`;

    console.log(`Updated license count for customer ${stripeCustomerId} from ${currentLicenseCount} to ${newLicenseCount}`);
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
        const subscription = event.data.object as Stripe.Subscription;

        // Access the quantity from the first item in the subscription
        const quantity = subscription.items.data[0].quantity;

        if (typeof quantity !== 'number' || isNaN(quantity)) {
          throw new Error("Invalid quantity");
        }

        await updateLicenseCount(
          subscription.customer as string,
          quantity
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