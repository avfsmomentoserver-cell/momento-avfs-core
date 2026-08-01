import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, TrendingDown, Activity, Settings, Play, Pause, RefreshCw } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Panel } from "@/components/console/Panel";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { decimal, integer, percent } from "@/lib/format";
import { usePlatform } from "@/state/PlatformProvider";

// Types for Deriv integration
interface DerivMarket {
  symbol: string;
  display_name: string;
  pip_size: number;
  market: string;
  submarket: string;
}

interface DerivPrice {
  symbol: string;
  price: number;
  change: number;
  change_percent: number;
  high: number;
  low: number;
  timestamp: number;
}

interface DerivTrade {
  id: string;
  symbol: string;
  type: "CALL" | "PUT";
  amount: number;
  entry_price: number;
  exit_price?: number;
  status: "OPEN" | "WON" | "LOST" | "DRAW";
  duration: number;
  timestamp: number;
}

interface DerivMarket {
  symbol: string;
  display_name: string;
  pip_size: number;
  market: string;
  submarket: string;
}

interface DerivPrice {
  symbol: string;
  price: number;
  change: number;
  change_percent: number;
  high: number;
  low: number;
  timestamp: number;
}

interface DerivTrade {
  id: string;
  symbol: string;
  type: "CALL" | "PUT";
  amount: number;
  entry_price: number;
  exit_price?: number;
  status: "OPEN" | "WON" | "LOST" | "DRAW";
  duration: number;
  timestamp: number;
}

export default function TradingView() {
  const { source } = usePlatform();
  const [selectedMarket, setSelectedMarket] = useState<string>("R_100");
  const [chartReady, setChartReady] = useState(false);
  const [isTrading, setIsTrading] = useState(false);
  const [tradeAmount, setTradeAmount] = useState(10);
  const [tradeDuration, setTradeDuration] = useState(60);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const tvWidgetRef = useRef<any>(null);

  // Available markets
  const marketsQuery = useQuery({
    queryKey: ["deriv-markets"],
    queryFn: async () => {
      // Simulated markets - in production, this would come from Deriv API
      return [
        { symbol: "R_100", display_name: "Volatility 100", pip_size: 0.001, market: "Indices", submarket: "Volatility" },
        { symbol: "R_75", display_name: "Volatility 75", pip_size: 0.001, market: "Indices", submarket: "Volatility" },
        { symbol: "R_50", display_name: "Volatility 50", pip_size: 0.001, market: "Indices", submarket: "Volatility" },
        { symbol: "R_25", display_name: "Volatility 25", pip_size: 0.001, market: "Indices", submarket: "Volatility" },
        { symbol: "R_10", display_name: "Volatility 10", pip_size: 0.001, market: "Indices", submarket: "Volatility" },
        { symbol: "frxEURUSD", display_name: "EUR/USD", pip_size: 0.0001, market: "Forex", submarket: "Major Pairs" },
        { symbol: "frxGBPUSD", display_name: "GBP/USD", pip_size: 0.0001, market: "Forex", submarket: "Major Pairs" },
        { symbol: "frxUSDJPY", display_name: "USD/JPY", pip_size: 0.01, market: "Forex", submarket: "Major Pairs" },
      ] as DerivMarket[];
    },
    staleTime: 300000,
  });

  // Current price
  const priceQuery = useQuery({
    queryKey: ["deriv-price", selectedMarket],
    queryFn: async () => {
      // Simulated price - in production, this would come from Deriv WebSocket API
      const basePrice = selectedMarket === "R_100" ? 12345.67 : 
                        selectedMarket === "R_75" ? 8765.43 :
                        selectedMarket === "R_50" ? 5678.90 :
                        selectedMarket === "R_25" ? 3456.78 :
                        selectedMarket === "R_10" ? 2345.67 :
                        selectedMarket === "frxEURUSD" ? 1.0850 :
                        selectedMarket === "frxGBPUSD" ? 1.2750 :
                        1.4500;
      
      const change = (Math.random() - 0.5) * 100;
      return {
        symbol: selectedMarket,
        price: basePrice + (Math.random() - 0.5) * 10,
        change: change,
        change_percent: (change / basePrice) * 100,
        high: basePrice + Math.abs(change) + 50,
        low: basePrice - Math.abs(change) - 50,
        timestamp: Date.now(),
      } as DerivPrice;
    },
    refetchInterval: 1000,
  });

  // Recent trades
  const tradesQuery = useQuery({
    queryKey: ["deriv-trades"],
    queryFn: async () => {
      // Simulated trades - in production, this would come from backend
      return [
        { id: "1", symbol: "R_100", type: "CALL", amount: 10, entry_price: 12345.67, exit_price: 12380.45, status: "WON", duration: 60, timestamp: Date.now() - 300000 },
        { id: "2", symbol: "R_100", type: "PUT", amount: 25, entry_price: 12345.67, exit_price: 12320.15, status: "WON", duration: 120, timestamp: Date.now() - 600000 },
        { id: "3", symbol: "R_75", type: "CALL", amount: 15, entry_price: 8765.43, exit_price: 8750.23, status: "LOST", duration: 60, timestamp: Date.now() - 900000 },
        { id: "4", symbol: "frxEURUSD", type: "PUT", amount: 50, entry_price: 1.0850, exit_price: 1.0830, status: "WON", duration: 300, timestamp: Date.now() - 1200000 },
      ] as DerivTrade[];
    },
    refetchInterval: 5000,
  });

  // Initialize TradingView widget
  useEffect(() => {
    if (!chartContainerRef.current || chartReady) return;

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      if (window.TradingView && chartContainerRef.current) {
        tvWidgetRef.current = new window.TradingView.widget({
          autosize: true,
          symbol: selectedMarket,
          interval: "1",
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "en",
          toolbar_bg: "#1e1e1e",
          enable_publishing: false,
          hide_side_toolbar: false,
          allow_symbol_change: true,
          container_id: chartContainerRef.current.id,
          studies: [
            "RSI@tv-basicstudies",
            "MACD@tv-basicstudies",
            "BB@tv-basicstudies",
          ],
          overrides: {
            "paneProperties.background": "#1e1e1e",
            "paneProperties.vertGridProperties.color": "#333333",
            "paneProperties.horzGridProperties.color": "#333333",
            "scalesProperties.textColor": "#d1d5db",
          },
        });

        tvWidgetRef.current.onChartReady(() => {
          setChartReady(true);
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      if (tvWidgetRef.current) {
        tvWidgetRef.current.remove();
      }
      script.remove();
    };
  }, [selectedMarket, chartReady]);

  const handleTrade = (type: "CALL" | "PUT") => {
    setIsTrading(true);
    // In production, this would call the Deriv API to place the trade
    setTimeout(() => {
      setIsTrading(false);
    }, 2000);
  };

  const currentPrice = priceQuery.data;
  const markets = marketsQuery.data || [];
  const trades = tradesQuery.data || [];

  return (
    <AppShell
      title="TradingView"
      subtitle="Deriv integration with real-time market analysis"
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-2">
            <Settings className="h-3.5 w-3.5" />
            Settings
          </Button>
          <Button size="sm" variant="outline" className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Market Selector */}
        <Panel title="Market Selection" subtitle="Select an instrument to trade" dense>
          <div className="flex flex-wrap gap-2">
            {markets.map((market) => (
              <Button
                key={market.symbol}
                size="sm"
                variant={selectedMarket === market.symbol ? "default" : "outline"}
                onClick={() => setSelectedMarket(market.symbol)}
                className="text-xs"
              >
                {market.display_name}
              </Button>
            ))}
          </div>
        </Panel>

        {/* Price Display */}
        {currentPrice && (
          <Panel title="Current Price" subtitle={markets.find(m => m.symbol === selectedMarket)?.display_name} dense>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold font-mono">{decimal(currentPrice.price)}</p>
                <div className="flex items-center gap-2 mt-1">
                  {currentPrice.change >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-signal" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-critical" />
                  )}
                  <span className={`font-mono text-sm ${currentPrice.change >= 0 ? "text-signal" : "text-critical"}`}>
                    {currentPrice.change >= 0 ? "+" : ""}{decimal(currentPrice.change)} ({percent(currentPrice.change_percent)})
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">High: {decimal(currentPrice.high)}</p>
                <p className="text-sm text-muted-foreground">Low: {decimal(currentPrice.low)}</p>
              </div>
            </div>
          </Panel>
        )}

        {/* TradingView Chart */}
        <Panel title="TradingView Chart" subtitle="Real-time technical analysis" lit>
          <div 
            id="tradingview_chart" 
            ref={chartContainerRef}
            className="h-[500px] w-full rounded-md bg-background"
          />
          {!chartReady && (
            <div className="flex h-[500px] items-center justify-center">
              <Activity className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </Panel>

        {/* Trading Controls */}
        <Panel title="Trading Controls" subtitle="Place your trades" dense>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Trade Amount</label>
                <div className="flex gap-2 mt-1">
                  {[10, 25, 50, 100].map((amount) => (
                    <Button
                      key={amount}
                      size="sm"
                      variant={tradeAmount === amount ? "default" : "outline"}
                      onClick={() => setTradeAmount(amount)}
                    >
                      ${amount}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Duration (seconds)</label>
                <div className="flex gap-2 mt-1">
                  {[30, 60, 120, 300].map((duration) => (
                    <Button
                      key={duration}
                      size="sm"
                      variant={tradeDuration === duration ? "default" : "outline"}
                      onClick={() => setTradeDuration(duration)}
                    >
                      {duration}s
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 items-end">
              <Button
                size="lg"
                className="flex-1 bg-signal hover:bg-signal/90"
                onClick={() => handleTrade("CALL")}
                disabled={isTrading}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                CALL
              </Button>
              <Button
                size="lg"
                className="flex-1 bg-critical hover:bg-critical/90"
                onClick={() => handleTrade("PUT")}
                disabled={isTrading}
              >
                <TrendingDown className="h-4 w-4 mr-2" />
                PUT
              </Button>
            </div>
          </div>
        </Panel>

        {/* Recent Trades */}
        <Panel title="Recent Trades" subtitle="Your trading history" dense>
          <div className="space-y-2">
            {trades.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No trades yet</p>
            ) : (
              trades.map((trade) => (
                <div key={trade.id} className="flex items-center justify-between rounded-md border border-border/50 bg-muted/15 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${
                      trade.status === "WON" ? "bg-signal" : 
                      trade.status === "LOST" ? "bg-critical" : 
                      "bg-muted-foreground"
                    }`} />
                    <div>
                      <p className="text-sm font-medium">{trade.type} {trade.symbol}</p>
                      <p className="text-xs text-muted-foreground">
                        ${trade.amount} · {trade.duration}s · {new Date(trade.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-mono text-sm font-semibold ${
                      trade.status === "WON" ? "text-signal" : 
                      trade.status === "LOST" ? "text-critical" : 
                      "text-muted-foreground"
                    }`}>
                      {trade.status}
                    </p>
                    {trade.exit_price && (
                      <p className="text-xs text-muted-foreground">
                        {decimal(trade.entry_price)} → {decimal(trade.exit_price)}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}