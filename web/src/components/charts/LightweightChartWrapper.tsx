import { useEffect, useRef, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, LineData, HistogramData, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts';

interface LightweightChartWrapperProps {
  container: HTMLDivElement | null;
  width?: number;
  height?: number;
  onCrosshairMove?: (data: { time: Time; price: number }) => void;
}

/**
 * React wrapper for Lightweight Charts library
 * Provides professional charting with dual-axis zoom, crosshair, and responsive design
 * Follows patterns from market-ladder.html implementation
 */
export function useLightweightChart({ container, width, height, onCrosshairMove }: LightweightChartWrapperProps) {
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());

  // Initialize chart
  useEffect(() => {
    if (!container) return;

    const chart = createChart(container, {
      layout: {
        background: { color: '#0b0b0f' },
        textColor: '#dde1f0',
      },
      grid: {
        vertLines: { color: '#1e1e2e' },
        horzLines: { color: '#1e1e2e' },
      },
      crosshair: {
        mode: 1, // Normal mode
        vertLine: {
          color: '#7c3aed',
          width: 1,
          style: 2, // Dashed
          labelBackgroundColor: '#7c3aed',
        },
        horzLine: {
          color: '#7c3aed',
          width: 1,
          style: 2, // Dashed
          labelBackgroundColor: '#7c3aed',
        },
      },
      rightPriceScale: {
        borderColor: '#1e1e2e',
      },
      timeScale: {
        borderColor: '#1e1e2e',
        timeVisible: true,
        secondsVisible: true,
      },
      width: width || container.offsetWidth,
      height: height || container.offsetHeight,
    });

    chartRef.current = chart;

    // Add candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderDownColor: '#ef4444',
      borderUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      wickUpColor: '#22c55e',
    });
    candleSeriesRef.current = candleSeries;

    // Add volume series on separate scale
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#7c3aed',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
    });
    volumeSeriesRef.current = volumeSeries;

    chart.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    // Crosshair move handler
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point) return;
      const time = param.time as Time;
      const price = param.seriesData.get(candleSeries) as CandlestickData;
      if (price && onCrosshairMove) {
        onCrosshairMove({ time, price: (price.close + price.open) / 2 });
      }
    });

    // Handle resize
    const handleResize = () => {
      if (container) {
        chart.applyOptions({
          width: container.offsetWidth,
          height: container.offsetHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      indicatorSeriesRef.current.clear();
    };
  }, [container, width, height, onCrosshairMove]);

  // Update chart size when container changes
  useEffect(() => {
    if (chartRef.current && container) {
      chartRef.current.applyOptions({
        width: container.offsetWidth,
        height: container.offsetHeight,
      });
    }
  }, [container]);

  // Set candle data
  const setCandleData = useCallback((data: CandlestickData[]) => {
    if (candleSeriesRef.current) {
      candleSeriesRef.current.setData(data);
    }
  }, []);

  // Set volume data
  const setVolumeData = useCallback((data: HistogramData<Time>[]) => {
    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.setData(data);
    }
  }, []);

  // Add indicator series
  const addIndicatorSeries = useCallback((id: string, color: string, lineWidth: number = 1): ISeriesApi<'Line'> => {
    if (!chartRef.current) {
      throw new Error('Chart not initialized');
    }
    
    if (indicatorSeriesRef.current.has(id)) {
      return indicatorSeriesRef.current.get(id)!;
    }

    const series = chartRef.current.addSeries(LineSeries, {
      color,
      lineWidth,
      priceScaleId: 'indicator',
    });
    
    indicatorSeriesRef.current.set(id, series);
    
    chartRef.current.priceScale('indicator').applyOptions({
      scaleMargins: {
        top: 0.1,
        bottom: 0.8,
      },
    });

    return series;
  }, []);

  // Set indicator data
  const setIndicatorData = useCallback((id: string, data: LineData<Time>[]) => {
    const series = indicatorSeriesRef.current.get(id);
    if (series) {
      series.setData(data);
    }
  }, []);

  // Fit content to view
  const fitContent = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, []);

  // Get visible range
  const getVisibleRange = useCallback(() => {
    if (!chartRef.current) return null;
    return chartRef.current.timeScale().getVisibleLogicalRange();
  }, []);

  // Set visible range
  const setVisibleRange = useCallback((from: number, to: number) => {
    if (chartRef.current) {
      chartRef.current.timeScale().setVisibleLogicalRange({ from, to });
    }
  }, []);

  // Zoom to range
  const zoomToRange = useCallback((from: Time, to: Time) => {
    if (chartRef.current) {
      chartRef.current.timeScale().setVisibleRange({ from, to });
    }
  }, []);

  return {
    chart: chartRef.current,
    candleSeries: candleSeriesRef.current,
    volumeSeries: volumeSeriesRef.current,
    indicatorSeries: indicatorSeriesRef.current,
    setCandleData,
    setVolumeData,
    addIndicatorSeries,
    setIndicatorData,
    fitContent,
    getVisibleRange,
    setVisibleRange,
    zoomToRange,
  };
}
