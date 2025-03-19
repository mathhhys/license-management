import { clerkClient } from "@clerk/clerk-sdk-node";
import express from 'express';
const router = express.Router();

// Route to display the account dashboard
router.get('/dashboard', async (req, res) => {
  // Your existing dashboard code
  res.render('dashboard', {
    user: req.user,
    // other data...
  });
});

// API endpoint to generate VSCode token
router.post('/generate-vscode-token', async (req, res) => {
  try {
    // Get the user ID from the Clerk session
    const userId = req.auth.userId;
    
    // Generate a token that expires in 90 days
    const token = await clerkClient.sessions.getJWT({
      userId,
      sessionId: req.auth.sessionId,
      expireIn: 60 * 60 * 24 * 90 // 90 days in seconds
    });
    
    res.json({ token });
  } catch (error) {
    console.error('Error generating VSCode token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

export default router;