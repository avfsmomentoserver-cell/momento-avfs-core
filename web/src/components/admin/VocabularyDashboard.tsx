import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface VocabularyStats {
  candidates: number;
  formalized: number;
  deprecated: number;
  total: number;
  ready_for_formalization: number;
}

interface DashboardData {
  stats: VocabularyStats;
  recent_discoveries: Array<{
    id: string;
    name: string;
    source: string;
    discovered_at: string;
  }>;
  learning_progress: {
    total_entries: number;
    by_type: Record<string, number>;
    by_source: Record<string, number>;
  };
}

export function VocabularyDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, discoveriesRes, progressRes] = await Promise.all([
        fetch('/api/v1/vocabulary/learning/status'),
        fetch('/api/v1/vocabulary/discoveries?limit=10'),
        fetch('/api/v1/vocabulary')
      ]);

      const stats = await statsRes.json();
      const discoveries = await discoveriesRes.json();
      const progress = await progressRes.json();

      setData({
        stats: stats,
        recent_discoveries: discoveries.discoveries || [],
        learning_progress: progress
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  if (!data) {
    return <div>Failed to load dashboard data</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Vocabulary Learning System</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Candidates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.stats.candidates}</div>
            <Badge variant="secondary">Ready: {data.stats.ready_for_formalization}</Badge>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Formalized</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.stats.formalized}</div>
            <Badge variant="default">Active</Badge>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Deprecated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.stats.deprecated}</div>
            <Badge variant="outline">Inactive</Badge>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.stats.total}</div>
            <Badge variant="secondary">All Entries</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Recent Discoveries */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Pattern Discoveries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.recent_discoveries.map((discovery) => (
              <div key={discovery.id} className="flex items-center justify-between p-2 border rounded">
                <div>
                  <div className="font-medium">{discovery.name}</div>
                  <div className="text-sm text-gray-500">{discovery.source}</div>
                </div>
                <Badge>{new Date(discovery.discovered_at).toLocaleDateString()}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
