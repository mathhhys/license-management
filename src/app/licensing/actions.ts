'use server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import Stripe from 'stripe'
import { getStripeCustomerIdFromOrgId } from '../actions';
import { neon } from '@neondatabase/serverless';

const stripe = new Stripe(process.env.STRIPE_KEY as string);
const sql = neon(process.env.DATABASE_URL as string)

export async function toggleUserLicense(orgId: string, userId: string, status: boolean) {
  // let theuser = await clerkClient.users.getUser(userId)

  await clerkClient.organizations.updateOrganizationMembershipMetadata({
    organizationId: orgId,
    userId: userId,
    publicMetadata: {
      isLicensed: status
    }
  })
}

export async function getCheckoutUrl(clerkOrgId: string, quantity: number) {
  try {
    console.log('Getting checkout URL for org:', clerkOrgId, 'quantity:', quantity);
    
    // Check environment variables
    if (!process.env.STRIPE_KEY) {
      throw new Error('STRIPE_KEY environment variable is missing');
    }
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is missing');
    }
    
    let stripeId = await getStripeCustomerIdFromOrgId(clerkOrgId);
    console.log('Existing Stripe customer ID:', stripeId);
    
    if (!stripeId) {
      const { sessionClaims } = auth();
      console.log('Session claims:', sessionClaims);
      
      if (!sessionClaims?.org_slug) {
        throw new Error('Organization slug not found in session claims');
      }
      
      // Create customer in Stripe
      const customer = await stripe.customers.create({
        name: sessionClaims.org_slug
      });
      console.log('Created Stripe customer:', customer.id);
      
      await sql`insert into orgs (org_id, stripe_customer_id) values (${clerkOrgId}, ${customer.id})`;
      console.log('Inserted into database');
      
      stripeId = customer.id;
    }
    
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
    
    console.log('Created checkout session:', session.id);
    return session.url;
    
  } catch (error) {
    console.error('Error in getCheckoutUrl:', error);
    throw error; // Re-throw to maintain the error for the caller
  }
}

export async function getPortalUrl(clerkOrgId: string) {
  try {
    console.log('Getting portal URL for org:', clerkOrgId);
    
    const stripeId = await getStripeCustomerIdFromOrgId(clerkOrgId);
    console.log('Found Stripe customer ID:', stripeId);
    
    if (stripeId) {
      const session = await stripe.billingPortal.sessions.create({
        customer: stripeId,
        return_url: "https://enterprise-softcodes.io/licensing",
      });
      return session.url;
    } else {
      throw new Error('Stripe customer ID not found for organization: ' + clerkOrgId);
    }
  } catch (error) {
    console.error('Error in getPortalUrl:', error);
    throw error;
  }
}
