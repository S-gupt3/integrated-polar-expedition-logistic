# drift mapping/router.py
"""
PLOROPSIS Drift Mapping Module
Ice drift prediction and GIS reference data for polar expedition logistics.
"""

from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timezone

from drift_mapping.ice_drift_engine import (
    compute_drift,
    generate_drift_timeseries,
    STATION_GLACIER_PROFILES,
)
from drift_mapping.gis_real_reference_data import stations_real

router = APIRouter()

STATIONS_BY_ID = {s["station_id"]: s for s in stations_real}


@router.get("/drift/status")
def drift_status():
    """Check drift module status"""
    return {
        "module": "drift_mapping",
        "status": "active",
        "version": "2.0.0",
        "engine": "ice_drift_engine (spherical geodesic, real glacier velocity data)",
        "ts": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/drift/stations")
def get_drift_stations():
    """Get all stations with their real coordinates and glacier drift profile"""
    return [
        {**station, "glacier_profile": STATION_GLACIER_PROFILES.get(station["station_id"])}
        for station in stations_real
    ]


@router.get("/drift/correct")
def correct_position(
    station_id: str,
    lat: float = Query(default=None, description="Asset's last logged latitude"),
    lon: float = Query(default=None, description="Asset's last logged longitude"),
    days: float = Query(default=365, ge=0, le=1825, description="Elapsed time in days"),
):
    """
    Correct an asset's last-logged position for ice-sheet movement.
    Falls back to the station's own coordinate if lat/lon aren't supplied.
    """
    if station_id not in STATIONS_BY_ID:
        raise HTTPException(status_code=404, detail=f"Unknown station: {station_id}")

    station = STATIONS_BY_ID[station_id]
    origin_lat = lat if lat is not None else station["latitude"]
    origin_lon = lon if lon is not None else station["longitude"]

    try:
        return compute_drift(station_id, origin_lat, origin_lon, days)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/drift/series")
def drift_series(
    station_id: str,
    lat: float = Query(default=None),
    lon: float = Query(default=None),
    days: int = Query(default=365, ge=0, le=1825),
    step: int = Query(default=5, ge=1, le=365),
):
    """Continuous day-by-day drift path from day 0 to `days`, for plotting."""
    if station_id not in STATIONS_BY_ID:
        raise HTTPException(status_code=404, detail=f"Unknown station: {station_id}")

    station = STATIONS_BY_ID[station_id]
    origin_lat = lat if lat is not None else station["latitude"]
    origin_lon = lon if lon is not None else station["longitude"]

    return generate_drift_timeseries(station_id, origin_lat, origin_lon, days, step)
