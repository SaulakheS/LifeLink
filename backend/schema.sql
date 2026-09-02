-- LifeLink Database Schema
-- Requires PostgreSQL with PostGIS extension enabled

-- 1. Enable PostGIS Extension (required for geospatial calculations: ST_SetSRID, ST_MakePoint, ST_Distance)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Hospitals Table
CREATE TABLE IF NOT EXISTS hospitals (
    hospital_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    locality TEXT,
    location GEOMETRY(Point, 4326),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Donors Table
CREATE TABLE IF NOT EXISTS donors (
    donor_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    blood_group VARCHAR(10) NOT NULL,
    address TEXT,
    location GEOMETRY(Point, 4326),
    availability BOOLEAN DEFAULT TRUE,
    gender VARCHAR(20),
    last_donation_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Emergency Requests Table
CREATE TABLE IF NOT EXISTS emergency_requests (
    request_id SERIAL PRIMARY KEY,
    hospital_id INT REFERENCES hospitals(hospital_id) ON DELETE CASCADE,
    blood_group VARCHAR(10) NOT NULL,
    location GEOMETRY(Point, 4326),
    status VARCHAR(20) DEFAULT 'OPEN',
    donor_queue JSONB,
    active_donor_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Request Responses Table
CREATE TABLE IF NOT EXISTS request_responses (
    response_id SERIAL PRIMARY KEY,
    request_id INT REFERENCES emergency_requests(request_id) ON DELETE CASCADE,
    donor_id INT REFERENCES donors(donor_id) ON DELETE CASCADE,
    response_status VARCHAR(20) NOT NULL,
    response_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    attempt_order INT
);

-- 6. Donation Certificates Table
CREATE TABLE IF NOT EXISTS donation_certificates (
    certificate_id SERIAL PRIMARY KEY,
    certificate_token UUID DEFAULT gen_random_uuid() UNIQUE,
    donor_id INT REFERENCES donors(donor_id) ON DELETE CASCADE,
    hospital_id INT REFERENCES hospitals(hospital_id) ON DELETE CASCADE,
    request_id INT REFERENCES emergency_requests(request_id) ON DELETE SET NULL,
    blood_group VARCHAR(10),
    donor_name VARCHAR(255),
    hospital_name VARCHAR(255),
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Spatial & Performance Indexes
CREATE INDEX IF NOT EXISTS idx_hospitals_location ON hospitals USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_donors_location ON donors USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_donors_blood_avail ON donors (blood_group, availability);
CREATE INDEX IF NOT EXISTS idx_emergency_requests_hospital ON emergency_requests (hospital_id);
CREATE INDEX IF NOT EXISTS idx_request_responses_req_donor ON request_responses (request_id, donor_id);
CREATE INDEX IF NOT EXISTS idx_donation_certificates_token ON donation_certificates (certificate_token);
