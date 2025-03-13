const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Store pending auth requests with mapping between state and clientId
const pendingAuth = {};

// Store active tokens
const tokens = {};

// Store user sessions
const userSessions = {};

// New endpoint to prepare for authentication
app.post('/api/prepare-auth', (req, res) => {
  const { state, clientId } = req.body;
  
  if (!state || !clientId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  
  // Store the mapping between state and clientId
  pendingAuth[state] = {
    clientId,
    timestamp: Date.now()
  };
  
  // Clean up old pending auth requests after 10 minutes
  setTimeout(() => {
    if (pendingAuth[state]) {
      delete pendingAuth[state];
    }
  }, 10 * 60 * 1000);
  
  return res.json({ success: true });
});

app.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  
  if (!code || !state) {
    return res.status(400).send(`
      <html>
        <head><title>Authentication Failed</title></head>
        <body>
          <h1>Authentication Failed</h1>
          <p>Invalid or missing parameters.</p>
          <p>You can close this window and try again.</p>
        </body>
      </html>
    `);
  }
  
  // Get the clientId associated with this state
  const authRequest = pendingAuth[state];
  if (!authRequest) {
    return res.status(400).send(`
      <html>
        <head><title>Authentication Failed</title></head>
        <body>
          <h1>Authentication Failed</h1>
          <p>Invalid or expired authentication request.</p>
          <p>You can close this window and try again.</p>
        </body>
      </html>
    `);
  }
  
  const { clientId } = authRequest;

  try {
    const tokenResponse = await axios.post('https://api.clerk.dev/v1/oauth/token', {
      grant_type: 'authorization_code',
      client_id: process.env.CLERK_PUBLISHABLE_KEY,
      client_secret: process.env.CLERK_SECRET_KEY,
      code,
      redirect_uri: 'https://enterprise-softcodes.io/callback'
    });

    const { access_token, refresh_token } = tokenResponse.data;
    
    // Get user information
    const userResponse = await axios.get('https://api.clerk.dev/v1/user', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const userId = userResponse.data.id;
    
    // Store tokens indexed by clientId (not state) for polling
    tokens[clientId] = {
      access_token,
      refresh_token,
      userId,
      timestamp: Date.now()
    };
    
    // Store user session for later use
    userSessions[userId] = {
      access_token,
      refresh_token,
      clientId,
      timestamp: Date.now()
    };
    
    // Clean up the pending auth request
    delete pendingAuth[state];
    
    // Clean up tokens after 24 hours
    setTimeout(() => {
      if (tokens[clientId]) {
        delete tokens[clientId];
      }
    }, 24 * 60 * 60 * 1000);

    return res.send(`
      <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
            .success { color: #4CAF50; }
            button { padding: 10px 20px; background-color: #4CAF50; color: white; 
                     border: none; border-radius: 4px; cursor: pointer; }
          </style>
        </head>
        <body>
          <h1 class="success">Authentication Successful!</h1>
          <p>You have successfully authenticated with Softcodes.</p>
          <p>You can now close this window and return to VSCode.</p>
          <button onclick="window.close()">Close Window</button>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Token exchange error:', error);
    return res.status(500).send(`
      <html>
        <head><title>Authentication Failed</title></head>
        <body>
          <h1>Authentication Failed</h1>
          <p>There was an error processing your authentication: ${error.message}</p>
          <p>You can close this window and try again.</p>
        </body>
      </html>
    `);
  }
});

app.get('/api/check-auth-status', (req, res) => {
  const { clientId } = req.query;
  
  if (!clientId) {
    return res.status(400).json({ authenticated: false, error: 'Missing client identifier' });
  }

  // Check if we have tokens for this clientId
  if (tokens[clientId]) {
    const tokenData = tokens[clientId];
    const response = {
      authenticated: true,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token
    };

    // Don't delete the tokens here - keep them for reference
    return res.json(response);
  }

  return res.json({ authenticated: false });
});

app.post('/api/refresh-token', async (req, res) => {
  const { refresh_token } = req.body;
  
  if (!refresh_token) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {
    const response = await axios.post('https://api.clerk.dev/v1/oauth/token', {
      grant_type: 'refresh_token',
      client_id: process.env.CLERK_PUBLISHABLE_KEY,
      client_secret: process.env.CLERK_SECRET_KEY,
      refresh_token
    });

    const { access_token, refresh_token: new_refresh_token } = response.data;
    
    // Update all relevant token stores
    let userId = null;
    let clientId = null;
    
    // Find the user associated with this refresh token
    for (const [id, session] of Object.entries(userSessions)) {
      if (session.refresh_token === refresh_token) {
        userId = id;
        clientId = session.clientId;
        
        // Update user session
        userSessions[id] = {
          ...session,
          access_token,
          refresh_token: new_refresh_token,
          timestamp: Date.now()
        };
        
        // Update tokens storage if it exists
        if (clientId && tokens[clientId]) {
          tokens[clientId] = {
            ...tokens[clientId],
            access_token,
            refresh_token: new_refresh_token,
            timestamp: Date.now()
          };
        }
        
        break;
      }
    }

    return res.json({ access_token, refresh_token: new_refresh_token });
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(401).json({ 
      error: 'Failed to refresh token', 
      message: error.response?.data?.message || error.message 
    });
  }
});

app.post('/api/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const { clientId } = req.body;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header is required' });
  }

  const token = authHeader.split(' ')[1];
  
  // Find and remove user session associated with this token
  for (const [userId, session] of Object.entries(userSessions)) {
    if (session.access_token === token) {
      delete userSessions[userId];
      break;
    }
  }
  
  // Clean up tokens storage
  if (clientId && tokens[clientId]) {
    delete tokens[clientId];
  }

  return res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/api/user-info', async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header is required' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const userResponse = await axios.get('https://api.clerk.dev/v1/user', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const userData = userResponse.data;
    return res.json({
      id: userData.id,
      email: userData.email_addresses?.[0]?.email_address,
      username: userData.username,
      firstName: userData.first_name,
      lastName: userData.last_name,
      imageUrl: userData.image_url
    });
  } catch (error) {
    console.error('Error fetching user info:', error);
    return res.status(401).json({ 
      error: 'Failed to get user info', 
      message: error.response?.data?.message || error.message 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message 
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});