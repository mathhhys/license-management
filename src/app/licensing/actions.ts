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
  let stripeId = await getStripeCustomerIdFromOrgId(clerkOrgId)
  if(!stripeId) {
    const { sessionClaims } = auth()
    // Create customer in Stripe
    const customer = await stripe.customers.create({
      name: sessionClaims?.org_slug
    })
    await sql`insert into orgs (org_id, stripe_customer_id) values (${clerkOrgId}, ${customer.id})`
    stripeId = customer.id
  }
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: stripeId,
    line_items: [
      {
        price: 'price_1QTPajH6gWxKcaTXHxQ6hQyH',
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
  })
  return session.url
}

export async function getPortalUrl(clerkOrgId: string) {
  const stripeId = await getStripeCustomerIdFromOrgId(clerkOrgId)
  if (stripeId) {
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeId,
      return_url: "https://enterprise-softcodes.io/licensing",
    });
    return session.url
  } else {
    throw new Error('Stripe customer ID not found');
  }
}