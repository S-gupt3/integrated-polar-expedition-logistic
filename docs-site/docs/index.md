# PLOROPSIS

**Polar Logistics & Operations System for Polar Integrated Support**

A unified, offline-first command center for India's polar expedition logistics — tracking assets, predicting ice drift, and computing real-time "Days of Autonomy" for research stations **Maitri**, **Bharati**, and **Himadri**.

!!! quote "The question PLOROPSIS answers"
    How many days can each station keep running on what it has left — and where will the ice carry them?

## What it does

PLOROPSIS combines three specialized modules into a single executable:

| Module | Purpose |
| :--- | :--- |
| `backend/` | Core logistics — stations, assets, inventory, consumption logs |
| `backend03/` | Days of Autonomy (DoA) calculation engine |
| `drift mapping/` | Ice drift prediction and GIS reference data |
| `test folder/frontend/` | Unified web dashboard (the anchor UI) |

All modules are wired into a single FastAPI server, served through one frontend, and packaged as a double-click executable for field deployment.

## Highlights

- **Inventory & Asset Management** — track 66+ station assets and 24 resource categories across 3 stations, with real-time stock adjustments
- **Days of Autonomy Engine** — a live countdown per resource, color-coded Good / Warning / Critical
- **Ice Drift Prediction** — 1–30 day drift forecasts across three ice models, with GIS tile overlays
- **Unified Dashboard** — a single-page, low-bandwidth app built for field hardware
- **Distribution-ready** — ships as one executable with an editable `config.json`

Head to [Getting Started](getting-started.md) to run it locally, or [Architecture](architecture.md) to see how the pieces fit together.

---

<div align="center" markdown>
**PLOROPSIS** — *Keeping India's polar stations supplied, safe, and one step ahead of the ice.*

Built for the heroes at Maitri, Bharati, and Himadri
</div>
