# Algo Trading Hustler

A professional algorithmic trading dashboard with real-time stock data, technical indicators, and strategy configuration.

## Features

- **Real-time Stock Data**: Fetches intraday stock data from Alpha Vantage API
- **Technical Indicators**: 
  - RSI (Relative Strength Index)
  - MACD (Moving Average Convergence Divergence)
  - Bollinger Bands
  - Stochastic Oscillator
- **Interactive Charts**: Visualize price, volume, and indicators
- **Dark/Light Mode**: Toggle between dark and light themes
- **Trading Strategy Configuration**: Configure and test different trading strategies
- **WebSocket Updates**: Real-time data updates via WebSocket connection

## Quick Start

### Prerequisites

- Python 3.7+
- Alpha Vantage API Key (stored in `.env` file)

### Installation

1. Clone the repository
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Running the Application

1. Ensure your virtual environment is activated
2. Start the server:
   ```bash
   python main.py
   ```
3. Open your browser and navigate to:
   ```
   http://localhost:8000
   ```

## API Endpoints

- `GET /api/stock/{symbol}`: Get stock data and indicators for a specific symbol
- `WebSocket /ws/stock/{symbol}`: Real-time updates for a specific symbol

## Frontend Options

### Option 1: Simple Dashboard (No additional installation required)

The application comes with a built-in dashboard accessible at `http://localhost:8000`. This dashboard includes:
- Price and volume charts
- Technical indicators (RSI, MACD, Bollinger Bands)
- Dark/light mode toggle
- Symbol selection

### Option 2: React Dashboard (Requires Node.js)

For a more advanced experience with the React frontend:

1. Install Node.js from https://nodejs.org/
2. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the React development server:
   ```bash
   npm start
   ```
5. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Troubleshooting

- **Port already in use**: The server will automatically try ports 8000-8010 if the default port is in use
- **API Key issues**: Ensure your Alpha Vantage API key is correctly set in the `.env` file
- **Connection errors**: Check that both the backend server and frontend (if using React) are running

## License

This project is licensed under the MIT License.
