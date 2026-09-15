

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os

from ice_drift_engine import compute_drift, generate_drift_timeseries, STATION_GLACIER_PROFILES
from gis_real_reference_data import stations_real

app = Flask(__name__)
CORS(app)  # allow the static HTML file (opened via file:// or a different port) to call this API

TILES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tiles")


@app.route("/tiles/<int:z>/<int:x>/<int:y>.png", methods=["GET"])
def get_tile(z, x, y):
    """Serve pre-downloaded offline tiles (run download_tiles.py first).
    Falls back to a 404 if that zoom/x/y wasn't cached — check the bounding
    box / zoom range in download_tiles.py if tiles are missing near a
    station you're testing."""
    directory = os.path.join(TILES_DIR, str(z), str(x))
    filename = f"{y}.png"
    if not os.path.exists(os.path.join(directory, filename)):
        return jsonify({"error": f"Tile {z}/{x}/{y} not cached — run download_tiles.py "
                                  f"with a wider BOX_DEGREES or ZOOM_LEVELS to cover it."}), 404
    return send_from_directory(directory, filename)


@app.route("/api/stations", methods=["GET"])
def get_stations():
    enriched = []
    for s in stations_real:
        profile = STATION_GLACIER_PROFILES.get(s["station_id"], {})
        enriched.append({**s, "glacier_profile": profile})
    return jsonify(enriched)


@app.route("/api/drift", methods=["GET"])
def get_drift():
    try:
        station = request.args["station"]
        lat = float(request.args["lat"])
        lon = float(request.args["lon"])
        days = float(request.args.get("days", 365))
    except (KeyError, ValueError) as e:
        return jsonify({"error": f"Invalid or missing parameter: {e}"}), 400

    try:
        result = compute_drift(station, lat, lon, days)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    return jsonify(result)


@app.route("/api/drift_series", methods=["GET"])
def get_drift_series():
    try:
        station = request.args["station"]
        lat = float(request.args["lat"])
        lon = float(request.args["lon"])
        days = int(request.args.get("days", 365))
        step = int(request.args.get("step", 5))
    except (KeyError, ValueError) as e:
        return jsonify({"error": f"Invalid or missing parameter: {e}"}), 400

    try:
        series = generate_drift_timeseries(station, lat, lon, days, step)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    return jsonify(series)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
