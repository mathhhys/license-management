import express from 'express';
import { ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';
import accountRoutes from './routes/account.js'; // Adjust path as needed
import path from 'path';
import { fileURLToPath } from 'url';

// For ES modules compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Apply JSON parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Apply Clerk auth middleware globally
app.use(ClerkExpressWithAuth());

// Debug middleware to log auth data
app.use((req, res, next) => {
  console.log('Auth data:', { 
    userId: req.auth?.userId,
    sessionId: req.auth?.sessionId,
    session: req.auth?.session ? 'Present' : 'Missing'
  });
  next();
});

// Register routes
app.use('/account', accountRoutes);

// Set view engine (if you're using one)
app.set('view engine', 'ejs'); // or 'pug', 'handlebars', etc.
app.set('views', path.join(__dirname, 'views'));

// Root route
app.get('/', (req, res) => {
  res.render('index', { 
    user: req.auth?.userId ? req.auth : null 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});