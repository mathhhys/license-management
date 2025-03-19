import express from 'express';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';

const router = express.Router();

// Middleware to validate Clerk tokens
const requireAuth = ClerkExpressRequireAuth({});

// Endpoint to validate tokens
router.get('/validate-token', requireAuth, (req, res) => {
  // If request reaches here, the token is valid
  res.json({
    authenticated: true,
    userId: req.auth.userId,
    sessionId: req.auth.sessionId
  });
});

export default router;