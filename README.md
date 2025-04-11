# PoolBet

A platform for friends to create betting pools where everyone contributes money, and one winner takes all. The platform charges a 10% fee on all pools.

## Features

- Create custom betting pools with customizable details
- Specify participants by email
- Set bet amount and end date
- Integrated Stripe payment processing
- 10% platform fee on all pools
- Track active pools and declare winners

## Server Setup

To run the PoolBet server:

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file based on the provided `.env` example:
   - Replace the Stripe API keys with your own
   - Adjust other settings as needed
4. Start the server:
   ```
   npm start
   ```
   
   For development with auto-reload:
   ```
   npm run dev
   ```
5. The server will run at http://localhost:3000

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/pools` | GET | Get all pools |
| `/api/pools` | POST | Create a new pool |
| `/api/pools/:id` | GET | Get a specific pool |
| `/api/pools/:id/join` | POST | Join a pool |
| `/api/pools/:id/winner` | POST | Declare a winner |
| `/api/payments/create-intent` | POST | Create a Stripe payment intent |
| `/api/payments/webhook` | POST | Handle Stripe webhook |
| `/api/transactions` | GET | Get all transactions (admin) |

## Frontend

The frontend is built with HTML, CSS, and JavaScript. It will automatically connect to the server if running on the default port.

To use the frontend:

1. Ensure the server is running
2. Open `index.html` in a web browser

## Stripe Integration

This application integrates with Stripe for payment processing:

1. Users enter payment information securely using Stripe Elements
2. Payment intents are created on the server
3. Payments are processed through Stripe
4. 10% platform fee is automatically calculated and applied

## Development

For development:

1. Run the server in dev mode: `npm run dev`
2. Make changes to the server or frontend files
3. The server will automatically restart when changes are detected

## Deployment

For production deployment:

1. Set up a proper database (MongoDB recommended)
2. Configure environment variables for production
3. Deploy to a hosting service like Heroku, AWS, or DigitalOcean
4. Set up Stripe webhook endpoints

## License

MIT 