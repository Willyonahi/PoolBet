// PoolBet Application Logic

document.addEventListener('DOMContentLoaded', () => {
    // Initialize the application
    loadPools();
    
    // Set up event listeners
    const poolForm = document.getElementById('poolForm');
    poolForm.addEventListener('submit', createPool);
});

// Create a new betting pool
async function createPool(event) {
    event.preventDefault();
    
    const poolName = document.getElementById('poolName').value;
    const betAmount = parseFloat(document.getElementById('betAmount').value);
    const participantsText = document.getElementById('participants').value;
    const eventDescription = document.getElementById('eventDescription').value;
    const endDate = document.getElementById('endDate').value;
    
    // Parse participants (emails)
    const participants = participantsText
        .split(',')
        .map(email => email.trim())
        .filter(email => email !== '');
    
    try {
        // Create pool data object
        const poolData = {
            name: poolName,
            betAmount,
            participants,
            eventDescription,
            endDate
        };
        
        // Create pool via API
        const newPool = await PoolAPI.createPool(poolData);
        
        // Update the UI
        await loadPools();
        
        // Reset the form
        poolForm.reset();
        
        // Show confirmation message
        showNotification(`Pool "${poolName}" created successfully!`);
    } catch (error) {
        console.error('Error creating pool:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// Load pools from API and render them
async function loadPools() {
    try {
        const pools = await PoolAPI.getAllPools();
        renderPools(pools);
    } catch (error) {
        console.error('Error loading pools:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// Render pools to the UI
function renderPools(pools) {
    const activePoolsContainer = document.getElementById('activePools');
    
    // Clear current content
    activePoolsContainer.innerHTML = '';
    
    if (pools.length === 0) {
        activePoolsContainer.innerHTML = '<p class="text-center text-gray-500">No active pools yet. Create one above!</p>';
        return;
    }
    
    // Sort pools by creation date (newest first)
    const sortedPools = [...pools].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    // Create and append pool cards
    sortedPools.forEach(pool => {
        const poolCard = document.createElement('div');
        poolCard.className = 'pool-card bg-white border rounded-lg shadow-sm p-4 hover:shadow-md';
        
        const endDate = new Date(pool.endDate);
        const formattedDate = endDate.toLocaleDateString();
        
        poolCard.innerHTML = `
            <div class="flex justify-between items-start">
                <h3 class="text-xl font-bold text-blue-600">${pool.name}</h3>
                <span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">$${pool.totalAmount} Pool</span>
            </div>
            <p class="mt-2 text-gray-600">${pool.eventDescription}</p>
            <div class="mt-3 flex justify-between items-center text-sm">
                <span class="text-gray-500">${pool.participants.length} participants</span>
                <span class="text-gray-500">Ends: ${formattedDate}</span>
            </div>
            <div class="mt-1 flex justify-between items-center text-sm">
                <span class="text-gray-500">Winner gets: $${pool.winnerAmount.toFixed(2)}</span>
                <span class="text-gray-500">Fee: ${pool.feePercentage}%</span>
            </div>
            <div class="mt-4 flex justify-between">
                <button class="join-btn text-blue-600 border border-blue-600 px-3 py-1 rounded hover:bg-blue-50" 
                        data-pool-id="${pool.id}">Join Pool</button>
                <button class="details-btn bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                        data-pool-id="${pool.id}">View Details</button>
            </div>
        `;
        
        // Append the card
        activePoolsContainer.appendChild(poolCard);
        
        // Add event listeners to the buttons
        poolCard.querySelector('.join-btn').addEventListener('click', () => joinPool(pool.id));
        poolCard.querySelector('.details-btn').addEventListener('click', () => viewPoolDetails(pool.id));
    });
}

// Handle joining a pool
function joinPool(poolId) {
    // Redirect to the join pool page with the pool ID
    window.location.href = `join-pool.html?id=${poolId}`;
}

// View pool details
function viewPoolDetails(poolId) {
    // Redirect to the pool details page with the pool ID
    window.location.href = `pool-details.html?id=${poolId}`;
}

// Show notification message
function showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    
    // Set appropriate styling based on type
    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
    notification.className = `fixed top-4 right-4 ${bgColor} text-white px-4 py-2 rounded shadow-lg fade-in`;
    notification.textContent = message;
    
    // Add to the DOM
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }, 3000);
} 