# How the Calculations Work

## Days of Autonomy (DoA)

```
daily_rate     = average(quantity_used) over last 14 logged days, per item per station
days_remaining = current_quantity / daily_rate

status = critical   if current_quantity ≤ min_threshold
       = warning    if current_quantity ≤ min_threshold × 2
       = good       otherwise
```

This is a **live projection** — `days_remaining` is computed on every request from the current database state. Stock only changes when new consumption logs are recorded (no artificial in-memory depletion).

## Ice drift prediction

```
drift_distance  = base_rate × days × random_variation
drift_direction = station-specific bias + random_variation
new_position    = current_position + (distance × direction)
confidence      = max(0.5, 1.0 - days / 30)
```

| Ice Condition | Base Drift Rate |
| :--- | :--- |
| `fast_ice` | 0.5 km/day (stable, attached to coast) |
| `pack_ice` | 3.5 km/day (moving with currents/wind) |
| `open_water` | 8.0 km/day (maximum drift) |

!!! note
    This is a demonstration model. For production, integrate with NSIDC satellite data and ECMWF weather forecasts.
