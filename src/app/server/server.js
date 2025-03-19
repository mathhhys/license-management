import express from 'express';
import { ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';
import apiRoutes from './routes/api';
import accountRoutes from './routes/account';

const app = express();
app.use(express.json());

// Add Clerk middleware to parse auth headers
app.use(ClerkExpressWithAuth());

// Register routes
app.use('/api', apiRoutes);
app.use('/account', accountRoutes);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});