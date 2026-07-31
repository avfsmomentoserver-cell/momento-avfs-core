#!/usr/bin/env python3
"""Test prediction accuracy of ladder patterns vs baseline."""

import sys
sys.path.insert(0, '/home/pirates/Avfs_Core/avfs/v4/backend')

from momento import db, linguistics, analysis, forecast, backtest, config
from typing import Dict, Any, List
import statistics

def test_prediction_accuracy():
    """Compare baseline vs ladder-enhanced prediction accuracy."""
    print("=== Prediction Accuracy Test: Baseline vs Ladder-Enhanced ===\n")
    
    # Fetch historical rounds for testing
    rounds = db.query(
        "SELECT multiplier, created_at FROM rounds WHERE source = 'aviator' ORDER BY id ASC LIMIT 1000"
    )
    
    if len(rounds) < 100:
        print("Insufficient data for accuracy testing")
        return
    
    print(f"Loaded {len(rounds)} rounds for accuracy testing\n")
    
    # Test parameters
    window_size = 100
    test_windows = []
    
    # Create rolling test windows
    for i in range(window_size, len(rounds) - 10):
        window = rounds[i - window_size:i]
        actual_next = rounds[i:i + 10]  # Next 10 rounds for validation
        test_windows.append({
            "window": window,
            "actual_next": actual_next,
            "window_index": i
        })
    
    print(f"Created {len(test_windows)} test windows\n")
    
    # Baseline predictions (without ladder patterns)
    print("--- Testing Baseline Predictions ---")
    baseline_correct = 0
    baseline_total = 0
    baseline_errors = []
    
    settings = config.AnalysisSettings()
    
    for test_case in test_windows[:50]:  # Sample 50 windows for speed
        window_multipliers = [float(r["multiplier"]) for r in test_case["window"]]
        actual_multipliers = [float(r["multiplier"]) for r in test_case["actual_next"]]
        
        # Baseline: Use simple statistical prediction
        try:
            # Simple baseline: predict based on recent average
            avg_multiplier = statistics.mean(window_multipliers[-20:])
            
            # Simple baseline prediction based on average
            if avg_multiplier >= 10.0:
                predicted_band = "moonshot"
            elif avg_multiplier >= 5.0:
                predicted_band = "ignition"
            elif avg_multiplier >= 2.0:
                predicted_band = "base"
            else:
                predicted_band = "low"
            
            # Check if prediction was correct (within next 10 rounds)
            actual_max = max(actual_multipliers)
            if predicted_band == "moonshot" and actual_max >= 20.0:
                baseline_correct += 1
            elif predicted_band == "ignition" and actual_max >= 10.0:
                baseline_correct += 1
            elif predicted_band == "low" and actual_max < 5.0:
                baseline_correct += 1
            elif predicted_band == "base" and 2.0 <= actual_max < 5.0:
                baseline_correct += 1
            
            baseline_total += 1
            
        except Exception as e:
            baseline_errors.append(str(e))
    
    baseline_accuracy = baseline_correct / baseline_total if baseline_total > 0 else 0.0
    print(f"Baseline accuracy: {baseline_accuracy:.4f} ({baseline_correct}/{baseline_total})")
    print(f"Baseline errors: {len(baseline_errors)}")
    
    # Ladder-enhanced predictions
    print("\n--- Testing Ladder-Enhanced Predictions ---")
    ladder_correct = 0
    ladder_total = 0
    ladder_errors = []
    
    for test_case in test_windows[:50]:  # Same 50 windows
        window_multipliers = [float(r["multiplier"]) for r in test_case["window"]]
        actual_multipliers = [float(r["multiplier"]) for r in test_case["actual_next"]]
        
        # Ladder-enhanced: Use release conditions and ladder pressure
        try:
            # Get release conditions
            release_conditions = analysis.find_release_conditions(window_multipliers, settings)
            moonshot_probability = release_conditions["moonshot_probability"]
            
            # Get ladder pressure
            ladders = linguistics.detect_ladders(window_multipliers, min_length=4)
            distance_info = linguistics.calculate_ladder_distances(ladders)
            pressure_info = linguistics.calculate_ladder_pressure(ladders, distance_info)
            
            # Ladder-enhanced prediction
            if moonshot_probability > 0.7 and pressure_info["pressure_score"] > 0.5:
                predicted_band = "moonshot"
            elif moonshot_probability > 0.5:
                predicted_band = "ignition"
            elif pressure_info["pressure_score"] > 0.7 and pressure_info["release_prediction"] == "imminent":
                predicted_band = "ignition"
            elif pressure_info["release_prediction"] in ("likely", "possible"):
                predicted_band = "base"
            else:
                predicted_band = "low"
            
            # Check if prediction was correct
            actual_max = max(actual_multipliers)
            if predicted_band == "moonshot" and actual_max >= 20.0:
                ladder_correct += 1
            elif predicted_band == "ignition" and actual_max >= 10.0:
                ladder_correct += 1
            elif predicted_band == "low" and actual_max < 5.0:
                ladder_correct += 1
            elif predicted_band == "base" and 2.0 <= actual_max < 5.0:
                ladder_correct += 1
            
            ladder_total += 1
            
        except Exception as e:
            ladder_errors.append(str(e))
    
    ladder_accuracy = ladder_correct / ladder_total if ladder_total > 0 else 0.0
    print(f"Ladder-enhanced accuracy: {ladder_accuracy:.4f} ({ladder_correct}/{ladder_total})")
    print(f"Ladder errors: {len(ladder_errors)}")
    
    # Compare results
    print("\n=== Accuracy Comparison ===")
    improvement = ladder_accuracy - baseline_accuracy
    improvement_pct = (improvement / baseline_accuracy * 100) if baseline_accuracy > 0 else 0
    
    print(f"Baseline accuracy: {baseline_accuracy:.4f}")
    print(f"Ladder-enhanced accuracy: {ladder_accuracy:.4f}")
    print(f"Improvement: {improvement:.4f} ({improvement_pct:+.2f}%)")
    
    # Statistical significance
    if improvement > 0.1:  # 10% improvement threshold
        print(f"\n✓ Significant improvement detected (>10%)")
        print("Recommendation: Integrate ladder patterns into forecast flow")
    elif improvement > 0.05:  # 5% improvement threshold
        print(f"\n⚠ Moderate improvement detected (>5%)")
        print("Recommendation: Consider integration with additional testing")
    else:
        print(f"\n✗ Improvement not significant (<5%)")
        print("Recommendation: Do not integrate at this time")
    
    # Additional metrics
    print("\n=== Additional Metrics ===")
    
    # Test backtest results
    print("\n--- Backtest Results ---")
    backtest_results = backtest.backtest_ladder_patterns(rounds, settings)
    print(f"Ladder-to-moonshot rate: {backtest_results['ladder_to_moonshot_rate']:.4f}")
    print(f"Longest ladder moonshot rate: {backtest_results['longest_ladder_moonshot_rate']:.4f}")
    print(f"Pattern accuracy: {backtest_results['pattern_accuracy']:.4f}")
    
    # Test ETA adjustments
    print("\n--- ETA Adjustment Effectiveness ---")
    multipliers = [float(r["multiplier"]) for r in rounds]
    eta_adjustments = forecast.ladder_eta_adjustment(multipliers, settings)
    print(f"Combined ETA adjustment: {eta_adjustments['combined_eta_adjustment']:.2f} rounds")
    print(f"Release prediction: {eta_adjustments['release_prediction']}")
    
    # Summary
    print("\n=== Summary ===")
    print(f"Baseline accuracy: {baseline_accuracy:.4f}")
    print(f"Ladder-enhanced accuracy: {ladder_accuracy:.4f}")
    print(f"Improvement: {improvement:.4f} ({improvement_pct:+.2f}%)")
    print(f"Ladder-to-moonshot correlation: {backtest_results['ladder_to_moonshot_rate']:.4f}")
    print(f"Longest ladder moonshot rate: {backtest_results['longest_ladder_moonshot_rate']:.4f}")
    
    return {
        "baseline_accuracy": baseline_accuracy,
        "ladder_accuracy": ladder_accuracy,
        "improvement": improvement,
        "improvement_pct": improvement_pct,
        "ladder_to_moonshot_rate": backtest_results['ladder_to_moonshot_rate'],
        "longest_ladder_moonshot_rate": backtest_results['longest_ladder_moonshot_rate'],
        "significant": improvement > 0.1
    }

if __name__ == "__main__":
    results = test_prediction_accuracy()
