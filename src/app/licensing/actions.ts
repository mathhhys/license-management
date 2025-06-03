'use server'

import { auth, clerkClient } from '@clerk/nextjs/server';
import Stripe from 'stripe';
import { getStripeCustomerIdFromOrgId } from '../actions';
import { neon } from '@neondatabase/serverless';

const stripe = new Stripe(process.env.STRIPE_KEY as string);
const sql = neon(process.env.DATABASE_URL as string);

export async function toggleUserLicense(orgId: string, userId: string, status: boolean) {
  console.log('Toggling user license:', { orgId, userId, status });

  await clerkClient.organizations.updateOrganizationMembershipMetadata({
    organizationId: orgId,
    userId: userId,
    publicMetadata: {
      isLicensed: status
    }
  });
    console.log('License status updated successfully');
}

export async function getCheckoutUrl(clerkOrgId: string, quantity: number) {
  console.log('Fetching Stripe ID for Org ID:', clerkOrgId);
  let stripeId = await getStripeCustomerIdFromOrgId(clerkOrgId);

  if (!stripeId) {
    const { sessionClaims } = auth();
    console.log('Creating new Stripe customer for:', sessionClaims?.org_slug);
    try {
      const customer = await stripe.customers.create({
        name: sessionClaims?.org_slug
      });
      console.log('New Stripe customer created with ID:', customer.id);
      await sql`INSERT INTO orgs (org_id, stripe_customer_id) VALUES (${clerkOrgId}, ${customer.id})`;
      stripeId = customer.id;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw error;
    }
  }

  console.log('Creating checkout session for customer ID:', stripeId);
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeId,
      line_items: [
        {
          price: 'price_1QaevAH6gWxKcaTXEvgS3WPY',
          quantity: quantity,
          adjustable_quantity: {
            enabled: true,
            minimum: 1,
            maximum: 1000,
          }
        }
      ],
      success_url: "https://enterprise-softcodes.io/licensing",
      cancel_url: "https://enterprise-softcodes.io/licensing",
    });
    console.log('Checkout session created:', session.url);
    return session.url;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

export async function getPortalUrl(clerkOrgId: string) {
  console.log('Fetching portal URL for Org ID:', clerkOrgId);
  const stripeId = await getStripeCustomerIdFromOrgId(clerkOrgId);

  if (stripeId) {
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: stripeId,
        return_url: "https://enterprise-softcodes.io/licensing",
      });
      console.log('Portal session created:', session.url);
      return session.url;
    } catch (error) {
      console.error('Error creating portal session:', error);
      throw error;
    }
  } else {
    const errorMsg = 'Stripe customer ID not found';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

