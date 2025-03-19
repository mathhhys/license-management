import express from 'express';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import { clerkClient } from "@clerk/clerk-sdk-node";

const router = express.Router();

// Middleware to require authentication
const requireAuth = ClerkExpressRequireAuth({});

// Token validation endpoint
router.get('/validate-token', requireAuth, (req, res) => {
  // If the request reaches here, the token is valid
  // (Clerk middleware has already validated it)
  res.json({
    authenticated: true,
    userId: req.auth.userId,
    sessionId: req.auth.sessionId
  });
});

export default router;

// User profile endpoint
router.get('/user/profile', requireAuth, async (req, res) => {
  try {
    // Get user details from Clerk
    const user = await clerkClient.users.getUser(req.auth.userId);
    
    // Get primary email
    const primaryEmail = user.emailAddresses.find(email => 
      email.id === user.primaryEmailAddressId
    )?.emailAddress;
    
    // Get subscription info from your database
    // This is just an example - implement according to your data model
    const subscription = await db.subscriptions.findOne({
      where: { userId: req.auth.userId }
    });
    
    res.json({
      id: user.id,
      email: primaryEmail,
      name: `${user.firstName} ${user.lastName}`,
      accountType: subscription?.tier || 'free',
      subscriptionStatus: subscription?.status || 'none'
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Add any other API endpoints you need
router.get('/user/subscription', requireAuth, async (req, res) => {
  try {
    // Get subscription details from your database
    const subscription = await db.subscriptions.findOne({
      where: { userId: req.auth.userId }
    });
    
    if (!subscription) {
      return res.json({
        active: false,
        message: 'No active subscription found'
      });
    }
    
    res.json({
      active: subscription.status === 'active',
      plan: subscription.plan,
      startDate: subscription.startDate,
      renewalDate: subscription.renewalDate,
      features: subscription.features
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription details' });
  }
});