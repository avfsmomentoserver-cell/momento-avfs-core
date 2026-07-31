import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface FeatureMapping {
  [vocabularyId: string]: {
    vocabulary_name: string;
    feature_name: string;
    registered: boolean;
  };
}

interface ImportResult {
  success: boolean;
  total: number;
  imported: number;
  failed: number;
  results: Array<{
    vocabulary_id: string;
    feature_name: string;
    status: string;
    error?: string;
  }>;
}

export function FeatureIntegrationManager() {
  const [mapping, setMapping] = useState<FeatureMapping>({});
  const [importing, setImporting] = useState(false);
  const [lastImportResult, setLastImportResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    fetchMapping();
  }, []);

  const fetchMapping = async () => {
    try {
      const res = await fetch('/api/v1/vocabulary/features/mapping');
      const data = await res.json();
      setMapping(data);
    } catch (error) {
      console.error('Failed to fetch feature mapping:', error);
    }
  };

  const importAllFeatures = async () => {
    setImporting(true);
    try {
      const res = await fetch('/api/v1/vocabulary/features/import', {
        method: 'POST'
      });
      const data = await res.json();
      setLastImportResult(data);
      fetchMapping();
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setImporting(false);
    }
  };

  const importSingleFeature = async (vocabularyId: string) => {
    try {
      const res = await fetch(`/api/v1/vocabulary/${vocabularyId}/import-feature`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchMapping();
      }
    } catch (error) {
      console.error('Single import failed:', error);
    }
  };

  const removeFeature = async (vocabularyId: string) => {
    try {
      const res = await fetch(`/api/v1/vocabulary/${vocabularyId}/feature`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchMapping();
      }
    } catch (error) {
      console.error('Remove feature failed:', error);
    }
  };

  const registeredCount = Object.values(mapping).filter(m => m.registered).length;
  const totalCount = Object.keys(mapping).length;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Feature Integration Manager</h1>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Registered Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{registeredCount}</div>
            <Badge variant="default">Active</Badge>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Total Vocabulary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalCount}</div>
            <Badge variant="secondary">Formalized</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Import Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Import Vocabulary as Features</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={importAllFeatures}
            disabled={importing}
          >
            {importing ? 'Importing...' : 'Import All Formalized Vocabulary'}
          </Button>
          
          {lastImportResult && (
            <div className="mt-4 p-4 bg-gray-50 rounded">
              <div className="font-medium">Import Result:</div>
              <div>Total: {lastImportResult.total}</div>
              <div>Imported: {lastImportResult.imported}</div>
              <div>Failed: {lastImportResult.failed}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feature Mapping */}
      <Card>
        <CardHeader>
          <CardTitle>Vocabulary to Feature Mapping</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(mapping).map(([vocabId, mappingData]) => (
              <div key={vocabId} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium">{mappingData.vocabulary_name}</div>
                  <div className="text-sm text-gray-500">{mappingData.feature_name}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={mappingData.registered ? 'default' : 'secondary'}>
                    {mappingData.registered ? 'Registered' : 'Not Registered'}
                  </Badge>
                  {!mappingData.registered ? (
                    <Button
                      size="sm"
                      onClick={() => importSingleFeature(vocabId)}
                    >
                      Import
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeFeature(vocabId)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
