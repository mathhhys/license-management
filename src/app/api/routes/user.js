import express from 'express';
import { ClerkExpressRequireAuth, clerkClient } from '@clerk/clerk-sdk-node';

const router = express.Router();
const requireAuth = ClerkExpressRequireAuth({});

// Get user profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = await clerkClient.users.getUser(req.auth.userId);
    
    // Get the primary email
    const primaryEmail = user.emailAddresses.find(email => 
      email.id === user.primaryEmailAddressId
    );
    
    res.json({
      id: user.id,
      email: primaryEmail?.emailAddress,
      name: `${user.firstName} ${user.lastName}`,
      accountType: user.publicMetadata.accountType || 'free',
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to retrieve user profile' });
  }
});

export default router;