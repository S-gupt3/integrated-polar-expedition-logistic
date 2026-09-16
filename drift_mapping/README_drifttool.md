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
