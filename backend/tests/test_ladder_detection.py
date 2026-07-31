#!/usr/bin/env python3
"""Test script for ladder detection system."""

import sys
sys.path.insert(0, '/home/pirates/Avfs_Core/avfs/v4/backend')

from momento import db, linguistics

def test_ladder_detection():
    """Test ladder detection with real data."""
    print("Testing ladder detection system...")
    
    # Fetch recent rounds from database
    rounds = db.query(
        "SELECT multiplier FROM rounds WHERE source = 'aviator' ORDER BY id DESC LIMIT 100"
    )
    
    if not rounds:
        print("No rounds found in database")
        return
    
    multipliers = [r["multiplier"] for r in rounds]
    print(f"Loaded {len(multipliers)} multipliers")
    print(f"Sample multipliers: {multipliers[:10]}")
    
    # Test ladder detection
    print("\n--- Ladder Detection ---")
    ladders = linguistics.detect_ladders(multipliers, min_length=4)
    print(f"Detected {len(ladders)} ladders")
    
    for i, ladder in enumerate(ladders[:5]):
        print(f"Ladder {i+1}: {ladder.ladder_type}, length={ladder.length}, "
              f"start={ladder.start_multiplier:.2f}, end={ladder.end_multiplier:.2f}, "
              f"slope={ladder.slope:.4f}, strength={ladder.strength}")
    
    # Test ladder distances
    print("\n--- Ladder Distances ---")
    distance_info = linguistics.calculate_ladder_distances(ladders)
    print(f"Ascend distances: {distance_info['ascend_distances']}")
    print(f"Collapse distances: {distance_info['collapse_distances']}")
    print(f"Avg ascend distance: {distance_info['avg_ascend_distance']:.2f}")
    print(f"Avg collapse distance: {distance_info['avg_collapse_distance']:.2f}")
    print(f"Low-distance clusters: {len(distance_info['low_distance_clusters'])}")
    
    # Test ceiling detection
    print("\n--- Ceiling Detection ---")
    ceiling_info = linguistics.detect_resistance_ceilings(multipliers)
    print(f"Upper ceiling: {ceiling_info['upper_ceiling']}")
    print(f"Lower ceiling: {ceiling_info['lower_ceiling']}")
    print(f"Upper breach frequency: {ceiling_info['upper_breach_frequency']:.4f}")
    print(f"Ladder containment rate: {ceiling_info['ladder_containment_rate']:.4f}")
    
    # Test compression energy
    print("\n--- Compression Energy ---")
    compression_info = linguistics.calculate_compression_energy(multipliers, ceiling_info)
    print(f"Compression energy: {compression_info['compression_energy']:.2f}")
    print(f"Avg gap: {compression_info['avg_gap']:.2f}")
    print(f"Max gap: {compression_info['max_gap']:.2f}")
    print(f"Near release: {compression_info['near_release']}")
    
    # Test ladder distribution
    print("\n--- Ladder Distribution ---")
    distribution = linguistics.calculate_ladder_distribution(ladders)
    print(f"Total ladders: {distribution['total_ladders']}")
    print(f"Ascend count: {distribution['ascend_count']}")
    print(f"Collapse count: {distribution['collapse_count']}")
    print(f"Avg length: {distribution['avg_length']:.2f}")
    print(f"Length distribution: {distribution['length_distribution']}")
    
    # Test ladder pressure
    print("\n--- Ladder Pressure ---")
    pressure_info = linguistics.calculate_ladder_pressure(ladders, distance_info)
    print(f"Pressure score: {pressure_info['pressure_score']:.4f}")
    print(f"Continuous clusters: {pressure_info['continuous_clusters']}")
    print(f"Pressure accumulation: {pressure_info['pressure_accumulation']}")
    print(f"Release prediction: {pressure_info['release_prediction']}")
    
    print("\n--- Test Complete ---")

if __name__ == "__main__":
    test_ladder_detection()
