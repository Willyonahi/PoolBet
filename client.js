// PoolBet API Client
// This file connects the frontend to the server

const API_URL = 'http://localhost:3000/api';

// API request function with error handling
async function apiRequest(endpoint, method = 'GET', data = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_URL}${endpoint}`, options);
    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.error || 'Something went wrong');
    }

    return responseData;
  } catch (error) {
    console.error(`API Error: ${error.message}`);
    throw error;
  }
}

// Pool API functions
const PoolAPI = {
  // Get all pools
  async getAllPools() {
    return apiRequest('/pools');
  },

  // Get a specific pool
  async getPool(poolId) {
    return apiRequest(`/pools/${poolId}`);
  },

  // Create a new pool
  async createPool(poolData) {
    return apiRequest('/pools', 'POST', poolData);
  },

  // Join a pool
  async joinPool(poolId, userData) {
    return apiRequest(`/pools/${poolId}/join`, 'POST', userData);
  },

  // Declare a winner
  async declareWinner(poolId, winnerEmail) {
    return apiRequest(`/pools/${poolId}/winner`, 'POST', { winnerEmail });
  }
};

// Payment API functions
const PaymentAPI = {
  // Create a payment intent
  async createPaymentIntent(poolId, email) {
    return apiRequest('/payments/create-intent', 'POST', { poolId, email });
  }
};

// Transaction API functions (admin only)
const TransactionAPI = {
  // Get all transactions
  async getAllTransactions() {
    return apiRequest('/transactions');
  }
};

// Initialize Stripe with a payment intent
async function initializeStripe(poolId, email) {
  try {
    // Create a payment intent on the server
    const { clientSecret, amount } = await PaymentAPI.createPaymentIntent(poolId, email);
    
    // Get Stripe publishable key - In a real app, this would be provided by the server
    const stripe = Stripe('pk_test_TYooMQauvdEDq54NiTphI7jx');
    
    // Create Stripe Elements instance
    const elements = stripe.elements();
    
    // Create a card Element and mount it
    const cardElement = elements.create('card', {
      style: {
        base: {
          fontSize: '16px',
          color: '#32325d',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          '::placeholder': {
            color: '#aab7c4'
          },
        },
        invalid: {
          color: '#fa755a',
          iconColor: '#fa755a'
        }
      }
    });
    
    cardElement.mount('#card-element');
    
    // Return everything needed for payment processing
    return {
      stripe,
      elements,
      cardElement,
      clientSecret,
      amount
    };
  } catch (error) {
    console.error('Error initializing Stripe:', error);
    throw error;
  }
}

// Process payment with Stripe
async function processPayment(stripe, cardElement, clientSecret) {
  try {
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: document.getElementById('name').value,
          email: document.getElementById('email').value
        }
      }
    });
    
    if (result.error) {
      // Show error to customer
      throw new Error(result.error.message);
    } else if (result.paymentIntent.status === 'succeeded') {
      // Payment succeeded
      return result.paymentIntent;
    }
  } catch (error) {
    console.error('Error processing payment:', error);
    throw error;
  }
}

// Export the API functions for use in other JS files
window.PoolAPI = PoolAPI;
window.PaymentAPI = PaymentAPI;
window.TransactionAPI = TransactionAPI;
window.initializeStripe = initializeStripe;
window.processPayment = processPayment; 