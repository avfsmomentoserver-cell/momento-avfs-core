/**
 * Pattern DNA Tracker - First Invention
 * 
 * A sophisticated pattern recognition and DNA analysis tool that:
 * - Detects hidden patterns in crash sequences
 * - Analyzes "DNA" of round sequences (magnitude, timing, streaks)
 * - Provides real-time anomaly detection
 * - Generates confidence-based predictions
 * - Visualizes pattern evolution over time
 * 
 * This invention operates entirely through the middleware layer,
 * reading from the main system API without modifying it.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Target,
  RefreshCw,
  Clock,
  BarChart3
} from 'lucide-react';

import {
  useInventionRounds,
  useInventionAnalysis,
  usePatternDetection,
  useAnomalyDetection,
  usePrediction,
  type NormalizedRound,
  type PatternMatch,
  type AnomalyDetection,
  type PredictionResult
} from '../../middleware';

const PatternDnaTracker: React.FC = () => {
  const [source, setSource] = useState('aviator');
  const [activeTab, setActiveTab] = useState('patterns');

  // Fetch data through middleware
  const roundsQuery = useInventionRounds(source);
  const analysisQuery = useInventionAnalysis(source);
  const patternsQuery = usePatternDetection(source, roundsQuery.data || []);
  const anomaliesQuery = useAnomalyDetection(source, roundsQuery.data || []);
  const predictionQuery = usePrediction(source, roundsQuery.data || [], analysisQuery.data);

  const rounds = roundsQuery.data || [];
  const patterns = patternsQuery.data || [];
  const anomalies = anomaliesQuery.data || [];
  const prediction = predictionQuery.data;

  const isLoading = roundsQuery.isLoading || analysisQuery.isLoading;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getMagnitudeColor = (magnitude: string) => {
    switch (magnitude) {
      case 'extreme': return 'bg-purple-500';
      case 'high': return 'bg-green-500';
      case 'medium': return 'bg-blue-500';
      case 'low': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-500';
    if (confidence >= 0.6) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="w-8 h-8 text-purple-500" />
            Pattern DNA Tracker
          </h1>
          <p className="text-gray-400 mt-1">
            Advanced pattern recognition and sequence analysis
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => roundsQuery.refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Badge variant="outline" className="text-purple-400 border-purple-500">
            {source}
          </Badge>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">Total Rounds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rounds.length}</div>
            <p className="text-xs text-gray-500 mt-1">Analyzed sequences</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">Patterns Found</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">{patterns.length}</div>
            <p className="text-xs text-gray-500 mt-1">Active patterns</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">Anomalies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">{anomalies.length}</div>
            <p className="text-xs text-gray-500 mt-1">Detected anomalies</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">Prediction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getConfidenceColor(prediction?.confidence || 0)}`}>
              {prediction ? `${prediction.predictedRange.min.toFixed(2)}-${prediction.predictedRange.max.toFixed(2)}x` : 'N/A'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {prediction ? `${(prediction.confidence * 100).toFixed(0)}% confidence` : 'No data'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-gray-900 border-gray-800">
          <TabsTrigger value="patterns" className="data-[state=active]:bg-purple-600">
            <BarChart3 className="w-4 h-4 mr-2" />
            Patterns
          </TabsTrigger>
          <TabsTrigger value="anomalies" className="data-[state=active]:bg-red-600">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Anomalies
          </TabsTrigger>
          <TabsTrigger value="prediction" className="data-[state=active]:bg-green-600">
            <Target className="w-4 h-4 mr-2" />
            Prediction
          </TabsTrigger>
          <TabsTrigger value="dna" className="data-[state=active]:bg-blue-600">
            <Zap className="w-4 h-4 mr-2" />
            DNA Analysis
          </TabsTrigger>
        </TabsList>

        {/* Patterns Tab */}
        <TabsContent value="patterns" className="space-y-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Detected Patterns</CardTitle>
              <CardDescription>
                Real-time pattern recognition in round sequences
              </CardDescription>
            </CardHeader>
            <CardContent>
              {patterns.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No patterns detected yet</p>
                  <p className="text-sm mt-2">Waiting for more data...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {patterns.map((pattern, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                          <BarChart3 className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <div className="font-medium capitalize">{pattern.pattern}</div>
                          <div className="text-sm text-gray-400">{pattern.description}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500">
                          {(pattern.confidence * 100).toFixed(0)}% confidence
                        </Badge>
                        <div className="text-xs text-gray-500 mt-1">
                          {pattern.occurrences} occurrences
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Anomalies Tab */}
        <TabsContent value="anomalies" className="space-y-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Anomaly Detection</CardTitle>
              <CardDescription>
                Statistical outliers and unusual behavior
              </CardDescription>
            </CardHeader>
            <CardContent>
              {anomalies.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No anomalies detected</p>
                  <p className="text-sm mt-2">System operating normally</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {anomalies.slice(0, 10).map((anomaly, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 ${getSeverityColor(anomaly.severity)}/20 rounded-lg`}>
                          <AlertTriangle className={`w-5 h-5 ${getSeverityColor(anomaly.severity)}`} />
                        </div>
                        <div>
                          <div className="font-medium">{anomaly.crashPoint.toFixed(2)}x</div>
                          <div className="text-sm text-gray-400">{anomaly.reason}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={`${getSeverityColor(anomaly.severity)}/20 text-${anomaly.severity === 'high' ? 'red' : anomaly.severity === 'medium' ? 'yellow' : 'blue'}-400 border-${anomaly.severity === 'high' ? 'red' : anomaly.severity === 'medium' ? 'yellow' : 'blue'}-500`}>
                            {anomaly.severity}
                        </Badge>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(anomaly.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prediction Tab */}
        <TabsContent value="prediction" className="space-y-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>AI Prediction</CardTitle>
              <CardDescription>
                Confidence-based prediction using pattern analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!prediction ? (
                <div className="text-center py-8 text-gray-500">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Insufficient data for prediction</p>
                  <p className="text-sm mt-2">Collecting more rounds...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-center py-6">
                    <div className="text-5xl font-bold mb-2">
                      {prediction.predictedRange.min.toFixed(2)}x - {prediction.predictedRange.max.toFixed(2)}x
                    </div>
                    <div className={`text-xl font-medium ${getConfidenceColor(prediction.confidence)}`}>
                      {(prediction.confidence * 100).toFixed(0)}% confidence
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-400">Influencing Factors</h4>
                    {prediction.factors.map((factor, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <TrendingUp className="w-4 h-4 text-green-400" />
                        <span>{factor}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-gray-700">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span>Last updated: {new Date(prediction.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DNA Analysis Tab */}
        <TabsContent value="dna" className="space-y-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Round DNA Analysis</CardTitle>
              <CardDescription>
                Magnitude distribution and sequence characteristics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rounds.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No data available</p>
                  <p className="text-sm mt-2">Waiting for rounds...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Magnitude Distribution */}
                  <div>
                    <h4 className="font-medium mb-3">Magnitude Distribution</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {(['low', 'medium', 'high', 'extreme'] as const).map((mag) => {
                        const count = rounds.filter(r => r.magnitude === mag).length;
                        const percentage = (count / rounds.length) * 100;
                        return (
                          <div key={mag} className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`w-3 h-3 rounded-full ${getMagnitudeColor(mag)}`} />
                              <span className="text-sm capitalize">{mag}</span>
                            </div>
                            <div className="text-xl font-bold">{count}</div>
                            <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Recent Rounds */}
                  <div>
                    <h4 className="font-medium mb-3">Recent Round DNA</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {rounds.slice(0, 20).map((round, index) => (
                        <div
                          key={round.id}
                          className="flex items-center justify-between p-2 bg-gray-800 rounded border border-gray-700 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 w-6">{index + 1}</span>
                            <div className={`w-2 h-2 rounded-full ${getMagnitudeColor(round.magnitude)}`} />
                            <span className="font-medium">{round.crashPoint.toFixed(2)}x</span>
                          </div>
                          <div className="flex items-center gap-3 text-gray-500">
                            <span className="capitalize">{round.magnitude}</span>
                            <span>{new Date(round.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PatternDnaTracker;
