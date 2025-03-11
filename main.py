from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, HTMLResponse
import yfinance as yf
import os
import pandas as pd
import numpy as np
import logging
import asyncio
from typing import Optional, Dict, Any, List
import json
import ta
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
import io
import base64
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

load_dotenv = lambda: None
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    logger.warning("python-dotenv not installed, skipping .env loading")

app = FastAPI(title="Algo Trading Hustler API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files directory
app.mount("/static", StaticFiles(directory="static"), name="static")

# Root redirect to dashboard
@app.get("/")
async def root():
    return RedirectResponse(url="/static/index.html")

# Custom algorithm model
class Algorithm(BaseModel):
    name: str
    code: str
    description: Optional[str] = None

# In-memory storage for custom algorithms
custom_algorithms: Dict[str, Algorithm] = {}

# Technical indicators functions
def calculate_rsi(prices, window=14):
    """Calculate RSI"""
    return ta.momentum.RSIIndicator(close=prices, window=window).rsi()

def calculate_macd(prices):
    """Calculate MACD"""
    macd_indicator = ta.trend.MACD(close=prices)
    return macd_indicator.macd(), macd_indicator.macd_signal(), macd_indicator.macd_diff()

def calculate_bollinger_bands(prices, window=20, window_dev=2):
    """Calculate Bollinger Bands"""
    indicator_bb = ta.volatility.BollingerBands(close=prices, window=window, window_dev=window_dev)
    return indicator_bb.bollinger_hband(), indicator_bb.bollinger_mavg(), indicator_bb.bollinger_lband()

def calculate_stochastic(high, low, close, window=14, smooth_window=3):
    """Calculate Stochastic Oscillator"""
    stoch = ta.momentum.StochasticOscillator(high=high, low=low, close=close, window=window, smooth_window=smooth_window)
    return stoch.stoch(), stoch.stoch_signal()

def calculate_sma(prices, window=20):
    """Calculate Simple Moving Average"""
    return ta.trend.SMAIndicator(close=prices, window=window).sma_indicator()

def calculate_ema(prices, window=20):
    """Calculate Exponential Moving Average"""
    return ta.trend.EMAIndicator(close=prices, window=window).ema_indicator()

def detect_candlestick_patterns(data):
    """Detect candlestick patterns in the data"""
    patterns = {
        'doji': [],
        'hammer': [],
        'engulfing': [],
        'threewhitesoldiers': [],
        'threeblackcrows': [],
        'morningstar': [],
        'eveningstar': []
    }
    
    for i in range(2, len(data)):
        current = data.iloc[i]
        prev = data.iloc[i-1]
        prev_prev = data.iloc[i-2] if i >= 2 else None
        
        # Doji pattern (open and close are very close)
        if abs(current['Open'] - current['Close']) < 0.1 * (current['High'] - current['Low']):
            patterns['doji'].append(i)
        
        # Hammer pattern (small body at the top, long lower shadow)
        body_size = abs(current['Open'] - current['Close'])
        lower_shadow = min(current['Open'], current['Close']) - current['Low']
        upper_shadow = current['High'] - max(current['Open'], current['Close'])
        
        if (body_size < 0.3 * (current['High'] - current['Low']) and 
            lower_shadow > 2 * body_size and 
            upper_shadow < 0.1 * (current['High'] - current['Low'])):
            patterns['hammer'].append(i)
        
        # Bullish engulfing
        if (prev['Close'] < prev['Open'] and  # Previous candle is bearish
            current['Close'] > current['Open'] and  # Current candle is bullish
            current['Open'] < prev['Close'] and 
            current['Close'] > prev['Open']):
            patterns['engulfing'].append(i)
        
        # Three white soldiers (three consecutive bullish candles)
        if (i >= 4 and 
            data.iloc[i-2]['Close'] > data.iloc[i-2]['Open'] and 
            data.iloc[i-1]['Close'] > data.iloc[i-1]['Open'] and 
            current['Close'] > current['Open'] and
            data.iloc[i-2]['Close'] < data.iloc[i-1]['Open'] and
            data.iloc[i-1]['Close'] < current['Open']):
            patterns['threewhitesoldiers'].append(i)
        
        # Three black crows (three consecutive bearish candles)
        if (i >= 4 and 
            data.iloc[i-2]['Close'] < data.iloc[i-2]['Open'] and 
            data.iloc[i-1]['Close'] < data.iloc[i-1]['Open'] and 
            current['Close'] < current['Open'] and
            data.iloc[i-2]['Close'] > data.iloc[i-1]['Open'] and
            data.iloc[i-1]['Close'] > current['Open']):
            patterns['threeblackcrows'].append(i)
        
        # Morning star pattern
        if (i >= 3 and
            prev_prev['Close'] < prev_prev['Open'] and  # First candle is bearish
            abs(prev['Open'] - prev['Close']) < 0.3 * (prev['High'] - prev['Low']) and  # Second candle is small
            current['Close'] > current['Open'] and  # Third candle is bullish
            current['Close'] > (prev_prev['Open'] + prev_prev['Close']) / 2):  # Retraces at least 50% of first candle
            patterns['morningstar'].append(i)
        
        # Evening star pattern
        if (i >= 3 and
            prev_prev['Close'] > prev_prev['Open'] and  # First candle is bullish
            abs(prev['Open'] - prev['Close']) < 0.3 * (prev['High'] - prev['Low']) and  # Second candle is small
            current['Close'] < current['Open'] and  # Third candle is bearish
            current['Close'] < (prev_prev['Open'] + prev_prev['Close']) / 2):  # Retraces at least 50% of first candle
            patterns['eveningstar'].append(i)
    
    return patterns

@app.get("/api/stock/{symbol}")
def get_stock_data(symbol: str, interval: str = "5m", period: str = "1d"):
    try:
        # Map interval to Yahoo Finance format
        interval_map = {
            "1min": "1m",
            "5min": "5m",
            "15min": "15m",
            "30min": "30m",
            "60min": "1h"
        }
        
        # Use the mapped interval or default to 5m
        yf_interval = interval_map.get(interval, interval)
        
        # Get stock data from Yahoo Finance
        ticker = yf.Ticker(symbol)
        data = ticker.history(period=period, interval=yf_interval)
        
        if data.empty:
            raise HTTPException(status_code=404, detail=f"No data found for symbol {symbol}")
        
        # Process data
        processed_data = data.copy()
        processed_data.reset_index(inplace=True)
        processed_data['timestamp'] = processed_data['Datetime'].astype(str)
        
        # Calculate indicators
        close_prices = processed_data['Close']
        high_prices = processed_data['High']
        low_prices = processed_data['Low']
        
        # RSI
        rsi = calculate_rsi(close_prices)
        
        # MACD
        macd, signal, hist = calculate_macd(close_prices)
        
        # Moving Averages
        sma20 = calculate_sma(close_prices, window=20)
        sma50 = calculate_sma(close_prices, window=50)
        ema20 = calculate_ema(close_prices, window=20)
        ema50 = calculate_ema(close_prices, window=50)
        
        # Bollinger Bands
        upper, middle, lower = calculate_bollinger_bands(close_prices)
        
        # Stochastic Oscillator
        k, d = calculate_stochastic(high_prices, low_prices, close_prices)
        
        # Detect candlestick patterns
        patterns = detect_candlestick_patterns(processed_data)
        
        # Convert DataFrame to dict for JSON response
        records = []
        for i, row in processed_data.iterrows():
            record = {
                'timestamp': row['timestamp'],
                'open': float(row['Open']),
                'high': float(row['High']),
                'low': float(row['Low']),
                'close': float(row['Close']),
                'volume': float(row['Volume'])
            }
            records.append(record)
        
        # Prepare response
        return {
            'symbol': symbol,
            'interval': interval,
            'data': records,
            'indicators': {
                'RSI': rsi.dropna().tolist(),
                'MACD': {
                    'MACD': macd.dropna().tolist(),
                    'Signal': signal.dropna().tolist(),
                    'Histogram': hist.dropna().tolist()
                },
                'MovingAverages': {
                    'SMA20': sma20.dropna().tolist(),
                    'SMA50': sma50.dropna().tolist(),
                    'EMA20': ema20.dropna().tolist(),
                    'EMA50': ema50.dropna().tolist()
                },
                'BollingerBands': {
                    'Upper': upper.dropna().tolist(),
                    'Middle': middle.dropna().tolist(),
                    'Lower': lower.dropna().tolist()
                },
                'Stochastic': {
                    'K': k.dropna().tolist(),
                    'D': d.dropna().tolist()
                },
                'CandlestickPatterns': patterns
            }
        }
    
    except Exception as e:
        logger.error(f"Error fetching data for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching data: {str(e)}")

@app.websocket('/ws/stock/{symbol}')
async def websocket_stock_data(websocket: WebSocket, symbol: str):
    await websocket.accept()
    try:
        while True:
            # Get latest data
            ticker = yf.Ticker(symbol)
            data = ticker.history(period="1d", interval="1m").iloc[-1]
            
            # Format data
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            message = {
                "symbol": symbol,
                "timestamp": timestamp,
                "open": float(data['Open']),
                "high": float(data['High']),
                "low": float(data['Low']),
                "close": float(data['Close']),
                "volume": float(data['Volume'])
            }
            
            # Send data
            await websocket.send_text(json.dumps(message))
            
            # Wait before next update
            await asyncio.sleep(5)
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
    finally:
        try:
            await websocket.close()
        except:
            pass

# Custom Algorithm API endpoints
@app.post("/api/algorithms/")
async def create_algorithm(algorithm: Algorithm):
    """Create a new custom trading algorithm"""
    custom_algorithms[algorithm.name] = algorithm
    return {"message": f"Algorithm '{algorithm.name}' created successfully"}

@app.get("/api/algorithms/")
async def list_algorithms():
    """List all custom trading algorithms"""
    return list(custom_algorithms.values())

@app.get("/api/algorithms/{name}")
async def get_algorithm(name: str):
    """Get a specific custom trading algorithm"""
    if name not in custom_algorithms:
        raise HTTPException(status_code=404, detail=f"Algorithm '{name}' not found")
    return custom_algorithms[name]

@app.put("/api/algorithms/{name}")
async def update_algorithm(name: str, algorithm: Algorithm):
    """Update a custom trading algorithm"""
    if name not in custom_algorithms:
        raise HTTPException(status_code=404, detail=f"Algorithm '{name}' not found")
    custom_algorithms[name] = algorithm
    return {"message": f"Algorithm '{name}' updated successfully"}

@app.delete("/api/algorithms/{name}")
async def delete_algorithm(name: str):
    """Delete a custom trading algorithm"""
    if name not in custom_algorithms:
        raise HTTPException(status_code=404, detail=f"Algorithm '{name}' not found")
    del custom_algorithms[name]
    return {"message": f"Algorithm '{name}' deleted successfully"}

class BacktestRequest(BaseModel):
    symbol: str
    algorithm_name: str
    start_date: str
    end_date: str
    initial_capital: float = 10000.0

@app.post("/api/backtest/")
async def backtest_algorithm(request: BacktestRequest):
    """Backtest a custom trading algorithm"""
    # Check if algorithm exists
    if request.algorithm_name not in custom_algorithms:
        raise HTTPException(status_code=404, detail=f"Algorithm '{request.algorithm_name}' not found")
    
    algorithm = custom_algorithms[request.algorithm_name]
    
    try:
        # Get historical data
        ticker = yf.Ticker(request.symbol)
        data = ticker.history(start=request.start_date, end=request.end_date)
        
        if data.empty:
            raise HTTPException(status_code=404, detail=f"No data found for symbol {request.symbol}")
        
        # Prepare data for backtesting
        df = data.copy()
        df.reset_index(inplace=True)
        
        # Add technical indicators
        df['RSI'] = calculate_rsi(df['Close'])
        macd, signal, hist = calculate_macd(df['Close'])
        df['MACD'] = macd
        df['MACD_Signal'] = signal
        df['MACD_Hist'] = hist
        
        upper, middle, lower = calculate_bollinger_bands(df['Close'])
        df['BB_Upper'] = upper
        df['BB_Middle'] = middle
        df['BB_Lower'] = lower
        
        k, d = calculate_stochastic(df['High'], df['Low'], df['Close'])
        df['Stoch_K'] = k
        df['Stoch_D'] = d
        
        df['SMA20'] = calculate_sma(df['Close'], 20)
        df['SMA50'] = calculate_sma(df['Close'], 50)
        df['EMA20'] = calculate_ema(df['Close'], 20)
        df['EMA50'] = calculate_ema(df['Close'], 50)
        
        # Execute algorithm code (safely)
        # Note: In a production environment, you would want to use a sandbox
        # for executing user code to prevent security issues
        
        # For now, we'll use a simple example algorithm
        positions = []
        cash = request.initial_capital
        shares = 0
        
        # Simple moving average crossover strategy as a placeholder
        for i in range(1, len(df)):
            if df['SMA20'].iloc[i] > df['SMA50'].iloc[i] and df['SMA20'].iloc[i-1] <= df['SMA50'].iloc[i-1]:
                # Buy signal
                if cash > 0:
                    shares = cash / df['Close'].iloc[i]
                    cash = 0
                    positions.append({
                        'date': df['Datetime'].iloc[i].strftime('%Y-%m-%d'),
                        'action': 'BUY',
                        'price': float(df['Close'].iloc[i]),
                        'shares': float(shares),
                        'value': float(shares * df['Close'].iloc[i])
                    })
            
            elif df['SMA20'].iloc[i] < df['SMA50'].iloc[i] and df['SMA20'].iloc[i-1] >= df['SMA50'].iloc[i-1]:
                # Sell signal
                if shares > 0:
                    cash = shares * df['Close'].iloc[i]
                    positions.append({
                        'date': df['Datetime'].iloc[i].strftime('%Y-%m-%d'),
                        'action': 'SELL',
                        'price': float(df['Close'].iloc[i]),
                        'shares': float(shares),
                        'value': float(cash)
                    })
                    shares = 0
        
        # Calculate final portfolio value
        final_value = cash + (shares * df['Close'].iloc[-1])
        
        # Calculate performance metrics
        initial_value = request.initial_capital
        total_return = (final_value - initial_value) / initial_value * 100
        
        # Generate performance chart
        plt.figure(figsize=(10, 6))
        plt.plot(df['Datetime'], df['Close'])
        
        # Mark buy and sell points
        buy_dates = [pos['date'] for pos in positions if pos['action'] == 'BUY']
        buy_prices = [pos['price'] for pos in positions if pos['action'] == 'BUY']
        sell_dates = [pos['date'] for pos in positions if pos['action'] == 'SELL']
        sell_prices = [pos['price'] for pos in positions if pos['action'] == 'SELL']
        
        plt.scatter(buy_dates, buy_prices, color='green', marker='^', s=100)
        plt.scatter(sell_dates, sell_prices, color='red', marker='v', s=100)
        
        plt.title(f"Backtest Results for {request.symbol}")
        plt.xlabel("Date")
        plt.ylabel("Price")
        plt.grid(True)
        
        # Convert plot to base64 image
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        buf.seek(0)
        plot_base64 = base64.b64encode(buf.read()).decode('utf-8')
        
        return {
            "symbol": request.symbol,
            "algorithm": request.algorithm_name,
            "start_date": request.start_date,
            "end_date": request.end_date,
            "initial_capital": request.initial_capital,
            "final_value": float(final_value),
            "total_return": float(total_return),
            "positions": positions,
            "performance_chart": plot_base64
        }
    
    except Exception as e:
        logger.error(f"Backtest error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Backtest error: {str(e)}")

if __name__ == '__main__':
    import uvicorn
    import socket
    
    # Try different ports if default is in use
    port = 8000
    max_port = 8010  # Try up to this port
    
    while port <= max_port:
        try:
            # Test if port is available
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.bind(('0.0.0.0', port))
            sock.close()
            logger.info(f"Starting server on port {port}")
            break
        except OSError as e:
            logger.warning(f"Port {port} is in use or cannot be bound: {e}")
            port += 1
    
    if port > max_port:
        logger.error("No available ports found. Please close some applications and try again.")
    else:
        try:
            # Run with host as 127.0.0.1 instead of 0.0.0.0 to avoid potential firewall issues
            uvicorn.run(app, host='127.0.0.1', port=port)
        except Exception as e:
            logger.error(f"Failed to start server: {e}")
