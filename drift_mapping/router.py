# drift mapping/router.py
"""
PLOROPSIS Drift Mapping Module
Ice drift prediction and GIS reference data for polar expedition logistics.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from typing import List, Optional
import math
import random

router = APIRouter()

class DriftPrediction(BaseModel):
    station_id: str
    current_lat: float
    current_lon: float
    predicted_lat: float
    predicted_lon: float
    drift_distance_km: float
    drift_direction_deg: float
    confidence: float
    forecast_days: int
    timestamp: str

class TileRequest(BaseModel):
    lat: float
    lon: float
    zoom: int = 10

# Calculation
class DriftEngine:
    """
    Simplified ice drift prediction model.
    In production, this would integrate with:
    - NSIDC (National Snow and Ice Data Center) satellite data
    - ECMWF weather forecasts
    - Historical drift patterns for each station
    """
    
    # Average drift rates (km/day) for different ice conditions
    DRIFT_RATES = {
        "fast_ice": 0.5,      # Stable, attached to coast
        "pack_ice": 3.5,      # Moving with currents/wind
        "open_water": 8.0,    # Maximum drift
    }
    
    # Station-specific base coordinates (approximate)
    STATION_COORDS = {
        "MTR": {"lat": -67.6825, "lon": 62.8619},   # Maitri
        "BHR": {"lat": -69.4074, "lon": 76.2658},   # Bharati
        "HDR": {"lat": 78.9199, "lon": 11.9306},    # Himadri (Svalbard)
    }
    
    @staticmethod
    def calculate_drift(station_id: str, days: int, ice_condition: str = "pack_ice") -> DriftPrediction:
        """
        Predict drift for a station over N days.
        Uses simplified model: drift = rate * time + random variation
        """
        if station_id not in DriftEngine.STATION_COORDS:
            raise ValueError(f"Unknown station: {station_id}")
        
        coords = DriftEngine.STATION_COORDS[station_id]
        current_lat = coords["lat"]
        current_lon = coords["lon"]
        
        # Get drift rate based on ice condition
        rate = DriftEngine.DRIFT_RATES.get(ice_condition, 3.5)
        
        # Calculate total drift distance
        total_drift_km = rate * days * (0.8 + random.random() * 0.4)
        
        # Drift direction (predominantly eastward in Antarctic, variable in Arctic)
        if station_id in ["MTR", "BHR"]:  # Antarctic
            direction = 45 + random.random() * 30  # Northeast
        else:  # Arctic (Himadri)
            direction = random.random() * 360
        
        # Convert drift to lat/lon changes (approximate)
        # 1 degree latitude ≈ 111 km
        # 1 degree longitude ≈ 111 km * cos(latitude)
        lat_change = (total_drift_km * math.cos(math.radians(direction))) / 111.0
        lon_change = (total_drift_km * math.sin(math.radians(direction))) / (111.0 * math.cos(math.radians(current_lat)))
        
        predicted_lat = current_lat + lat_change
        predicted_lon = current_lon + lon_change
        
        # Confidence decreases with forecast horizon
        confidence = max(0.5, 1.0 - (days / 30.0))
        
        return DriftPrediction(
            station_id=station_id,
            current_lat=current_lat,
            current_lon=current_lon,
            predicted_lat=round(predicted_lat, 6),
            predicted_lon=round(predicted_lon, 6),
            drift_distance_km=round(total_drift_km, 2),
            drift_direction_deg=round(direction, 2),
            confidence=round(confidence, 2),
            forecast_days=days,
            timestamp=datetime.now(timezone.utc).isoformat()
        )

# API endpoints
@router.get("/drift/status")
def drift_status():
    """Check drift module status"""
    return {
        "module": "drift_mapping",
        "status": "active",
        "version": "1.0.0",
        "ts": datetime.now(timezone.utc).isoformat()
    }

@router.get("/drift/predict/{station_id}")
def predict_drift(
    station_id: str,
    days: int = Query(default=7, ge=1, le=30, description="Forecast horizon (1-30 days)"),
    ice_condition: str = Query(default="pack_ice", description="Ice condition: fast_ice, pack_ice, open_water")
):
    """
    Predict ice drift for a station over N days.
    Returns current position, predicted position, drift distance, and confidence.
    """
    try:
        prediction = DriftEngine.calculate_drift(station_id, days, ice_condition)
        return prediction
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Drift prediction failed: {str(e)}")

@router.get("/drift/stations")
def get_drift_stations():
    """Get all stations with their base coordinates"""
    return [
        {
            "station_id": sid,
            "name": {"MTR": "Maitri", "BHR": "Bharati", "HDR": "Himadri"}[sid],
            "latitude": coords["lat"],
            "longitude": coords["lon"]
        }
        for sid, coords in DriftEngine.STATION_COORDS.items()
    ]

@router.post("/drift/tiles")
def get_map_tile(request: TileRequest):
    """
    Get map tile data for GIS visualization.
    In production, this would fetch actual satellite imagery or tile data.
    """
    return {
        "lat": request.lat,
        "lon": request.lon,
        "zoom": request.zoom,
        "tile_url": f"https://tile.openstreetmap.org/{request.zoom}/{int(request.lon)}/{int(request.lat)}.png",
        "ice_coverage": random.uniform(0.3, 0.9),  # Mock data
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@router.get("/drift/history/{station_id}")
def get_drift_history(
    station_id: str,
    days: int = Query(default=30, ge=1, le=365, description="Historical period (1-365 days)")
):
    """
    Get historical drift data for a station.
    In production, this would query actual historical tracking data.
    """
    if station_id not in DriftEngine.STATION_COORDS:
        raise HTTPException(status_code=404, detail=f"Unknown station: {station_id}")
    
    coords = DriftEngine.STATION_COORDS[station_id]
    history = []
    
    # Generate mock historical drift path
    lat, lon = coords["lat"], coords["lon"]
    for i in range(days, 0, -1):
        # Small random drift each day
        lat += random.uniform(-0.01, 0.01)
        lon += random.uniform(-0.01, 0.01)
        
        history.append({
            "date": (datetime.now(timezone.utc) - timedelta(days=i)).date().isoformat(),
            "latitude": round(lat, 6),
            "longitude": round(lon, 6),
            "ice_condition": random.choice(["fast_ice", "pack_ice", "open_water"])
        })
    
    return {
        "station_id": station_id,
        "history": history
    }
