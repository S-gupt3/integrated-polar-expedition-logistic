"""
PLOROPSIS — Offline Tile Downloader

Run this ONCE, while you have internet, to cache map tiles for the small
area around each station. Afterwards, drift_api.py serves these tiles
locally so index.html works with zero internet connectivity — the actual
requirement from the PLOROPSIS spec (no reliable internet at Maitri/Bharati).

Respects OSM's tile usage policy: identifies itself with a proper
User-Agent, rate-limits requests, and only pulls a small bounding box at
modest zoom levels (this is NOT meant for bulk/production tile scraping —
for anything beyond prototyping, use a proper provider like MapTiler,
Stadia Maps, or your own self-hosted tile server with a valid license).

Usage:
    pip install requests
    python3 download_tiles.py
"""

import os
import time
import math
import requests

# Small bounding box (in degrees) around each station, and the zoom range
# to cache. Zoom 12-13 gives street/feature-level detail close to the
# station; lower zooms give the wider regional context.
STATIONS = {
    "MTR": {"lat": -70.766028, "lon": 11.732278, "name": "Maitri"},
    "BHR": {"lat": -69.408030, "lon": 76.187361, "name": "Bharati"},
    "HDR": {"lat": 78.917000, "lon": 11.933000, "name": "Himadri"},
}

BOX_DEGREES = 0.5     # half-width of the bounding box around each station
ZOOM_LEVELS = range(5, 12)  # regional (5) down to local (11) detail
TILE_URL_TEMPLATE = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
OUTPUT_DIR = "tiles"
REQUEST_DELAY_SEC = 0.3  # be polite — OSM's policy asks for max ~2 req/sec

HEADERS = {
    # Identify the app honestly, per OSM's usage policy requirements.
    "User-Agent": "PLOROPSIS-SIH2026-Prototype/1.0 (educational hackathon project; contact: team email here)"
}


def deg2tile(lat_deg, lon_deg, zoom):
    lat_rad = math.radians(lat_deg)
    n = 2.0 ** zoom
    x = int((lon_deg + 180.0) / 360.0 * n)
    y = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
    return x, y


def download_tile(z, x, y):
    path = os.path.join(OUTPUT_DIR, str(z), str(x))
    os.makedirs(path, exist_ok=True)
    filepath = os.path.join(path, f"{y}.png")

    if os.path.exists(filepath):
        return  # already cached

    url = TILE_URL_TEMPLATE.format(z=z, x=x, y=y)
    try:
        resp = requests.get(url, headers=HEADERS, timeout=10)
        if resp.status_code == 200:
            with open(filepath, "wb") as f:
                f.write(resp.content)
        else:
            print(f"  Skipped {z}/{x}/{y} — HTTP {resp.status_code}")
    except requests.RequestException as e:
        print(f"  Failed {z}/{x}/{y}: {e}")
    time.sleep(REQUEST_DELAY_SEC)


def main():
    total_downloaded = 0
    for station_id, info in STATIONS.items():
        print(f"\n=== {info['name']} ({station_id}) ===")
        lat, lon = info["lat"], info["lon"]

        for zoom in ZOOM_LEVELS:
            x_min, y_max = deg2tile(lat - BOX_DEGREES, lon - BOX_DEGREES, zoom)
            x_max, y_min = deg2tile(lat + BOX_DEGREES, lon + BOX_DEGREES, zoom)
            x_min, x_max = sorted((x_min, x_max))
            y_min, y_max = sorted((y_min, y_max))

            tile_count = (x_max - x_min + 1) * (y_max - y_min + 1)
            print(f"  Zoom {zoom}: {tile_count} tiles")

            for x in range(x_min, x_max + 1):
                for y in range(y_min, y_max + 1):
                    download_tile(zoom, x, y)
                    total_downloaded += 1

    print(f"\nDone. Tiles cached under ./{OUTPUT_DIR}/{{z}}/{{x}}/{{y}}.png")
    print(f"Total tile requests processed: {total_downloaded}")
    print("\nNext: restart drift_api.py — it now serves these tiles at")
    print("  http://127.0.0.1:5000/tiles/{z}/{x}/{y}.png")
    print("index.html has already been pointed at that local URL.")


if __name__ == "__main__":
    main()
