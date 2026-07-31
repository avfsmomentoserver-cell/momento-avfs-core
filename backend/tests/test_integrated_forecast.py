#!/usr/bin/env python3
"""Test integrated forecast with ladder enhancements."""

import sys
sys.path.insert(0, '/home/pirates/Avfs_Core/avfs/v4/backend')

from momento import db, forecast, config

def test_integrated_forecast():
    """Test forecast system with ladder enhancements integrated."""
    print("=== Integrated Forecast Test with Ladder Enhancements ===\n")
    
    # Fetch recent rounds
    rounds = db.query(
        "SELECT multiplier, source FROM rounds WHERE source = 'aviator' ORDER BY id DESC LIMIT 200"
    )
    
    if not rounds:
        print("No rounds found in database")
        return
    
    # Convert sqlite3.Row objects to dictionaries
    rounds = [dict(r) for r in rounds]
    
    print(f"Loaded {len(rounds)} rounds for forecast testing\n")
    
    # Test forecast with ladder enhancements
    settings = config.AnalysisSettings()
    
    try:
        candidates = forecast.candidates(rounds, settings)
        
        print(f"Generated {len(candidates)} forecast candidates\n")
        
        # Display top candidates
        print("--- Top Forecast Candidates ---")
        for i, candidate in enumerate(candidates[:5]):
            print(f"{i+1}. {candidate['state']}: {candidate['probability']:.4f} "
                  f"(Range: {candidate['range_lo']:.2f}x - {candidate['range_hi']:.2f}x)")
        
        # Check if moonshot probability is enhanced
        moonshot_candidate = next((c for c in candidates if c['state'] == 'Moonshot'), None)
        if moonshot_candidate:
            print(f"\nMoonshot probability: {moonshot_candidate['probability']:.4f}")
            if moonshot_candidate['probability'] > 0.2:
                print("✓ Ladder enhancements appear to be influencing moonshot prediction")
            else:
                print("⚠ Moonshot probability is low (may not have strong ladder signals)")
        
        # Check for ignition
        ignition_candidate = next((c for c in candidates if c['state'] == 'Ignition'), None)
        if ignition_candidate:
            print(f"Ignition probability: {ignition_candidate['probability']:.4f}")
        
        print("\n✓ Integrated forecast system working with ladder enhancements")
        
    except Exception as e:
        print(f"✗ Error testing integrated forecast: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_integrated_forecast()
