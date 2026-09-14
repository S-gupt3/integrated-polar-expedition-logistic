-- PLOROPSIS — MySQL Schema
-- Matches Data/*.csv exactly. station_id is VARCHAR everywhere (MTR/BHR/HDR)
-- to match what's already used across Data/, drift_mapping/, and the CSVs —
-- NOT an integer, which is what backend/main.py incorrectly assumed.

CREATE DATABASE IF NOT EXISTS polar_db;
USE polar_db;

CREATE TABLE IF NOT EXISTS stations (
    station_id              VARCHAR(10) PRIMARY KEY,
    name                     VARCHAR(50) NOT NULL,
    region                   VARCHAR(50),
    latitude                 DECIMAL(9,6),
    longitude                DECIMAL(9,6),
    base_headcount_summer    INT,
    base_headcount_winter    INT
);

CREATE TABLE IF NOT EXISTS assets (
    asset_id                VARCHAR(20) PRIMARY KEY,
    name                     VARCHAR(100) NOT NULL,
    category                 VARCHAR(50),
    station_id               VARCHAR(10),
    status                   VARCHAR(20),
    last_inspection_date     DATE,
    next_maintenance_date    DATE,
    latitude                 DECIMAL(9,6),
    longitude                DECIMAL(9,6),
    FOREIGN KEY (station_id) REFERENCES stations(station_id)
);

CREATE TABLE IF NOT EXISTS inventory (
    inventory_id             VARCHAR(20) PRIMARY KEY,
    item_name                 VARCHAR(100) NOT NULL,
    category                  VARCHAR(50),
    station_id                VARCHAR(10),
    unit                      VARCHAR(20),
    current_quantity          DECIMAL(12,2),
    min_threshold              DECIMAL(12,2),
    status                    VARCHAR(20),
    last_updated               DATE,
    FOREIGN KEY (station_id) REFERENCES stations(station_id)
);

CREATE TABLE IF NOT EXISTS consumption_logs (
    log_id                    VARCHAR(20) PRIMARY KEY,
    station_id                 VARCHAR(10),
    item_name                  VARCHAR(100),
    log_date                    DATE,
    quantity_used                DECIMAL(12,2),
    unit                        VARCHAR(20),
    active_headcount             INT,
    temperature_c                DECIMAL(5,1),
    FOREIGN KEY (station_id) REFERENCES stations(station_id)
);
