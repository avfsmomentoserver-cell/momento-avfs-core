# Testing Guide for Momento Core

This guide covers testing conventions and practices for Momento Core.

## Testing Philosophy

Momento Core follows a layered testing approach:
1. **Unit Tests** - Test individual functions in isolation
2. **Integration Tests** - Test component interactions
3. **Manual Testing** - Test via UI and RoundTesting page
4. **E2E Tests** - Test complete user flows (planned)

## Backend Testing

### Unit Tests

**Location**: `backend/tests/` (to be created)

**Test Framework**: pytest

**Example**:

```python
# tests/test_analysis.py
import pytest
from momento.analysis import your_analysis_function
from momento.config import AnalysisSettings

def test_your_analysis_function_basic():
    """Test basic functionality with simple data."""
    rounds = [
        {"multiplier": 1.5, "timestamp": "2024-01-01T00:00:00Z"},
        {"multiplier": 2.0, "timestamp": "2024-01-01T00:01:00Z"},
    ]
    settings = AnalysisSettings()

    result = your_analysis_function(rounds, settings)

    assert result["count"] == 2
    assert result["value"] == 1.75

def test_your_analysis_function_empty():
    """Test handling of empty input."""
    rounds = []
    settings = AnalysisSettings()

    result = your_analysis_function(rounds, settings)

    assert result["count"] == 0
    assert result["value"] == 0

def test_your_analysis_function_with_settings():
    """Test that settings are respected."""
    rounds = [
        {"multiplier": 1.0, "timestamp": "2024-01-01T00:00:00Z"},
    ]
    settings = AnalysisSettings(moonshot_threshold=10.0)

    result = your_analysis_function(rounds, settings)

    # Assert settings are used
    assert result["threshold_used"] == 10.0
```

**Running Tests**:
```bash
cd backend
python -m pytest tests/
python -m pytest tests/test_analysis.py -v
python -m pytest tests/ -k "test_your_function"
```

### Integration Tests

**Example**:

```python
# tests/test_api.py
from fastapi.testclient import TestClient
from momento.api.app import app

client = TestClient(app)

def test_get_rounds():
    """Test the rounds API endpoint."""
    response = client.get("/api/v4/rounds?source=aviator&limit=10")

    assert response.status_code == 200
    data = response.json()
    assert "rounds" in data
    assert isinstance(data["rounds"], list)
    assert len(data["rounds"]) <= 10

def test_ingest_rounds():
    """Test round ingestion."""
    payload = {
        "source": "test-source",
        "rounds": [
            {"timestamp": "2024-01-01T00:00:00Z", "multiplier": 1.5},
        ]
    }

    response = client.post("/api/v4/ingest", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["imported"] >= 0
```

### Manual Testing via RoundTesting Page

The RoundTesting page (`/dashboard/round-testing`) allows manual testing of analysis functions.

**Workflow**:
1. Navigate to `/dashboard/round-testing`
2. Enter test round sequence (e.g., "1.05, 1.12, 1.31, 1.08, 1.44, 1.22")
3. Click "Inject"
4. Observe analyzer response
5. Check state scores and narrative
6. Verify predictions match expected behavior

**Use Cases**:
- Validate new analysis functions
- Test edge cases (moonshots, collapses, ladders)
- Verify state machine transitions
- Check signal detection

**Presets**:
- Collapse run
- Ascending ladder
- Compression → ignition
- Bait spike
- Post-moonshot fade
- Variance shelf

## Frontend Testing

### Component Testing

**Framework**: React Testing Library (to be added)

**Example**:

```typescript
// web/src/components/__tests__/YourComponent.test.tsx
import { render, screen } from "@testing-library/react";
import { YourComponent } from "../YourComponent";

describe("YourComponent", () => {
  it("renders title correctly", () => {
    render(<YourComponent title="Test Title" />);
    expect(screen.getByText("Test Title")).toBeInTheDocument();
  });

  it("displays loading state", () => {
    render(<YourComponent loading={true} />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });
});
```

### Manual Testing Checklist

**Page Functionality**:
- [ ] Page loads without errors
- [ ] Data displays correctly
- [ ] Loading states work
- [ ] Error states display
- [ ] Empty states show
- [ ] Actions (buttons, forms) work
- [ ] Navigation works
- [ ] Responsive design works

**Data Integration**:
- [ ] API calls succeed
- [ ] Data refreshes correctly
- [ ] WebSocket updates work
- [ ] Source switching works
- [ ] Polling fallback works

**Edge Cases**:
- [ ] No data available
- [ ] API errors
- [ ] Network errors
- [ ] Large datasets
- [ ] Rapid updates

## Testing Specific Features

### Analysis Functions

**Test Cases**:
1. Empty input
2. Single round
3. Small dataset (10 rounds)
4. Large dataset (1000+ rounds)
5. Edge values (1.0x, 100x+)
6. Monotonic sequences
7. Volatile sequences
8. Session boundaries

**Validation**:
- Return type matches schema
- Handles None/null values
- Respects settings parameters
- Performance acceptable (<100ms for 1000 rounds)

### API Endpoints

**Test Cases**:
1. Valid requests
2. Invalid parameters
3. Missing parameters
4. Unauthorized access
5. Rate limiting
6. Large result sets

**Validation**:
- Status codes correct
- Response schema matches
- Error messages clear
- Pagination works
- Filters work correctly

### Frontend Pages

**Test Cases**:
1. Initial load
2. Data refresh
3. Source change
4. Filter application
5. Action execution
6. Error handling

**Validation**:
- UI renders correctly
- Data displays accurately
- Interactions work smoothly
- Performance acceptable
- Accessibility (keyboard nav, screen readers)

## Performance Testing

### Backend Performance

**Analysis Functions**:
```python
import time

def test_performance():
    rounds = generate_test_rounds(1000)
    settings = AnalysisSettings()

    start = time.time()
    result = your_analysis_function(rounds, settings)
    elapsed = time.time() - start

    assert elapsed < 0.1  # Should complete in <100ms
```

**API Endpoints**:
```python
def test_api_performance():
    start = time.time()
    response = client.get("/api/v4/analysis?source=aviator")
    elapsed = time.time() - start

    assert response.status_code == 200
    assert elapsed < 0.5  # Should complete in <500ms
```

### Frontend Performance

**Metrics**:
- Initial page load < 2s
- Time to interactive < 3s
- Frame rate > 30fps during updates
- Memory usage stable over time

**Tools**:
- Chrome DevTools Performance tab
- React DevTools Profiler
- Lighthouse

## Regression Testing

**Before Changes**:
1. Run existing test suite
2. Note current behavior
3. Document known issues

**After Changes**:
1. Run existing test suite
2. Compare with baseline
3. Test affected features manually
4. Check for side effects

## Continuous Integration

**Planned Setup**:
- GitHub Actions or similar
- Run tests on every push
- Run tests on every PR
- Block merge on test failure

**Pipeline**:
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.10'
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      - name: Run tests
        run: |
          cd backend
          python -m pytest
```

## Debugging Tests

**Common Issues**:

**Test Isolation**:
- Tests should not depend on each other
- Use fixtures for setup/teardown
- Clean database between tests

**Flaky Tests**:
- Tests that sometimes fail
- Usually timing-related
- Add retries or increase timeouts

**Environment Differences**:
- Local vs CI environment
- Database state differences
- Use test database

## Best Practices

**Backend**:
- Write tests for pure functions first
- Mock external dependencies
- Use descriptive test names
- Test edge cases explicitly
- Keep tests fast

**Frontend**:
- Test user behavior, not implementation
- Use semantic queries (getByText, not getByClass)
- Test accessibility
- Mock API calls in component tests
- Test error states

**General**:
- Test early, test often
- Keep tests simple
- Make tests readable
- Update tests when code changes
- Delete obsolete tests

## Test Coverage Goals

**Backend**:
- Analysis functions: 90%+
- Store functions: 80%+
- API endpoints: 70%+

**Frontend**:
- Critical components: 70%+
- Pages: 50%+
- Utility functions: 80%+
