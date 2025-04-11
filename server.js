// PoolBet Server
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(bodyParser.json());

// Inject Stripe publishable key into HTML responses
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function(body) {
    if (typeof body === 'string' && body.includes('</head>')) {
      const stripeKey = process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_your_stripe_publishable_key';
      const stripeMetaTag = `<meta name="stripe-key" content="${stripeKey}">`;
      body = body.replace('</head>', `${stripeMetaTag}</head>`);
    }
    originalSend.call(this, body);
  };
  next();
});

app.use(express.static('.')); // Serve static files from current directory

// In-memory storage (replace with a real database in production)
let pools = [];
let users = [];
let transactions = [];

// Routes
app.get('/api/pools', (req, res) => {
  res.json(pools);
});

app.post('/api/pools', (req, res) => {
  const pool = req.body;
  
  // Add server-side validation
  if (!pool.name || !pool.betAmount || !pool.participants || !pool.endDate) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Calculate fees
  const PLATFORM_FEE_PERCENTAGE = parseInt(process.env.PLATFORM_FEE_PERCENTAGE || 10);
  const totalBetAmount = pool.betAmount * pool.participants.length;
  const platformFee = (totalBetAmount * PLATFORM_FEE_PERCENTAGE) / 100;
  const winnerAmount = totalBetAmount - platformFee;
  
  // Create pool with generated ID
  const newPool = {
    id: 'pool_' + Date.now(),
    name: pool.name,
    betAmount: pool.betAmount,
    participants: pool.participants,
    eventDescription: pool.eventDescription,
    endDate: pool.endDate,
    createdAt: new Date().toISOString(),
    status: 'active',
    totalAmount: totalBetAmount,
    platformFee: platformFee,
    winnerAmount: winnerAmount,
    feePercentage: PLATFORM_FEE_PERCENTAGE,
    participantsJoined: [],
    winner: null
  };

  pools.push(newPool);
  res.status(201).json(newPool);
});

app.get('/api/pools/:id', (req, res) => {
  const pool = pools.find(p => p.id === req.params.id);
  if (!pool) {
    return res.status(404).json({ error: 'Pool not found' });
  }
  res.json(pool);
});

// Create a payment intent for Stripe
app.post('/api/payments/create-intent', async (req, res) => {
  try {
    const { poolId, email } = req.body;
    
    // Find the pool
    const pool = pools.find(p => p.id === poolId);
    if (!pool) {
      return res.status(404).json({ error: 'Pool not found' });
    }
    
    // Check if email is in the participants list
    if (!pool.participants.includes(email)) {
      return res.status(400).json({ error: 'Email not invited to this pool' });
    }
    
    // Check if user has already joined
    if (pool.participantsJoined.some(p => p.email === email)) {
      return res.status(400).json({ error: 'Already joined pool' });
    }
    
    // Create a payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: pool.betAmount * 100, // Amount in cents
      currency: 'usd',
      metadata: {
        poolId,
        email,
        integration_check: 'accept_a_payment'
      }
    });
    
    // Return the client secret
    res.json({ 
      clientSecret: paymentIntent.client_secret,
      amount: pool.betAmount
    });
    
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Handle successful payment and join pool
app.post('/api/pools/:id/join', (req, res) => {
  const { id } = req.params;
  const { email, name, paymentId } = req.body;
  
  // Find the pool
  const poolIndex = pools.findIndex(p => p.id === id);
  if (poolIndex === -1) {
    return res.status(404).json({ error: 'Pool not found' });
  }
  
  const pool = pools[poolIndex];
  
  // Check if email is in the participants list
  if (!pool.participants.includes(email)) {
    return res.status(400).json({ error: 'Email not invited to this pool' });
  }
  
  // Check if user has already joined
  if (pool.participantsJoined.some(p => p.email === email)) {
    return res.status(400).json({ error: 'Already joined pool' });
  }
  
  // Add participant to joined list
  pools[poolIndex].participantsJoined.push({
    name,
    email,
    joinedAt: new Date().toISOString(),
    paymentMethod: 'stripe',
    paymentId
  });
  
  // Create transaction record
  const transaction = {
    id: 'txn_' + Date.now(),
    poolId: id,
    email,
    amount: pool.betAmount,
    platformFee: pool.betAmount * pool.feePercentage / 100,
    type: 'payment',
    status: 'completed',
    paymentMethod: 'stripe',
    paymentId,
    createdAt: new Date().toISOString()
  };
  
  transactions.push(transaction);
  
  res.json({ success: true, pool: pools[poolIndex] });
});

// Declare a winner for a pool
app.post('/api/pools/:id/winner', (req, res) => {
  const { id } = req.params;
  const { winnerEmail } = req.body;
  
  // Find the pool
  const poolIndex = pools.findIndex(p => p.id === id);
  if (poolIndex === -1) {
    return res.status(404).json({ error: 'Pool not found' });
  }
  
  // Check if winner is a participant who joined
  const pool = pools[poolIndex];
  const winnerJoined = pool.participantsJoined.some(p => p.email === winnerEmail);
  
  if (!winnerJoined) {
    return res.status(400).json({ error: 'Winner must be a participant who joined the pool' });
  }
  
  // Update pool with winner
  pools[poolIndex].winner = winnerEmail;
  pools[poolIndex].status = 'completed';
  
  // Create payout transaction record
  const payoutTransaction = {
    id: 'txn_payout_' + Date.now(),
    poolId: id,
    email: winnerEmail,
    amount: pool.winnerAmount,
    platformFee: pool.platformFee,
    type: 'payout',
    status: 'completed',
    createdAt: new Date().toISOString()
  };
  
  transactions.push(payoutTransaction);
  
  res.json({ success: true, pool: pools[poolIndex] });
});

// Webhook to handle Stripe events
app.post('/api/payments/webhook', (req, res) => {
  const payload = req.body;
  
  // In a real implementation, you would verify this with Stripe
  // using the webhook signature
  
  // Handle the event
  if (payload.type === 'payment_intent.succeeded') {
    const paymentIntent = payload.data.object;
    console.log(`Payment succeeded: ${paymentIntent.id}`);
    
    // Process the successful payment
    // This would update the pool in a real implementation
  }
  
  res.status(200).end();
});

// Get all transactions (admin endpoint)
app.get('/api/transactions', (req, res) => {
  res.json(transactions);
});

// Start the server
app.listen(port, () => {
  console.log(`PoolBet server running on http://localhost:${port}`);
}); 