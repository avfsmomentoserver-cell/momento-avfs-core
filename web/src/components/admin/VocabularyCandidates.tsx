import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Candidate {
  id: string;
  name: string;
  type: string;
  source: string;
  usage_count: number;
  consistency_score: number;
  discovered_at: string;
}

interface Evaluation {
  ready: boolean;
  usage_count: number;
  consistency: number;
  avg_confidence: number;
  in_time_window: boolean;
  semantic_valid: boolean;
  reason: string;
}

export function VocabularyCandidates() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [evaluations, setEvaluations] = useState<Record<string, Evaluation>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const res = await fetch('/api/v1/vocabulary?status=candidate');
      const data = await res.json();
      setCandidates(data.entries || []);
      
      // Evaluate each candidate
      for (const candidate of candidates) {
        const evalRes = await fetch(`/api/v1/vocabulary/${candidate.id}/evaluate`);
        const evalData = await evalRes.json();
        setEvaluations(prev => ({
          ...prev,
          [candidate.id]: evalData
        }));
      }
    } catch (error) {
      console.error('Failed to fetch candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const formalizeCandidate = async (candidateId: string) => {
    try {
      const res = await fetch(`/api/v1/vocabulary/${candidateId}/formalize`, {
        method: 'PUT'
      });
      if (res.ok) {
        fetchCandidates();
      }
    } catch (error) {
      console.error('Failed to formalize candidate:', error);
    }
  };

  if (loading) {
    return <div>Loading candidates...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Vocabulary Candidates</h1>
      
      <div className="space-y-4">
        {candidates.map((candidate) => {
          const evaluation = evaluations[candidate.id];
          const isReady = evaluation?.ready;
          
          return (
            <Card key={candidate.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{candidate.name}</CardTitle>
                  <Badge variant={isReady ? "default" : "secondary"}>
                    {isReady ? "Ready" : "Not Ready"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Type:</span> {candidate.type}
                    </div>
                    <div>
                      <span className="text-gray-500">Source:</span> {candidate.source}
                    </div>
                    <div>
                      <span className="text-gray-500">Usage:</span> {candidate.usage_count}
                    </div>
                    <div>
                      <span className="text-gray-500">Consistency:</span> {evaluation?.consistency.toFixed(2)}
                    </div>
                  </div>
                  
                  {evaluation && (
                    <div className="text-sm text-gray-600">
                      {evaluation.reason}
                    </div>
                  )}
                  
                  {isReady && (
                    <Button
                      onClick={() => formalizeCandidate(candidate.id)}
                      className="mt-2"
                    >
                      Formalize
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
