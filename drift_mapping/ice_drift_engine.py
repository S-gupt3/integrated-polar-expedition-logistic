"""
PLOROPSIS — Dynamic Drift Mapping System
Core ice-drift correction engine.

Given an asset's last-known coordinate, the station it belongs to, and an
elapsed time, this computes where the asset's marker SHOULD be plotted now,
accounting for the ice sheet moving beneath it.

Math: standard spherical "destination point given start, bearing, distance"
formula (the same one used in geodesy/navigation — see Ed Williams'
Aviation Formulary / Movable Type Scripts reference implementation).

    φ2 = asin( sinφ1·cos(d/R) + cosφ1·sin(d/R)·cosθ )
    λ2 = λ1 + atan2( sinθ·sin(d/R)·cosφ1, cos(d/R) − sinφ1·sinφ2 )

Where:
    φ1, λ1  = start latitude/longitude (radians)
    θ       = bearing (radians, clockwise from north)
    d       = distance travelled (metres)
    R       = Earth's mean radius (metres)
    φ2, λ2  = destination latitude/longitude (radians)

This is NOT a flat-earth linear approximation — near the poles (where all
three PLOROPSIS stations sit) a naive "add x metres to longitude" shortcut
breaks down badly because a degree of longitude covers far less ground
distance at 70-79° latitude than at the equator. The spherical formula
handles this correctly.
"""

import math
from datetime import date

EARTH_RADIUS_M = 6371000.0

# Real, published glacier velocity data for the glacier nearest each
# PLOROPSIS station (see gis_real_reference_data.py for full sourcing).
# bearing_deg is an approximate compass heading derived from the
# qualitative flow-direction description in the literature (e.g. "NNE"),
# NOT a precisely surveyed vector — flagged here so nobody mistakes it
# for higher precision than it is.
STATION_GLACIER_PROFILES = {
    "MTR": {
        "glacier_name": "Schirmacher Glacier",
        "velocity_m_per_yr": 6.21,
        "velocity_min": 1.89,
        "velocity_max": 10.88,
        "bearing_deg": 22.5,  # NNE
        "confidence": "high (dedicated GPS geodetic study, multi-epoch)",
    },
    "BHR": {
        "glacier_name": "Dålk Glacier",
        "velocity_m_per_yr": 155.0,  # midpoint estimate — see note below
        "velocity_min": None,
        "velocity_max": 310.0,       # published max at the calving terminus
        "bearing_deg": 350.0,        # approx toward Prydz Bay (N/NNW) — approximate
        "confidence": "low-medium (terminus max only; no station-adjacent mean published; "
                       "use max as a conservative/worst-case bound, not a default)",
    },
    "HDR": {
        "glacier_name": "Vestre Brøggerbreen",
        "velocity_m_per_yr": 3.4,   # midpoint of VB-I (2.84) and VB-II (3.95)
        "velocity_min": 2.84,
        "velocity_max": 3.95,
        "bearing_deg": 45.0,  # NE
        "confidence": "high (ground GPS stake network study)",
    },
}


def destination_point(lat_deg: float, lon_deg: float, bearing_deg: float, distance_m: float):
    """Return (lat, lon) in degrees after travelling distance_m metres
    along bearing_deg (compass degrees, clockwise from north) from the
    starting point."""
    phi1 = math.radians(lat_deg)
    lam1 = math.radians(lon_deg)
    theta = math.radians(bearing_deg)
    delta = distance_m / EARTH_RADIUS_M

    phi2 = math.asin(
        math.sin(phi1) * math.cos(delta) + math.cos(phi1) * math.sin(delta) * math.cos(theta)
    )
    lam2 = lam1 + math.atan2(
        math.sin(theta) * math.sin(delta) * math.cos(phi1),
        math.cos(delta) - math.sin(phi1) * math.sin(phi2),
    )

    return math.degrees(phi2), (math.degrees(lam2) + 540) % 360 - 180  # normalize longitude


def compute_drift(station_id: str, lat: float, lon: float, elapsed_days: float,
                   velocity_override_m_per_yr: float = None):
    """
    Core function: given an asset's last logged coordinate at a station,
    return its corrected coordinate after elapsed_days of ice movement.

    Returns a dict with the new coordinate, the displacement in metres,
    and the glacier profile used (so the frontend/API can show its
    provenance and confidence).
    """
    profile = STATION_GLACIER_PROFILES.get(station_id)
    if profile is None:
        raise ValueError(f"Unknown station_id: {station_id}")

    velocity = velocity_override_m_per_yr if velocity_override_m_per_yr is not None else profile["velocity_m_per_yr"]
    distance_m = velocity * (elapsed_days / 365.25)

    new_lat, new_lon = destination_point(lat, lon, profile["bearing_deg"], distance_m)

    return {
        "station_id": station_id,
        "glacier_name": profile["glacier_name"],
        "original_lat": lat,
        "original_lon": lon,
        "corrected_lat": round(new_lat, 7),
        "corrected_lon": round(new_lon, 7),
        "displacement_m": round(distance_m, 3),
        "elapsed_days": elapsed_days,
        "velocity_m_per_yr_used": velocity,
        "bearing_deg": profile["bearing_deg"],
        "confidence": profile["confidence"],
    }


def generate_drift_timeseries(station_id: str, lat: float, lon: float, num_days: int, step_days: int = 1):
    """Return a list of daily (or step_days-interval) positions from day 0
    to num_days, so the drift can be plotted as a continuous path rather
    than a single before/after jump. This is what feeds the 'continuous
    data' view and the animated map."""
    series = []
    day = 0
    while day <= num_days:
        result = compute_drift(station_id, lat, lon, day)
        result["day"] = day
        series.append(result)
        day += step_days
    return series


if __name__ == "__main__":
    # Quick sanity check / demo when run directly.
    for sid in STATION_GLACIER_PROFILES:
        demo = compute_drift(sid, lat=-70.0, lon=11.0, elapsed_days=365)
        print(sid, "->", demo)
