import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface LearningProgress {
  candidates: number;
  formalized: number;
  deprecated: number;
  total: number;
  ready_for_formalization: number;
  ready_candidates: Array<{
    vocabulary_id: string;
    evaluation: {
      ready: boolean;
      usage_count: number;
      consistency: number;
      avg_confidence: number;
      reason: string;
    };
  }>;
  thresholds: {
    min_usage: number;
    consistency: number;
    time_window_days: number;
    min_confidence: number;
  };
}

export function LearningProgressTracker() {
  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [autoFormalizing, setAutoFormalizing] = useState(false);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const res = await fetch('/api/v1/vocabulary/learning/progress');
      const data = await res.json();
      setProgress(data);
    } catch (error) {
      console.error('Failed to fetch learning progress:', error);
    }
  };

  const autoFormalize = async () => {
    setAutoFormalizing(true);
    try {
      const res = await fetch('/api/v1/vocabulary/learning/auto-formalize', {
        method: 'POST'
      });
      const data = await res.json();
      console.log('Auto-formalize result:', data);
      fetchProgress();
    } catch (error) {
      console.error('Auto-formalize failed:', error);
    } finally {
      setAutoFormalizing(false);
    }
  };

  if (!progress) {
    return <div>Loading learning progress...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Learning Progress Tracker</h1>
      
      {/* Progress Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Candidates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{progress.candidates}</div>
            <Badge variant="secondary">Learning</Badge>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Ready</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{progress.ready_for_formalization}</div>
            <Badge variant="default">Formalizable</Badge>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Formalized</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{progress.formalized}</div>
            <Badge variant="default">Active</Badge>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{progress.total}</div>
            <Badge variant="secondary">All</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Learning Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle>Learning Thresholds</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Min Usage:</span> {progress.thresholds.min_usage}
            </div>
            <div>
              <span className="text-gray-500">Consistency:</span> {(progress.thresholds.consistency * 100).toFixed(0)}%
            </div>
            <div>
              <span className="text-gray-500">Time Window:</span> {progress.thresholds.time_window_days} days
            </div>
            <div>
              <span className="text-gray-500">Min Confidence:</span> {(progress.thresholds.min_confidence * 100).toFixed(0)}%
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Formalize */}
      <Card>
        <CardHeader>
          <CardTitle>Auto-Formalize Ready Candidates</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={autoFormalize}
            disabled={autoFormalizing || progress.ready_for_formalization === 0}
          >
            {autoFormalizing ? 'Formalizing...' : `Formalize ${progress.ready_for_formalization} Ready Candidates`}
          </Button>
        </CardContent>
      </Card>

      {/* Ready Candidates */}
      <Card>
        <CardHeader>
          <CardTitle>Ready for Formalization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {progress.ready_candidates.length === 0 ? (
              <div className="text-gray-500">No candidates ready for formalization</div>
            ) : (
              progress.ready_candidates.map((item) => (
                <div key={item.vocabulary_id} className="p-3 border rounded">
                  <div className="font-medium">{item.vocabulary_id}</div>
                  <div className="text-sm text-gray-600 mt-1">{item.evaluation.reason}</div>
                  <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                    <div>
                      <span className="text-gray-500">Usage:</span> {item.evaluation.usage_count}
                    </div>
                    <div>
                      <span className="text-gray-500">Consistency:</span> {item.evaluation.consistency.toFixed(2)}
                    </div>
                    <div>
                      <span className="text-gray-500">Confidence:</span> {item.evaluation.avg_confidence.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
