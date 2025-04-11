// PoolBet - Join Pool Functionality

let stripeInstance = null;
let cardElement = null;
let clientSecret = null;
let currentPool = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Get pool ID from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const poolId = urlParams.get('id');
    
    if (!poolId) {
        // No pool ID provided, redirect to home
        window.location.href = 'index.html';
        return;
    }
    
    try {
        // Load pool data from API
        const pool = await PoolAPI.getPool(poolId);
        currentPool = pool;
        
        // Display pool information
        displayPoolInfo(pool);
        
        // Set up event listeners
        const joinForm = document.getElementById('joinForm');
        joinForm.addEventListener('submit', handleJoinSubmit);
        
        // Set up email field change listener to initialize Stripe
        const emailField = document.getElementById('email');
        emailField.addEventListener('change', initializeStripeOnEmailChange);
    } catch (error) {
        console.error('Error loading pool:', error);
        alert('Error loading pool: ' + error.message);
        window.location.href = 'index.html';
    }
});

// Initialize Stripe when email is entered
async function initializeStripeOnEmailChange(event) {
    const email = event.target.value;
    if (!email || !currentPool) return;
    
    try {
        // Make sure the email is valid before initializing Stripe
        if (!email.includes('@')) return;
        
        const stripeData = await initializeStripe(currentPool.id, email);
        stripeInstance = stripeData.stripe;
        cardElement = stripeData.cardElement;
        clientSecret = stripeData.clientSecret;
        
        // Update payment breakdown display
        updatePaymentBreakdown(currentPool);
    } catch (error) {
        console.error('Error initializing Stripe:', error);
        // Don't show alert here as the user might just be typing
    }
}

// Initialize Stripe
function initializeStripe(poolId, email) {
    // In a real app, you would get this from your server
    // For demo purposes, we're using a test key
    const stripePublicKey = 'pk_test_TYooMQauvdEDq54NiTphI7jx';
    
    // Initialize Stripe.js
    const stripe = Stripe(stripePublicKey);
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
    
    // Handle real-time validation errors
    cardElement.on('change', (event) => {
        const displayError = document.getElementById('card-errors');
        if (event.error) {
            displayError.textContent = event.error.message;
        } else {
            displayError.textContent = '';
        }
    });
    
    // Update payment breakdown display
    updatePaymentBreakdown(currentPool);
    
    // Store the card element for later use
    window.cardElement = cardElement;
    window.stripe = stripe;
    
    return { stripe, cardElement, clientSecret };
}

// Update payment breakdown display
function updatePaymentBreakdown(pool) {
    const betAmount = document.getElementById('bet-amount-display');
    const platformFeeDisplay = document.getElementById('platform-fee-display');
    const totalAmountDisplay = document.getElementById('total-amount-display');
    
    // The bet amount is just the pool's bet amount
    betAmount.textContent = `$${pool.betAmount.toFixed(2)}`;
    
    // No additional fee is charged to participants
    // We just show the breakdown of where the money goes
    platformFeeDisplay.textContent = `$${(pool.betAmount * pool.feePercentage / 100).toFixed(2)}`;
    totalAmountDisplay.textContent = `$${pool.betAmount.toFixed(2)}`;
}

// Display pool information
function displayPoolInfo(pool) {
    const poolInfoElement = document.getElementById('poolInfo');
    const betAmountElement = document.getElementById('betAmount');
    
    // Format date
    const endDate = new Date(pool.endDate);
    const formattedDate = endDate.toLocaleDateString();
    
    // Update bet amount display
    betAmountElement.textContent = `$${pool.betAmount.toFixed(2)}`;
    
    // Create pool info HTML
    poolInfoElement.innerHTML = `
        <h3 class="text-xl font-bold text-blue-600 mb-2">${pool.name}</h3>
        <p class="text-gray-700 mb-4">${pool.eventDescription}</p>
        
        <div class="bg-blue-50 p-4 rounded-md mb-4">
            <div class="flex justify-between mb-2">
                <span class="text-sm text-gray-600">Total Pool:</span>
                <span class="font-medium">$${pool.totalAmount.toFixed(2)}</span>
            </div>
            <div class="flex justify-between mb-2">
                <span class="text-sm text-gray-600">Participants:</span>
                <span class="font-medium">${pool.participants.length}</span>
            </div>
            <div class="flex justify-between mb-2">
                <span class="text-sm text-gray-600">End Date:</span>
                <span class="font-medium">${formattedDate}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-sm text-gray-600">Winner Gets:</span>
                <span class="font-medium">$${pool.winnerAmount.toFixed(2)}</span>
            </div>
        </div>
        
        <p class="text-sm text-gray-500">This pool was created by ${createAnonymousName(pool.createdAt)}.</p>
    `;
}

// Create an anonymous name based on timestamp for demo purposes
function createAnonymousName(timestamp) {
    const date = new Date(timestamp);
    return 'User' + date.getTime().toString().substr(-4);
}

// Handle join form submission
async function handleJoinSubmit(event) {
    event.preventDefault();
    
    if (!currentPool) {
        alert('Pool data not loaded. Please refresh the page.');
        return;
    }
    
    const email = document.getElementById('email').value;
    const name = document.getElementById('name').value;
    
    // Check if required fields are filled
    if (!email || !name) {
        alert('Please fill out all required fields.');
        return;
    }
    
    // Check if Stripe is initialized
    if (!stripeInstance || !cardElement || !clientSecret) {
        alert('Payment system not initialized. Please check your email and try again.');
        return;
    }
    
    // Check if email is in the participants list
    if (!currentPool.participants.includes(email)) {
        alert('Sorry, this email address is not in the list of invited participants.');
        return;
    }
    
    // Check if user has already joined
    if (currentPool.participantsJoined.some(p => p.email === email)) {
        alert('You have already joined this pool.');
        return;
    }
    
    // Show processing message
    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = `
        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Processing Payment...
    `;
    
    try {
        // Process the payment with Stripe
        const paymentResult = await processPayment(stripeInstance, cardElement, clientSecret);
        
        if (paymentResult) {
            // Join the pool via API
            await PoolAPI.joinPool(currentPool.id, {
                email,
                name,
                paymentId: paymentResult.id
            });
            
            // Show success message and redirect
            alert('Success! Your payment has been processed and you have joined the pool.');
            window.location.href = `success.html?poolId=${currentPool.id}`;
        }
    } catch (error) {
        console.error('Payment or join error:', error);
        alert(`Error: ${error.message}`);
        
        // Reset button
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
    }
} 