# PLOROPSIS — Dynamic Drift Mapping Tool

> **A functional Python engine, local API, and HTML5/Leaflet frontend that demonstrates real-time ice-drift correction using published Antarctic glacier velocity data.**

---

## Overview

PLOROPSIS solves a critical problem for polar deployments: tracking assets on moving ice sheets. Instead of using flat-earth shortcuts, it implements a pure Python **spherical geodesic displacement engine** to calculate asset drift over time based on real, localized glacier velocity datasets. 

It mirrors a "local server, not cloud-hosted" architecture pattern, making it ideal for edge computing environments with limited or zero external internet access.

### Key Features
* **Geodesic Drift Engine** — Computes true spherical displacement across high-latitude curvature without external math libraries.
* **Local API Architecture** — Uses a lightweight Flask backend running strictly on `localhost` to protect data sovereignty.
* **Interactive Frontend** — Built with Leaflet.js, featuring an elapsed-day slider and an animated "Play Drift" tracker.
* **Grounded in Real Data** — Seeded with authentic station coordinates and peer-reviewed glacier velocity metrics.

---

## Repository Structure

| File | Role |
| :--- | :--- |
| **`ice_drift_engine.py`** | Core mathematical engine. Computes true spherical geodesic displacement using Python's standard library. |
| **`gis_real_reference_data.py`** | Ground-truth database containing real research station coordinates, adjacent glacier velocities, and literature citations. |
| **`drift_api.py`** | Local Flask server that exposes the engine over HTTP (`localhost`) to handle frontend requests. |
| **`index.html`** | Leaflet map interface featuring a station selector, manual coordinate overrides, and timeline animation tools. |

---

## Getting Started

### Prerequisites
Ensure you have Python 3.8+ installed on your system.

### Quick Start

1. **Clone the repository and install dependencies:**
   ```bash
   git clone https://github.com/S-gupt3/integrated-polar-expedition-logistic
   cd ploropsis
   pip install flask flask-cors requests
   ```

2. **Launch the local API server:**
   ```bash
   python3 download_tiles.py # To locally download the GIS data
   python3 drift_api.py
   ```
   *Keep this terminal window open running in the background.*

3. **Open the frontend interface:**
   * Double-click `index.html` to run it directly in your web browser.
   * *Alternatively*, spin up a local file server:
     ```bash
     python3 -m http.server 8000
     ```
     Then navigate to: `http://localhost:8000/index.html`

4. **Operate the tool:**
   Select a research station from the dropdown, adjust the elapsed-days slider (or click **"Play Drift"**), and observe the drift-corrected marker track away from its original logged position based on real glacier velocities.

---

## Smart India Hackathon (SIH) Demo Flags

> [!IMPORTANT]
> Review these critical engineering constraints, gaps, and roadmap strategies prior to the live evaluation.

### 1. Inferred Drift Vectors (Approximate Vector Angles)
* **Current State:** The `bearing_deg` value for each station is derived from qualitative direction descriptions found in published literature (e.g., "NNE", "toward Prydz Bay") rather than precise, high-resolution vector headings.
* **Demo Impact:** Completely fine for demonstrating the end-to-end mechanism; not precise enough for deployment asset tracking.

### 2. Bharati Station / Dålk Glacier Velocity Gap
* **Current State:** The Bharati station model relies on a published terminus maximum speed of **310 m/yr**. Because it lacks a localized station-adjacent mean, the engine uses a conservative midpoint placeholder of **155 m/yr**.
* **The "Enhance" Phase Plan:** This is our most significant precision gap. The path forward involves extracting localized InSAR-derived velocity maps (e.g., **NASA MEaSUREs** or **ITS_LIVE**) to secure the exact velocity footprint for the station coordinates, or coordinating with the **NCPOR** for local survey data.

### 3. Network Dependency
* **Current State:** The Leaflet basemap tiles are actively fetched from the public OpenStreetMap CDN.
* **The "Enhance" Phase Plan:** To achieve field readiness for real polar environments, these must be swapped for a pre-cached, completely offline asset tile set.

---
