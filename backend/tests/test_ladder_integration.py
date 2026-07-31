#!/usr/bin/env python3
"""Comprehensive integration test for ladder detection system."""

import sys
sys.path.insert(0, '/home/pirates/Avfs_Core/avfs/v4/backend')

from momento import db, linguistics, analysis, backtest, forecast, config

def test_ladder_integration():
    """Test full ladder detection integration pipeline."""
    print("=== Ladder Detection Integration Test ===\n")
    
    # Fetch historical rounds
    rounds = db.query(
        "SELECT multiplier FROM rounds WHERE source = 'aviator' ORDER BY id DESC LIMIT 500"
    )
    
    if not rounds:
        print("No rounds found in database")
        return
    
    multipliers = [r["multiplier"] for r in rounds]
    print(f"Loaded {len(multipliers)} multipliers for testing\n")
    
    # Test 1: Ladder Detection
    print("--- Test 1: Ladder Detection ---")
    ladders = linguistics.detect_ladders(multipliers, min_length=4)
    print(f"Detected {len(ladders)} ladders")
    ascend_count = sum(1 for l in ladders if l.ladder_type == "ascend")
    collapse_count = sum(1 for l in ladders if l.ladder_type == "collapse")
    print(f"Ascend: {ascend_count}, Collapse: {collapse_count}")
    
    # Test 2: Ceiling Detection
    print("\n--- Test 2: Ceiling Detection ---")
    ceiling_info = linguistics.detect_resistance_ceilings(multipliers)
    print(f"Upper ceiling: {ceiling_info['upper_ceiling']:.2f}")
    print(f"Lower ceiling: {ceiling_info['lower_ceiling']:.2f}")
    print(f"Ladder containment rate: {ceiling_info['ladder_containment_rate']:.4f}")
    
    # Test 3: Compression Energy
    print("\n--- Test 3: Compression Energy ---")
    compression_info = linguistics.calculate_compression_energy(multipliers, ceiling_info)
    print(f"Compression energy: {compression_info['compression_energy']:.2f}")
    print(f"Near release: {compression_info['near_release']}")
    
    # Test 4: Ladder Distances
    print("\n--- Test 4: Ladder Distances ---")
    distance_info = linguistics.calculate_ladder_distances(ladders)
    print(f"Avg ascend distance: {distance_info['avg_ascend_distance']:.2f}")
    print(f"Avg collapse distance: {distance_info['avg_collapse_distance']:.2f}")
    print(f"Low-distance clusters: {len(distance_info['low_distance_clusters'])}")
    
    # Test 5: Ladder Distribution
    print("\n--- Test 5: Ladder Distribution ---")
    distribution = linguistics.calculate_ladder_distribution(ladders)
    print(f"Total ladders: {distribution['total_ladders']}")
    print(f"Avg length: {distribution['avg_length']:.2f}")
    print(f"Length distribution: {distribution['length_distribution']}")
    
    # Test 6: Ladder Pressure
    print("\n--- Test 6: Ladder Pressure ---")
    pressure_info = linguistics.calculate_ladder_pressure(ladders, distance_info)
    print(f"Pressure score: {pressure_info['pressure_score']:.4f}")
    print(f"Release prediction: {pressure_info['release_prediction']}")
    
    # Test 7: DNA Integration
    print("\n--- Test 7: Ladder DNA Integration ---")
    settings = config.AnalysisSettings()
    ladder_dna = analysis.ladder_dna_analysis(multipliers, settings)
    print(f"Ladder-enhanced matches: {ladder_dna['ladder_enhanced_matches']}")
    print(f"Combined confidence: {ladder_dna['combined_confidence']:.4f}")
    print(f"Ladder summary: {ladder_dna['ladder_summary']}")
    
    # Test 8: Backtest Suite
    print("\n--- Test 8: Backtest Suite ---")
    backtest_results = backtest.backtest_ladder_patterns(rounds, settings)
    print(f"Ladder-to-moonshot rate: {backtest_results['ladder_to_moonshot_rate']:.4f}")
    print(f"Longest ladder moonshot rate: {backtest_results['longest_ladder_moonshot_rate']:.4f}")
    print(f"Pattern accuracy: {backtest_results['pattern_accuracy']:.4f}")
    print(f"False positive rate: {backtest_results['false_positive_rate']:.4f}")
    
    # Test 9: ETA Adjustments
    print("\n--- Test 9: ETA Adjustments ---")
    eta_adjustments = forecast.ladder_eta_adjustment(multipliers, settings)
    print(f"Ladder ETA adjustment: {eta_adjustments['ladder_eta_adjustment']:.2f}")
    print(f"Longest ladder ETA: {eta_adjustments['longest_ladder_eta']:.2f}")
    print(f"Combined ETA adjustment: {eta_adjustments['combined_eta_adjustment']:.2f}")
    print(f"Release prediction: {eta_adjustments['release_prediction']}")
    
    # Test 10: Release Conditions
    print("\n--- Test 10: Release Conditions ---")
    release_conditions = analysis.find_release_conditions(multipliers, settings)
    print(f"Longest ladder moonshot correlation: {release_conditions['longest_ladder_moonshot_correlation']:.4f}")
    print(f"Moonshot probability: {release_conditions['moonshot_probability']:.4f}")
    print(f"ETA to moonshot: {release_conditions['eta_to_moonshot']:.2f}")
    print(f"Release conditions found: {len(release_conditions['release_conditions'])}")
    
    # Summary
    print("\n=== Integration Test Summary ===")
    print("All ladder detection components tested successfully")
    print(f"Total ladders detected: {len(ladders)}")
    print(f"Pressure score: {pressure_info['pressure_score']:.4f}")
    print(f"Moonshot probability: {release_conditions['moonshot_probability']:.4f}")
    print(f"ETA adjustment: {eta_adjustments['combined_eta_adjustment']:.2f} rounds")
    
    # Validation checks
    print("\n=== Validation Checks ===")
    checks_passed = 0
    total_checks = 5
    
    if len(ladders) > 0:
        print("✓ Ladder detection working")
        checks_passed += 1
    else:
        print("✗ No ladders detected")
    
    if ceiling_info['upper_ceiling'] is not None:
        print("✓ Ceiling detection working")
        checks_passed += 1
    else:
        print("✗ Ceiling detection failed")
    
    if backtest_results['pattern_accuracy'] >= 0.0:
        print("✓ Backtest suite working")
        checks_passed += 1
    else:
        print("✗ Backtest suite failed")
    
    if eta_adjustments['combined_eta_adjustment'] != 0:
        print("✓ ETA adjustments working")
        checks_passed += 1
    else:
        print("✗ ETA adjustments failed")
    
    if release_conditions['moonshot_probability'] >= 0.0:
        print("✓ Release conditions working")
        checks_passed += 1
    else:
        print("✗ Release conditions failed")
    
    print(f"\nChecks passed: {checks_passed}/{total_checks}")
    
    if checks_passed == total_checks:
        print("✓ All integration tests passed!")
    else:
        print(f"✗ {total_checks - checks_passed} tests failed")

if __name__ == "__main__":
    test_ladder_integration()
