import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  Container, 
  Paper, 
  Grid, 
  CssBaseline,
  ThemeProvider, 
  createTheme,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Tab,
  Tabs,
  Card,
  CardContent,
  CardHeader,
  Alert,
  Snackbar,
  Tooltip,
  Checkbox,
  ListSubheader
} from '@mui/material';
import {
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  ShowChart as ChartIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  CandlestickController,
  CandlestickElement,
  OhlcController,
  OhlcElement
} from 'chart.js';
import { annotationPlugin } from 'chartjs-plugin-annotation';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'chart.js-financial';
import { Line, Bar, Chart } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin,
  annotationPlugin,
  CandlestickController,
  CandlestickElement,
  OhlcController,
  OhlcElement
);
// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// Strategy configuration component
function StrategyConfig({ onApply }) {
  const [strategy, setStrategy] = useState('sma_crossover');
  const [params, setParams] = useState({
    fastPeriod: 9,
    slowPeriod: 21,
    rsiThreshold: 30,
    stopLoss: 2,
    takeProfit: 5
  });

  const handleChange = (e) => {
    setParams({
      ...params,
      [e.target.name]: parseFloat(e.target.value)
    });
  };

  const strategies = [
    { value: 'sma_crossover', label: 'SMA Crossover' },
    { value: 'rsi_oversold', label: 'RSI Oversold' },
    { value: 'macd_signal', label: 'MACD Signal Cross' },
    { value: 'bollinger_bounce', label: 'Bollinger Band Bounce' }
  ];

  return (
    <Card>
      <CardHeader title="Trading Strategy Configuration" />
      <CardContent>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Strategy</InputLabel>
              <Select
                value={strategy}
                label="Strategy"
                onChange={(e) => setStrategy(e.target.value)}
              >
                {strategies.map(s => (
                  <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Fast Period"
              type="number"
              name="fastPeriod"
              value={params.fastPeriod}
              onChange={handleChange}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Slow Period"
              type="number"
              name="slowPeriod"
              value={params.slowPeriod}
              onChange={handleChange}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="RSI Threshold"
              type="number"
              name="rsiThreshold"
              value={params.rsiThreshold}
              onChange={handleChange}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Stop Loss (%)"
              type="number"
              name="stopLoss"
              value={params.stopLoss}
              onChange={handleChange}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Take Profit (%)"
              type="number"
              name="takeProfit"
              value={params.takeProfit}
              onChange={handleChange}
            />
          </Grid>
          
          <Grid item xs={12}>
            <Button 
              variant="contained" 
              color="primary" 
              fullWidth
              onClick={() => onApply(strategy, params)}
            >
              Apply Strategy
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

// Add Monaco Editor options
const editorOptions = {
  selectOnLineNumbers: true,
  roundedSelection: false,
  readOnly: false,
  cursorStyle: 'line',
  automaticLayout: true,
  theme: 'vs-dark',
  language: 'python',
  minimap: { enabled: false }
};

// Add Monaco Editor component
function AlgorithmEditor({ code, onChange }) {
  return (
    <MonacoEditor
      height="500"
      language="python"
      theme="vs-dark"
      value={code}
      options={editorOptions}
      onChange={onChange}
    />
  );
}

function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [symbol, setSymbol] = useState('MSFT');
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [algorithmCode, setAlgorithmCode] = useState('');
  
  // Candlestick pattern and indicator states
  const [selectedPattern, setSelectedPattern] = useState('none');
  const [selectedIndicators, setSelectedIndicators] = useState({
    sma20: true,
    sma50: false,
    ema20: false,
    ema50: false,
    bollinger: false
  });
  const [candlestickData, setCandlestickData] = useState({
    labels: [],
    datasets: [{
      label: 'OHLC',
      data: []
    }]
  });
  const [buySignals, setBuySignals] = useState([]);
  const [sellSignals, setSellSignals] = useState([]);
  const chartRef = useRef(null);

  // Chart data states
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        label: 'Price',
        data: [],
        borderColor: '#4e79a7',
        yAxisID: 'price'
      },
      {
        label: 'Volume',
        data: [],
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return null;
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(89, 161, 79, 0.5)');
          gradient.addColorStop(1, 'rgba(89, 161, 79, 0.1)');
          return gradient;
        },
        type: 'bar',
        yAxisID: 'volume'
      }
    ]
  });

  const [rsiData, setRsiData] = useState({
    labels: [],
    datasets: [{
      label: 'RSI',
      data: [],
      borderColor: '#e15759',
      fill: false
    }]
  });

  const [macdData, setMacdData] = useState({
    labels: [],
    datasets: [
      {
        label: 'MACD',
        data: [],
        borderColor: '#76b7b2',
        type: 'line'
      },
      {
        label: 'Signal',
        data: [],
        borderColor: '#f28e2b',
        type: 'line'
      },
      {
        label: 'Histogram',
        data: [],
        backgroundColor: (context) => {
          const value = context.raw;
          return value >= 0 ? 'rgba(75, 192, 192, 0.5)' : 'rgba(255, 99, 132, 0.5)';
        },
        type: 'bar'
      }
    ]
  });

  const [bollingerData, setBolingerData] = useState({
    labels: [],
    datasets: [
      {
        label: 'Price',
        data: [],
        borderColor: '#4e79a7',
        type: 'line'
      },
      {
        label: 'Upper Band',
        data: [],
        borderColor: 'rgba(255, 99, 132, 0.8)',
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        fill: '+1',
        type: 'line'
      },
      {
        label: 'Middle Band',
        data: [],
        borderColor: 'rgba(54, 162, 235, 0.8)',
        type: 'line'
      },
      {
        label: 'Lower Band',
        data: [],
        borderColor: 'rgba(75, 192, 192, 0.8)',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        fill: '-1',
        type: 'line'
      }
    ]
  });

  // Create theme based on dark mode preference
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? 'dark' : 'light',
          primary: {
            main: darkMode ? '#90caf9' : '#1976d2',
          },
          secondary: {
            main: darkMode ? '#f48fb1' : '#dc004e',
          },
          background: {
            default: darkMode ? '#303030' : '#f5f5f5',
            paper: darkMode ? '#424242' : '#ffffff',
          },
        },
      }),
    [darkMode],
  );

  // Handle pattern change
  const handlePatternChange = (event) => {
    setSelectedPattern(event.target.value);
    // Re-generate signals with the new pattern
    fetchData(symbol);
  };

  // Handle indicator change
  const handleIndicatorChange = (event) => {
    setSelectedIndicators({
      ...selectedIndicators,
      [event.target.name]: event.target.checked
    });
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      zoom: {
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: 'xy'
        },
        pan: { enabled: true }
      },
      legend: { position: 'top' },
      annotation: {
        annotations: {
          ...buySignals.map((signal, index) => ({
            [`buy-${index}`]: {
              type: 'point',
              xValue: signal.x,
              yValue: signal.y,
              backgroundColor: 'rgba(75, 192, 192, 0.8)',
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 2,
              radius: 6,
              pointStyle: 'triangle',
              rotation: 0
            }
          })),
          ...sellSignals.map((signal, index) => ({
            [`sell-${index}`]: {
              type: 'point',
              xValue: signal.x,
              yValue: signal.y,
              backgroundColor: 'rgba(255, 99, 132, 0.8)',
              borderColor: 'rgba(255, 99, 132, 1)',
              borderWidth: 2,
              radius: 6,
              pointStyle: 'triangle',
              rotation: 180
            }
          }))
        }
      }
    },
    scales: {
      price: {
        type: 'linear',
        position: 'left',
        title: { display: true, text: 'Price' }
      },
      volume: {
        type: 'linear',
        position: 'right',
        grid: { display: false },
        title: { display: true, text: 'Volume' }
      }
    }
  };

  // Candlestick chart options
  const candlestickOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      zoom: {
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: 'xy'
        },
        pan: { enabled: true }
      },
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: function(context) {
            const point = context.raw;
            if (point) {
              return [
                `Open: ${point.o}`,
                `High: ${point.h}`,
                `Low: ${point.l}`,
                `Close: ${point.c}`
              ];
            }
          }
        }
      },
      annotation: {
        annotations: {
          ...buySignals.map((signal, index) => ({
            [`buy-${index}`]: {
              type: 'point',
              xValue: signal.x,
              yValue: signal.y,
              backgroundColor: 'rgba(75, 192, 192, 0.8)',
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 2,
              radius: 6,
              pointStyle: 'triangle',
              rotation: 0
            }
          })),
          ...sellSignals.map((signal, index) => ({
            [`sell-${index}`]: {
              type: 'point',
              xValue: signal.x,
              yValue: signal.y,
              backgroundColor: 'rgba(255, 99, 132, 0.8)',
              borderColor: 'rgba(255, 99, 132, 1)',
              borderWidth: 2,
              radius: 6,
              pointStyle: 'triangle',
              rotation: 180
            }
          }))
        }
      }
    },
    scales: {
      x: {
        type: 'category',
        ticks: {
          maxTicksLimit: 10
        }
      },
      y: {
        type: 'linear',
        position: 'left',
        title: { display: true, text: 'Price' }
      }
    }
  };

  const rsiOptions = {
    responsive: true,
    plugins: {
      annotation: {
        annotations: {
          line70: {
            type: 'line',
            yMin: 70,
            yMax: 70,
            borderColor: 'rgb(255, 99, 132)',
            borderWidth: 1
          },
          line30: {
            type: 'line',
            yMin: 30,
            yMax: 30,
            borderColor: 'rgb(75, 192, 192)',
            borderWidth: 1
          }
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 100
      }
    }
  };

  // Handle strategy application
  const handleApplyStrategy = (strategy, params) => {
    setNotification({
      open: true,
      message: `Applied ${strategy} strategy with parameters: Fast Period=${params.fastPeriod}, Slow Period=${params.slowPeriod}`,
      severity: 'success'
    });
    
    // In a real app, you would send this to the backend
    console.log('Applied strategy:', strategy, params);
  };

  // Handle symbol change
  const handleSymbolChange = (event) => {
    setSymbol(event.target.value);
  };

  // Handle refresh data
  const handleRefresh = () => {
    fetchData(symbol);
    setNotification({
      open: true,
      message: `Refreshed data for ${symbol}`,
      severity: 'info'
    });
  };

  // Close notification
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  // Fetch data function
  const fetchData = (stockSymbol) => {
    fetch(`http://localhost:8000/api/stock/${stockSymbol}`)
      .then(res => res.json())
      .then(data => {
        const timestamps = data.data.map(d => d.timestamp);
        const prices = data.data.map(d => d.close);
        const volumes = data.data.map(d => d.volume);
        
        // Prepare candlestick data
        const ohlcData = data.data.map(d => ({
          x: d.timestamp,
          o: d.open,
          h: d.high,
          l: d.low,
          c: d.close
        }));
        
        setCandlestickData({
          labels: timestamps,
          datasets: [{
            label: 'Price',
            data: ohlcData,
            borderColor: '#4e79a7',
            color: {
              up: 'rgba(75, 192, 192, 1)',
              down: 'rgba(255, 99, 132, 1)',
              unchanged: 'rgba(90, 90, 90, 1)',
            }
          }]
        });
        
        // Generate buy/sell signals based on selected pattern and strategy
        const signals = generateSignals(data.data, selectedPattern);
        setBuySignals(signals.buySignals);
        setSellSignals(signals.sellSignals);
        
        setChartData({
          labels: timestamps,
          datasets: [
            { ...chartData.datasets[0], data: prices },
            { ...chartData.datasets[1], data: volumes }
          ]
        });

        setRsiData({
          labels: timestamps,
          datasets: [{
            ...rsiData.datasets[0],
            data: data.indicators.RSI
          }]
        });

        setMacdData({
          labels: timestamps,
          datasets: [
            { ...macdData.datasets[0], data: data.indicators.MACD.MACD },
            { ...macdData.datasets[1], data: data.indicators.MACD.Signal },
            { ...macdData.datasets[2], data: data.indicators.MACD.Histogram }
          ]
        });

        setBolingerData({
          labels: timestamps,
          datasets: [
            { ...bollingerData.datasets[0], data: prices },
            { ...bollingerData.datasets[1], data: data.indicators.BollingerBands.Upper },
            { ...bollingerData.datasets[2], data: data.indicators.BollingerBands.Middle },
            { ...bollingerData.datasets[3], data: data.indicators.BollingerBands.Lower }
          ]
        });
      })
      .catch(err => {
        console.error("Error fetching data:", err);
        setNotification({
          open: true,
          message: `Error fetching data: ${err.message}`,
          severity: 'error'
        });
      });
  };

  // Function to generate buy/sell signals based on patterns
  const generateSignals = (data, pattern) => {
    const buySignals = [];
    const sellSignals = [];
    
    if (pattern === 'none') {
      return { buySignals, sellSignals };
    }
    
    for (let i = 2; i < data.length; i++) {
      const current = data[i];
      const prev = data[i-1];
      const prevPrev = data[i-2];
      
      // Detect patterns based on selection
      switch(pattern) {
        case 'doji':
          // Doji pattern (open and close are very close)
          if (Math.abs(current.open - current.close) < 0.1 * (current.high - current.low)) {
            if (current.close > prev.close) {
              buySignals.push({ x: current.timestamp, y: current.low * 0.99 });
            } else {
              sellSignals.push({ x: current.timestamp, y: current.high * 1.01 });
            }
          }
          break;
          
        case 'hammer':
          // Hammer pattern (small body at the top, long lower shadow)
          const bodySize = Math.abs(current.open - current.close);
          const lowerShadow = Math.min(current.open, current.close) - current.low;
          const upperShadow = current.high - Math.max(current.open, current.close);
          
          if (bodySize < 0.3 * (current.high - current.low) && 
              lowerShadow > 2 * bodySize && 
              upperShadow < 0.1 * (current.high - current.low)) {
            buySignals.push({ x: current.timestamp, y: current.low * 0.99 });
          }
          break;
          
        case 'engulfing':
          // Bullish engulfing
          if (prev.close < prev.open && // Previous candle is bearish
              current.close > current.open && // Current candle is bullish
              current.open < prev.close && 
              current.close > prev.open) {
            buySignals.push({ x: current.timestamp, y: current.low * 0.99 });
          }
          // Bearish engulfing
          else if (prev.close > prev.open && // Previous candle is bullish
                  current.close < current.open && // Current candle is bearish
                  current.open > prev.close && 
                  current.close < prev.open) {
            sellSignals.push({ x: current.timestamp, y: current.high * 1.01 });
          }
          break;
          
        case 'threewhitesoldiers':
          // Three white soldiers (three consecutive bullish candles)
          if (i >= 4 && 
              data[i-2].close > data[i-2].open && 
              data[i-1].close > data[i-1].open && 
              current.close > current.open &&
              data[i-2].close < data[i-1].open &&
              data[i-1].close < current.open) {
            buySignals.push({ x: current.timestamp, y: current.low * 0.99 });
          }
          break;
          
        case 'threeblackcrows':
          // Three black crows (three consecutive bearish candles)
          if (i >= 4 && 
              data[i-2].close < data[i-2].open && 
              data[i-1].close < data[i-1].open && 
              current.close < current.open &&
              data[i-2].close > data[i-1].open &&
              data[i-1].close > current.open) {
            sellSignals.push({ x: current.timestamp, y: current.high * 1.01 });
          }
          break;
          
        case 'morningstar':
          // Morning star pattern
          if (i >= 3 &&
              prevPrev.close < prevPrev.open && // First candle is bearish
              Math.abs(prev.open - prev.close) < 0.3 * (prev.high - prev.low) && // Second candle is small
              current.close > current.open && // Third candle is bullish
              current.close > (prevPrev.open + prevPrev.close) / 2) { // Retraces at least 50% of first candle
            buySignals.push({ x: current.timestamp, y: current.low * 0.99 });
          }
          break;
          
        case 'eveningstar':
          // Evening star pattern
          if (i >= 3 &&
              prevPrev.close > prevPrev.open && // First candle is bullish
              Math.abs(prev.open - prev.close) < 0.3 * (prev.high - prev.low) && // Second candle is small
              current.close < current.open && // Third candle is bearish
              current.close < (prevPrev.open + prevPrev.close) / 2) { // Retraces at least 50% of first candle
            sellSignals.push({ x: current.timestamp, y: current.high * 1.01 });
          }
          break;
      }
    }
    
    return { buySignals, sellSignals };
  };

  useEffect(() => {
    // Initial data load
    fetchData(symbol);

    // WebSocket connection
    const ws = new WebSocket(`ws://localhost:8000/ws/stock/${symbol}`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Update candlestick data
      setCandlestickData(prev => {
        const newData = [...prev.datasets[0].data.slice(-100), {
          x: data.timestamp,
          o: data.open,
          h: data.high,
          l: data.low,
          c: data.close
        }];
        
        // Generate new signals
        const newSignals = generateSignals([...prev.datasets[0].data.slice(-2), {
          timestamp: data.timestamp,
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close
        }], selectedPattern);
        
        // Update buy/sell signals
        setBuySignals(prev => [...prev, ...newSignals.buySignals]);
        setSellSignals(prev => [...prev, ...newSignals.sellSignals]);
        
        return {
          labels: [...prev.labels.slice(-100), data.timestamp],
          datasets: [{
            ...prev.datasets[0],
            data: newData
          }]
        };
      });
      
      setChartData(prev => ({
        labels: [...prev.labels.slice(-100), data.timestamp],
        datasets: [
          {
            ...prev.datasets[0],
            data: [...prev.datasets[0].data.slice(-100), data.close]
          },
          {
            ...prev.datasets[1],
            data: [...prev.datasets[1].data.slice(-100), data.volume]
          }
        ]
      }));

      setRsiData(prev => ({
        labels: [...prev.labels.slice(-100), data.timestamp],
        datasets: [{
          ...prev.datasets[0],
          data: [...prev.datasets[0].data.slice(-100), data.RSI]
        }]
      }));

      setMacdData(prev => ({
        labels: [...prev.labels.slice(-100), data.timestamp],
        datasets: [
          {
            ...prev.datasets[0],
            data: [...prev.datasets[0].data.slice(-100), data.MACD.MACD]
          },
          {
            ...prev.datasets[1],
            data: [...prev.datasets[1].data.slice(-100), data.MACD.Signal]
          },
          {
            ...prev.datasets[2],
            data: [...prev.datasets[2].data.slice(-100), data.MACD.Histogram]
          }
        ]
      }));

      // Update Bollinger Bands
      if (data.BollingerBands) {
        setBolingerData(prev => ({
          labels: [...prev.labels.slice(-100), data.timestamp],
          datasets: [
            {
              ...prev.datasets[0],
              data: [...prev.datasets[0].data.slice(-100), data.close]
            },
            {
              ...prev.datasets[1],
              data: [...prev.datasets[1].data.slice(-100), data.BollingerBands.Upper]
            },
            {
              ...prev.datasets[2],
              data: [...prev.datasets[2].data.slice(-100), data.BollingerBands.Middle]
            },
            {
              ...prev.datasets[3],
              data: [...prev.datasets[3].data.slice(-100), data.BollingerBands.Lower]
            }
          ]
        }));
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setNotification({
        open: true,
        message: 'WebSocket connection error',
        severity: 'error'
      });
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [symbol]);

  useEffect(() => {
    if (!candlestickData.labels.length) return;
    
    const updatedDatasets = [{ ...candlestickData.datasets[0] }];
    
    if (selectedIndicators.sma20) {
      updatedDatasets.push({
        label: 'SMA 20',
        data: chartData.datasets[0].data.map((value, index) => ({ 
          x: candlestickData.labels[index], 
          y: value 
        })),
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 2,
        pointRadius: 0,
        type: 'line',
        order: 1
      });
    }
    
    if (selectedIndicators.sma50) {
      updatedDatasets.push({
        label: 'SMA 50',
        data: bollingerData.datasets[2].data.map((value, index) => ({ 
          x: candlestickData.labels[index], 
          y: value 
        })),
        borderColor: 'rgba(255, 159, 64, 1)',
        borderWidth: 2,
        pointRadius: 0,
        type: 'line',
        order: 1
      });
    }
    
    if (selectedIndicators.ema20) {
      updatedDatasets.push({
        label: 'EMA 20',
        data: chartData.datasets[0].data.map((value, index) => ({ 
          x: candlestickData.labels[index], 
          y: value * 1.01 // Offset for visualization
        })),
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 2,
        pointRadius: 0,
        type: 'line',
        order: 1
      });
    }
    
    if (selectedIndicators.ema50) {
      updatedDatasets.push({
        label: 'EMA 50',
        data: chartData.datasets[0].data.map((value, index) => ({ 
          x: candlestickData.labels[index], 
          y: value * 0.99 // Offset for visualization
        })),
        borderColor: 'rgba(255, 206, 86, 1)',
        borderWidth: 2,
        pointRadius: 0,
        type: 'line',
        order: 1
      });
    }
    
    if (selectedIndicators.bollinger) {
      updatedDatasets.push(
        {
          label: 'Upper Band',
          data: bollingerData.datasets[1].data.map((value, index) => ({ 
            x: candlestickData.labels[index], 
            y: value 
          })),
          borderColor: 'rgba(255, 99, 132, 0.8)',
          borderWidth: 1,
          pointRadius: 0,
          type: 'line',
          order: 1,
          borderDash: [5, 5]
        },
        {
          label: 'Middle Band',
          data: bollingerData.datasets[2].data.map((value, index) => ({ 
            x: candlestickData.labels[index], 
            y: value 
          })),
          borderColor: 'rgba(54, 162, 235, 0.8)',
          borderWidth: 1,
          pointRadius: 0,
          type: 'line',
          order: 1,
          borderDash: [5, 5]
        },
        {
          label: 'Lower Band',
          data: bollingerData.datasets[3].data.map((value, index) => ({ 
            x: candlestickData.labels[index], 
            y: value 
          })),
          borderColor: 'rgba(75, 192, 192, 0.8)',
          borderWidth: 1,
          pointRadius: 0,
          type: 'line',
          order: 1,
          borderDash: [5, 5]
        }
      );
    }
    
    setCandlestickData(prev => ({
      ...prev,
      datasets: updatedDatasets
    }));
    
  }, [selectedIndicators, candlestickData.labels, chartData.datasets, bollingerData.datasets]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        {/* App Bar */}
        <AppBar position="fixed">
          <Toolbar>
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setDrawerOpen(!drawerOpen)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Algo Trading Hustler
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControl variant="outlined" size="small" sx={{ mr: 2, minWidth: 120 }}>
                <InputLabel>Symbol</InputLabel>
                <Select
                  value={symbol}
                  onChange={handleSymbolChange}
                  label="Symbol"
                >
                  <MenuItem value="MSFT">MSFT</MenuItem>
                  <MenuItem value="AAPL">AAPL</MenuItem>
                  <MenuItem value="GOOGL">GOOGL</MenuItem>
                  <MenuItem value="AMZN">AMZN</MenuItem>
                  <MenuItem value="TSLA">TSLA</MenuItem>
                </Select>
              </FormControl>
              <IconButton color="inherit" onClick={handleRefresh}>
                <RefreshIcon />
              </IconButton>
              <IconButton color="inherit" onClick={() => setDarkMode(!darkMode)}>
                {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>
        
        {/* Drawer */}
        <Drawer
          anchor="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        >
          <Box sx={{ width: 250 }} role="presentation">
            <List>
              <ListItem button onClick={() => { setTabValue(0); setDrawerOpen(false); }}>
                <ListItemIcon><DashboardIcon /></ListItemIcon>
                <ListItemText primary="Dashboard" />
              </ListItem>
              <ListItem button onClick={() => { setTabValue(1); setDrawerOpen(false); }}>
                <ListItemIcon><ChartIcon /></ListItemIcon>
                <ListItemText primary="Technical Analysis" />
              </ListItem>
              <ListItem button onClick={() => { setTabValue(2); setDrawerOpen(false); }}>
                <ListItemIcon><TrendingUpIcon /></ListItemIcon>
                <ListItemText primary="Strategy" />
              </ListItem>
              <ListItem button onClick={() => { setTabValue(3); setDrawerOpen(false); }}>
                <ListItemIcon><SettingsIcon /></ListItemIcon>
                <ListItemText primary="Settings" />
              </ListItem>
              <ListItem button onClick={() => { setTabValue(4); setDrawerOpen(false); }}>
                <ListItemIcon><SettingsIcon /></ListItemIcon>
                <ListItemText primary="Algorithm Editor" />
              </ListItem>
            </List>
          </Box>
        </Drawer>
        
        {/* Main Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            mt: 8,
            width: '100%'
          }}
        >
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
            centered
          >
            <Tab label="Dashboard" />
            <Tab label="Technical Analysis" />
            <Tab label="Strategy" />
            <Tab label="Settings" />
            <Tab label="Algorithm Editor" />
          </Tabs>
          
          {/* Dashboard Tab */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
                    <Typography variant="h6">
                      {symbol} Price & Volume
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <FormControl variant="outlined" size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Candlestick Pattern</InputLabel>
                        <Select
                          value={selectedPattern}
                          onChange={handlePatternChange}
                          label="Candlestick Pattern"
                        >
                          <MenuItem value="none">None</MenuItem>
                          <MenuItem value="doji">Doji</MenuItem>
                          <MenuItem value="hammer">Hammer</MenuItem>
                          <MenuItem value="engulfing">Engulfing</MenuItem>
                          <MenuItem value="threewhitesoldiers">Three White Soldiers</MenuItem>
                          <MenuItem value="threeblackcrows">Three Black Crows</MenuItem>
                          <MenuItem value="morningstar">Morning Star</MenuItem>
                          <MenuItem value="eveningstar">Evening Star</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  </Box>
                  <Box sx={{ height: 500 }}>
                    <Chart 
                      type="candlestick" 
                      data={candlestickData} 
                      options={candlestickOptions} 
                      ref={chartRef}
                    />
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Overlay Indicators
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                      <FormControlLabel
                        control={
                          <Checkbox 
                            checked={selectedIndicators.sma20} 
                            onChange={handleIndicatorChange} 
                            name="sma20" 
                            color="primary"
                          />
                        }
                        label="SMA 20"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox 
                            checked={selectedIndicators.sma50} 
                            onChange={handleIndicatorChange} 
                            name="sma50" 
                            color="primary"
                          />
                        }
                        label="SMA 50"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox 
                            checked={selectedIndicators.ema20} 
                            onChange={handleIndicatorChange} 
                            name="ema20" 
                            color="primary"
                          />
                        }
                        label="EMA 20"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox 
                            checked={selectedIndicators.ema50} 
                            onChange={handleIndicatorChange} 
                            name="ema50" 
                            color="primary"
                          />
                        }
                        label="EMA 50"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox 
                            checked={selectedIndicators.bollinger} 
                            onChange={handleIndicatorChange} 
                            name="bollinger" 
                            color="primary"
                          />
                        }
                        label="Bollinger Bands"
                      />
                    </Box>
                  </Box>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper elevation={3} sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    RSI (14)
                  </Typography>
                  <Line data={rsiData} options={rsiOptions} />
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper elevation={3} sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    MACD
                  </Typography>
                  <Line data={macdData} />
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>
          
          {/* Technical Analysis Tab */}
          <TabPanel value={tabValue} index={1}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Bollinger Bands
                  </Typography>
                  <Line data={bollingerData} />
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper elevation={3} sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    RSI (14)
                  </Typography>
                  <Line data={rsiData} options={rsiOptions} />
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper elevation={3} sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    MACD
                  </Typography>
                  <Line data={macdData} />
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>
          
          {/* Strategy Tab */}
          <TabPanel value={tabValue} index={2}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <StrategyConfig onApply={handleApplyStrategy} />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper elevation={3} sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Strategy Performance
                  </Typography>
                  <Typography variant="body1">
                    Select and apply a strategy to see performance metrics.
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>
          
          {/* Settings Tab */}
          <TabPanel value={tabValue} index={3}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Application Settings
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={darkMode}
                        onChange={() => setDarkMode(!darkMode)}
                      />
                    }
                    label="Dark Mode"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Default Symbol</InputLabel>
                    <Select
                      value={symbol}
                      onChange={handleSymbolChange}
                      label="Default Symbol"
                    >
                      <MenuItem value="MSFT">MSFT</MenuItem>
                      <MenuItem value="AAPL">AAPL</MenuItem>
                      <MenuItem value="GOOGL">GOOGL</MenuItem>
                      <MenuItem value="AMZN">AMZN</MenuItem>
                      <MenuItem value="TSLA">TSLA</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>
          </TabPanel>
          
          {/* Algorithm Editor Tab */}
          <TabPanel value={tabValue} index={4}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper elevation={3} sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Algorithm Editor
                  </Typography>
                  <AlgorithmEditor code={algorithmCode} onChange={(newValue) => setAlgorithmCode(newValue)} />
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>
        </Box>
      </Box>
      
      {/* Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

export default App;
