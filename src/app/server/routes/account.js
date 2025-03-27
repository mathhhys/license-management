import { clerkClient } from "@clerk/clerk-sdk-node";
import express from 'express';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';

const router = express.Router();

// Add Clerk authentication middleware
const requireAuth = ClerkExpressRequireAuth({});

// Route to display the account dashboard
router.get('/dashboard', requireAuth, async (req, res) => {
  // Your existing dashboard code
  res.render('dashboard', {
    user: req.auth.userId,
    // other data...
  });
});


router.get('/auth-status', requireAuth, (req, res) => {
  res.json({
    isAuthenticated: true,
    userId: req.auth.userId,
    sessionId: req.auth.sessionId,
    sessionData: req.auth.session ? {
      id: req.auth.session.id,
      status: req.auth.session.status,
      expireAt: req.auth.session.expireAt
    } : null
  });
});

// API endpoint to generate VSCode token
router.post('/generate-vscode-token', requireAuth, async (req, res) => {
  try {
    // Get the user ID from the Clerk session
    const userId = req.auth.userId;
    const sessionId = req.auth.sessionId;
    
    // Validate required parameters
    if (!userId || !sessionId) {
      console.error('Missing required auth parameters:', { userId, sessionId });
      return res.status(401).json({ 
        error: 'Authentication parameters missing', 
        details: 'User or session information is missing' 
      });
    }
    
    console.log('Generating token for:', { userId, sessionId });
    
    // Generate a token with the vscode-extension template
    const token = await clerkClient.sessions.getToken({
      userId,
      sessionId,
      template: 'vscode-extension', // Make sure this template is created in Clerk
      expiresIn: 60 * 60 * 24 * 90 // 90 days in seconds (corrected parameter name)
    });
    
    console.log('Token generated successfully');
    
    res.json({ token });
  } catch (error) {
    console.error('Error generating VSCode token:', error);
    res.status(500).json({ 
      error: 'Failed to generate token', 
      details: error.message 
    });
  }
});

export default router;