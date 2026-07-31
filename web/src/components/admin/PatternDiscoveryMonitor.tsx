import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DiscoveryResult {
  source: string;
  patterns_found: number;
  patterns_registered: number;
  patterns: any[];
}

export function PatternDiscoveryMonitor() {
  const [discovering, setDiscovering] = useState(false);
  const [lastResult, setLastResult] = useState<DiscoveryResult | null>(null);
  const [discoveries, setDiscoveries] = useState<any[]>([]);

  useEffect(() => {
    fetchDiscoveries();
  }, []);

  const fetchDiscoveries = async () => {
    try {
      const res = await fetch('/api/v1/vocabulary/discoveries?limit=20');
      const data = await res.json();
      setDiscoveries(data.discoveries || []);
    } catch (error) {
      console.error('Failed to fetch discoveries:', error);
    }
  };

  const triggerDiscovery = async (source: string = 'all') => {
    setDiscovering(true);
    try {
      const res = await fetch(`/api/v1/vocabulary/discover?source=aviator&discovery_sources=${source}`, {
        method: 'POST'
      });
      const data = await res.json();
      setLastResult(data);
      fetchDiscoveries();
    } catch (error) {
      console.error('Discovery failed:', error);
    } finally {
      setDiscovering(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Pattern Discovery Monitor</h1>
      
      {/* Discovery Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Trigger Discovery</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              onClick={() => triggerDiscovery('all')}
              disabled={discovering}
            >
              {discovering ? 'Discovering...' : 'Discover All'}
            </Button>
            <Button
              onClick={() => triggerDiscovery('dna')}
              disabled={discovering}
              variant="outline"
            >
              DNA Only
            </Button>
            <Button
              onClick={() => triggerDiscovery('pressure')}
              disabled={discovering}
              variant="outline"
            >
              Pressure Only
            </Button>
            <Button
              onClick={() => triggerDiscovery('moonshot')}
              disabled={discovering}
              variant="outline"
            >
              Moonshot Only
            </Button>
          </div>
          
          {lastResult && (
            <div className="mt-4 p-4 bg-gray-50 rounded">
              <div className="font-medium">Last Discovery Result:</div>
              <div>Patterns Found: {lastResult.patterns_found}</div>
              <div>Registered: {lastResult.patterns_registered}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Discoveries */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Discoveries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {discoveries.map((discovery) => (
              <div key={discovery.id} className="flex items-center justify-between p-2 border rounded">
                <div>
                  <div className="font-medium">{discovery.discovery_source}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(discovery.created_at).toLocaleString()}
                  </div>
                </div>
                <Badge variant={discovery.status === 'processed' ? 'default' : 'secondary'}>
                  {discovery.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
