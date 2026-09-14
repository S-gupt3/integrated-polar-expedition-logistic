"""
PLOROPSIS — Real GIS Reference Data
Compiled from published sources (see citations). This is the ground-truth
layer the Dynamic Drift Mapping System's ice-drift correction math should
be validated against, before moving to synthetic/enhanced data.
"""

stations_real = [
    {
        "station_id": "MTR",
        "name": "Maitri",
        "region": "Antarctica",
        "location_name": "Schirmacher Oasis, Queen Maud Land",
        "latitude": -70.766028,   # 70°45'57.7"S
        "longitude": 11.732278,  # 11°43'56.2"E
        "elevation_m": 117,
        "source": "Wikipedia / ResearchGate (Fig.1 station location study)",
    },
    {
        "station_id": "BHR",
        "name": "Bharati",
        "region": "Antarctica",
        "location_name": "Larsemann Hills, Prydz Bay, Ingrid Christensen Coast",
        "latitude": -69.408030,  # 69°24'29"S
        "longitude": 76.187361,  # 76°11'14"E
        "elevation_m": 35,
        "source": "Wikipedia (Bharati research station)",
    },
    {
        "station_id": "HDR",
        "name": "Himadri",
        "region": "Arctic (Svalbard, Norway)",
        "location_name": "Ny-Ålesund, Spitsbergen",
        "latitude": 78.917,      # 78°55'N
        "longitude": 11.933,     # 11°56'E
        "elevation_m": None,     # not published precisely
        "source": "Wikipedia (Himadri research station)",
    },
]

# Nearest glacier to each station — this is the real velocity input for the
# ice-drift correction model. NOTE the huge disparity between Dålk Glacier
# (marine-terminating, fast) and the other two (land-locked, slow) — the
# drift model must NOT use a single global velocity constant.
nearest_glacier_velocity = [
    {
        "station_id": "MTR",
        "glacier_name": "Schirmacher Glacier",
        "mean_velocity_m_per_yr": 6.21,
        "min_velocity_m_per_yr": 1.89,
        "max_velocity_m_per_yr": 10.88,
        "direction": "north-northeast (NNE)",
        "terminus_type": "land-locked, blocked by Schirmacher Oasis bedrock",
        "source": "Sunil et al., GPS determination of velocity/strain-rate fields, J. Glaciology",
    },
    {
        "station_id": "BHR",
        "glacier_name": "Dålk Glacier",
        "mean_velocity_m_per_yr": None,  # not separately published; terminus max given
        "min_velocity_m_per_yr": None,
        "max_velocity_m_per_yr": 310,
        "direction": "toward Prydz Bay (marine-terminating)",
        "terminus_type": "marine-terminating outlet glacier — much faster, calving front",
        "source": "High-precision ice-flow velocities from ground observations on Dalk Glacier, ScienceDirect 2023",
    },
    {
        "station_id": "HDR",
        "glacier_name": "Vestre Brøggerbreen",
        "mean_velocity_m_per_yr": 3.4,  # midpoint of VB-I (2.84) and VB-II (3.95)
        "min_velocity_m_per_yr": 2.84,
        "max_velocity_m_per_yr": 3.95,
        "direction": "northeast (NE), flows toward Kongsfjorden",
        "terminus_type": "land/cirque-type, cold-based, slow",
        "source": "Ice dynamics of Vestre Brøggerbreen glaciers, J. Earth System Science, 2022",
    },
]

if __name__ == "__main__":
    import json
    print(json.dumps({"stations_real": stations_real,
                       "nearest_glacier_velocity": nearest_glacier_velocity}, indent=2))
