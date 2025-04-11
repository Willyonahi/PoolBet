// PoolBet - Pool Details Functionality

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
        displayPoolDetails(pool);
        
        // Set up event listeners
        setupEventListeners(pool);
    } catch (error) {
        console.error('Error loading pool:', error);
        alert('Error loading pool: ' + error.message);
        window.location.href = 'index.html';
    }
});

// Display pool details
function displayPoolDetails(pool) {
    // Update pool header
    const poolHeader = document.getElementById('poolHeader');
    poolHeader.innerHTML = `
        <h2 class="text-2xl font-bold mb-2">${pool.name}</h2>
        <p class="text-gray-700">${pool.eventDescription}</p>
    `;
    
    // Update stats
    document.getElementById('totalPool').textContent = `$${pool.totalAmount.toFixed(2)}`;
    document.getElementById('participantCount').textContent = pool.participants.length;
    document.getElementById('joinedCount').textContent = `${pool.participantsJoined.length} have joined`;
    
    // Format and display dates
    const endDate = new Date(pool.endDate);
    document.getElementById('endDate').textContent = endDate.toLocaleDateString();
    
    // Calculate days remaining
    const today = new Date();
    const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    document.getElementById('daysRemaining').textContent = 
        daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Ended';
    
    // Show appropriate status section
    displayStatusSection(pool, daysRemaining, endDate);
    
    // Display participants
    displayParticipants(pool);
    
    // Check if admin panel should be displayed
    checkAdminStatus(pool, daysRemaining);
    
    // Add payout breakdown
    addPayoutBreakdown(pool);
}

// Add payout breakdown information
function addPayoutBreakdown(pool) {
    // Create a new section for payout breakdown after the status section
    const statusSection = document.getElementById('statusSection');
    const payoutSection = document.createElement('div');
    payoutSection.className = 'mb-8 bg-white border rounded-lg p-4';
    payoutSection.innerHTML = `
        <h3 class="text-lg font-medium mb-3">Payout Breakdown</h3>
        <div class="bg-blue-50 p-4 rounded-md">
            <div class="flex justify-between mb-2">
                <span>Total Pool Amount:</span>
                <span class="font-medium">$${pool.totalAmount.toFixed(2)}</span>
            </div>
            <div class="flex justify-between mb-2">
                <span>Platform Fee (${pool.feePercentage}%):</span>
                <span class="font-medium">$${pool.platformFee.toFixed(2)}</span>
            </div>
            <div class="flex justify-between pt-2 border-t border-blue-200">
                <span class="font-bold">Winner Payout:</span>
                <span class="font-bold">$${pool.winnerAmount.toFixed(2)}</span>
            </div>
        </div>
    `;
    
    // Insert after status section
    statusSection.parentNode.insertBefore(payoutSection, statusSection.nextSibling);
}

// Display the appropriate status section based on pool state
function displayStatusSection(pool, daysRemaining, endDate) {
    const statusSection = document.getElementById('statusSection');
    
    if (pool.winner) {
        // Pool has a winner
        const winner = pool.participantsJoined.find(p => p.email === pool.winner);
        const winnerName = winner ? winner.name : 'Unknown';
        
        statusSection.innerHTML = `
            <div class="bg-green-100 border-l-4 border-green-500 p-4 rounded">
                <div class="flex">
                    <div class="flex-shrink-0">
                        <svg class="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                        </svg>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm leading-5 font-medium text-green-800">
                            This pool has ended! The winner is: <strong>${winnerName}</strong>
                        </p>
                        <p class="text-sm leading-5 text-green-700 mt-1">
                            Winner receives: $${pool.winnerAmount.toFixed(2)} (after ${pool.feePercentage}% platform fee)
                        </p>
                    </div>
                </div>
            </div>
        `;
    } else if (daysRemaining <= 0) {
        // Pool has ended but no winner declared
        statusSection.innerHTML = `
            <div class="bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded">
                <div class="flex">
                    <div class="flex-shrink-0">
                        <svg class="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                        </svg>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm leading-5 font-medium text-yellow-800">
                            This pool has ended, but a winner has not been declared yet.
                        </p>
                        <p class="text-sm leading-5 text-yellow-700 mt-1">
                            The pool creator will declare a winner soon.
                        </p>
                    </div>
                </div>
            </div>
        `;
    } else {
        // Pool is active
        const allJoined = pool.participantsJoined.length === pool.participants.length;
        
        if (allJoined) {
            statusSection.innerHTML = `
                <div class="bg-blue-100 border-l-4 border-blue-500 p-4 rounded">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <svg class="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
                            </svg>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm leading-5 font-medium text-blue-800">
                                All participants have joined! The pool is active.
                            </p>
                            <p class="text-sm leading-5 text-blue-700 mt-1">
                                The winner will be declared after ${endDate.toLocaleDateString()}.
                            </p>
                        </div>
                    </div>
                </div>
            `;
        } else {
            statusSection.innerHTML = `
                <div class="bg-blue-100 border-l-4 border-blue-500 p-4 rounded">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <svg class="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
                            </svg>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm leading-5 font-medium text-blue-800">
                                This pool is active and waiting for participants to join.
                            </p>
                            <p class="text-sm leading-5 text-blue-700 mt-1">
                                ${pool.participantsJoined.length} of ${pool.participants.length} participants have joined.
                            </p>
                        </div>
                    </div>
                </div>
            `;
        }
    }
}

// Display participants list
function displayParticipants(pool) {
    const participantsList = document.getElementById('participantsList');
    participantsList.innerHTML = '';
    
    if (pool.participants.length === 0) {
        participantsList.innerHTML = '<p class="text-gray-500">No participants yet.</p>';
        return;
    }
    
    // Create a list item for each participant
    pool.participants.forEach(email => {
        const hasJoined = pool.participantsJoined.some(p => p.email === email);
        const joinedParticipant = pool.participantsJoined.find(p => p.email === email);
        const isWinner = pool.winner === email;
        
        const listItem = document.createElement('div');
        listItem.className = `flex items-center justify-between p-3 border rounded ${isWinner ? 'bg-green-50 border-green-200' : (hasJoined ? 'bg-gray-50' : 'bg-white')}`;
        
        let displayName = email;
        if (joinedParticipant) {
            displayName = joinedParticipant.name;
        }
        
        listItem.innerHTML = `
            <div class="flex items-center">
                <div class="w-2 h-2 rounded-full ${hasJoined ? 'bg-green-500' : 'bg-gray-300'} mr-3"></div>
                <div>
                    <p class="font-medium">${displayName}</p>
                    <p class="text-sm text-gray-500">${email}</p>
                </div>
            </div>
            <div>
                ${isWinner ? '<span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Winner!</span>' : ''}
                ${hasJoined ? '<span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">Joined</span>' : '<span class="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">Pending</span>'}
            </div>
        `;
        
        participantsList.appendChild(listItem);
    });
}

// Check if the admin panel should be displayed
function checkAdminStatus(pool, daysRemaining) {
    const adminSection = document.getElementById('adminSection');
    const winnerForm = document.getElementById('winnerForm');
    const winnerSelect = document.getElementById('winnerSelect');
    
    // For demo purposes, we'll always show the admin panel
    // In a real app, you would check if the current user is the pool creator
    
    // Only show admin panel if pool has ended and no winner is declared
    if (daysRemaining <= 0 && !pool.winner) {
        adminSection.classList.remove('hidden');
        
        // Populate winner select dropdown
        winnerSelect.innerHTML = '<option value="">-- Select a winner --</option>';
        
        // Only show joined participants as possible winners
        pool.participantsJoined.forEach(participant => {
            const option = document.createElement('option');
            option.value = participant.email;
            option.textContent = `${participant.name} (${participant.email})`;
            winnerSelect.appendChild(option);
        });
    } else {
        adminSection.classList.add('hidden');
    }
}

// Set up event listeners
function setupEventListeners(pool) {
    // Share button
    const shareButton = document.getElementById('shareButton');
    shareButton.addEventListener('click', () => {
        const shareUrl = `${window.location.origin}/join-pool.html?id=${pool.id}`;
        
        if (navigator.share) {
            navigator.share({
                title: `Join my PoolBet: ${pool.name}`,
                text: `Join our betting pool "${pool.name}" on PoolBet. The bet is $${pool.betAmount}!`,
                url: shareUrl
            }).catch(error => {
                console.log('Error sharing:', error);
                prompt('Copy this link to share with your friends:', shareUrl);
            });
        } else {
            prompt('Copy this link to share with your friends:', shareUrl);
        }
    });
    
    // Winner form
    const winnerForm = document.getElementById('winnerForm');
    winnerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const winnerSelect = document.getElementById('winnerSelect');
        const winnerEmail = winnerSelect.value;
        
        if (!winnerEmail) {
            alert('Please select a winner.');
            return;
        }
        
        try {
            // Declare winner via API
            await PoolAPI.declareWinner(pool.id, winnerEmail);
            
            // Show success message and refresh
            alert('Winner has been declared!');
            window.location.reload();
        } catch (error) {
            console.error('Error declaring winner:', error);
            alert('Error declaring winner: ' + error.message);
        }
    });
} 