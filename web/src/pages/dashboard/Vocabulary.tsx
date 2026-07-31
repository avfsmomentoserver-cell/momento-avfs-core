import React, { useState } from 'react';
import { VocabularyDashboard } from '@/components/admin/VocabularyDashboard';
import { VocabularyCandidates } from '@/components/admin/VocabularyCandidates';
import { PatternDiscoveryMonitor } from '@/components/admin/PatternDiscoveryMonitor';
import { LearningProgressTracker } from '@/components/admin/LearningProgressTracker';
import { FeatureIntegrationManager } from '@/components/admin/FeatureIntegrationManager';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Tab = 'dashboard' | 'candidates' | 'discovery' | 'learning' | 'features';

export default function VocabularyPage() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  const tabs = [
    { id: 'dashboard' as Tab, label: 'Dashboard', component: VocabularyDashboard },
    { id: 'candidates' as Tab, label: 'Candidates', component: VocabularyCandidates },
    { id: 'discovery' as Tab, label: 'Pattern Discovery', component: PatternDiscoveryMonitor },
    { id: 'learning' as Tab, label: 'Learning Progress', component: LearningProgressTracker },
    { id: 'features' as Tab, label: 'Feature Integration', component: FeatureIntegrationManager },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || VocabularyDashboard;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Vocabulary Learning System</h1>
      </div>

      {/* Tab Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2 flex-wrap">
            {tabs.map(tab => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'outline'}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Tab Content */}
      <ActiveComponent />
    </div>
  );
}
