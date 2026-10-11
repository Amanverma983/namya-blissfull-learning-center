-- ============================================================================
-- NAMYA BLISSFULL LEARNING CENTER - CLINIC DATABASE SCHEMA
-- Target Database: PostgreSQL 15+ (Supabase)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. CLINIC SETTINGS TABLE
-- Stores clinic profile, working hours, doctor metadata, and contact details
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinic_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_name VARCHAR(255) NOT NULL DEFAULT 'Namya Blissfull Learning Center',
    tagline VARCHAR(255) DEFAULT 'Compassionate Care, Holistic Development & Learning Excellence',
    doctor_name VARCHAR(255) NOT NULL DEFAULT 'Dr. [Doctor Name Placeholder]',
    qualifications VARCHAR(255) NOT NULL DEFAULT 'MBBS, MD [Placeholder - To Be Verified]',
    specialization VARCHAR(255) NOT NULL DEFAULT 'Developmental Pediatrics & Child Guidance [Placeholder]',
    registration_no VARCHAR(100) DEFAULT '[Medical Council Reg No - Pending Verification]',
    experience_years INT DEFAULT 12,
    phone VARCHAR(30) NOT NULL DEFAULT '+91 98765 43210',
    whatsapp_number VARCHAR(30) NOT NULL DEFAULT '+919876543210',
    email VARCHAR(255) NOT NULL DEFAULT 'contact@namyablissfull.com',
    address TEXT NOT NULL DEFAULT 'Suite 102, Blissfull Healthcare Hub, Main Clinic Road, New Delhi, India',
    google_maps_url TEXT DEFAULT 'https://maps.google.com/?q=New+Delhi',
    opening_hours_text TEXT NOT NULL DEFAULT 'Mon - Sat: 9:00 AM - 1:00 PM & 4:00 PM - 8:00 PM | Sun: Closed',
    morning_start TIME DEFAULT '09:00:00',
    morning_end TIME DEFAULT '13:00:00',
    evening_start TIME DEFAULT '16:00:00',
    evening_end TIME DEFAULT '20:00:00',
    slot_duration_minutes INT DEFAULT 30,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. SERVICES CATALOG TABLE
-- Stores clinic treatments, therapies, assessments, and consultations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'General Consultation',
    description TEXT NOT NULL,
    price NUMERIC(10, 2), -- NULL or 0 indicates 'Contact Clinic' / Free
    duration_minutes INT DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. APPOINTMENTS TABLE
-- High-integrity booking storage with strict validation
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_reference VARCHAR(32) NOT NULL UNIQUE,
    patient_name VARCHAR(150) NOT NULL,
    patient_phone VARCHAR(30) NOT NULL,
    patient_email VARCHAR(255),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    service_name VARCHAR(255) NOT NULL,
    reason_for_visit TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'rejected')),
    cancellation_reason TEXT,
    admin_notes TEXT,
    consent_given BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. BLOCKED SLOTS / HOLIDAYS TABLE
-- Allows admin to block dates or specific hours (emergencies, leave, public holidays)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blocked_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocked_date DATE NOT NULL,
    blocked_time TIME, -- NULL means the entire day is blocked
    reason VARCHAR(255) DEFAULT 'Doctor Unavailable / Clinic Holiday',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- INDEXES & CONSTRAINTS
-- Ensure performance for 150+ concurrent users & absolute race-condition prevention
-- ----------------------------------------------------------------------------

-- CRITICAL: Prevent double-booking for the same date and time slot.
-- Only active statuses (pending, confirmed) hold the slot.
-- Cancelled or rejected bookings automatically release the slot for other patients.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_appointment_slot 
ON appointments (appointment_date, appointment_time) 
WHERE (status IN ('pending', 'confirmed'));

-- Search performance indexes for admin queries & date filtering
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_ref ON appointments(booking_reference);
CREATE INDEX IF NOT EXISTS idx_appointments_phone ON appointments(patient_phone);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_date ON blocked_slots(blocked_date);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active, sort_order);

-- ----------------------------------------------------------------------------
-- TRIGGER: Automatically update `updated_at` timestamps
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clinic_settings_updated_at ON clinic_settings;
CREATE TRIGGER trg_clinic_settings_updated_at
BEFORE UPDATE ON clinic_settings
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_appointments_updated_at ON appointments;
CREATE TRIGGER trg_appointments_updated_at
BEFORE UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_services_updated_at ON services;
CREATE TRIGGER trg_services_updated_at
BEFORE UPDATE ON services
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

-- ----------------------------------------------------------------------------
-- ATOMIC STORED FUNCTION: book_appointment_atomic
-- Prevents race conditions and double-booking at database engine level.
-- SECURITY DEFINER: allows public anon caller to execute safely without raw table write exploits.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION book_appointment_atomic(
    p_patient_name TEXT,
    p_patient_phone TEXT,
    p_patient_email TEXT,
    p_appointment_date DATE,
    p_appointment_time TIME,
    p_service_name TEXT,
    p_reason_for_visit TEXT DEFAULT NULL,
    p_service_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ref TEXT;
    v_new_id UUID;
    v_is_blocked BOOLEAN;
    v_is_slot_taken BOOLEAN;
    v_today DATE := CURRENT_DATE;
BEGIN
    -- 1. Input sanitization and validations
    IF p_patient_name IS NULL OR length(trim(p_patient_name)) < 2 THEN
        RAISE EXCEPTION 'Patient name must be at least 2 characters.';
    END IF;

    IF p_patient_phone IS NULL OR length(trim(p_patient_phone)) < 8 THEN
        RAISE EXCEPTION 'A valid phone number is required.';
    END IF;

    -- 2. Validate appointment is not in the past
    IF p_appointment_date < v_today THEN
        RAISE EXCEPTION 'Cannot book an appointment in the past.';
    END IF;

    -- 3. Check if the date is fully blocked or slot is specifically blocked
    SELECT EXISTS (
        SELECT 1 FROM blocked_slots 
        WHERE blocked_date = p_appointment_date 
          AND (blocked_time IS NULL OR blocked_time = p_appointment_time)
    ) INTO v_is_blocked;

    IF v_is_blocked THEN
        RAISE EXCEPTION 'This time slot or date is not available. Please choose another slot.';
    END IF;

    -- 4. Check if slot is already occupied (defensive check before insert)
    SELECT EXISTS (
        SELECT 1 FROM appointments 
        WHERE appointment_date = p_appointment_date 
          AND appointment_time = p_appointment_time
          AND status IN ('pending', 'confirmed')
    ) INTO v_is_slot_taken;

    IF v_is_slot_taken THEN
        RAISE EXCEPTION 'This time slot is already booked. Please choose an alternate time.';
    END IF;

    -- 5. Generate secure, human-readable booking reference (e.g. NBLC-20261011-A89F)
    v_ref := 'NBLC-' || to_char(p_appointment_date, 'YYYYMMDD') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));

    -- 6. Insert appointment with database-level uniqueness lock
    INSERT INTO appointments (
        booking_reference,
        patient_name,
        patient_phone,
        patient_email,
        appointment_date,
        appointment_time,
        service_id,
        service_name,
        reason_for_visit,
        status,
        consent_given
    ) VALUES (
        v_ref,
        trim(p_patient_name),
        trim(p_patient_phone),
        nullif(trim(p_patient_email), ''),
        p_appointment_date,
        p_appointment_time,
        p_service_id,
        coalesce(trim(p_service_name), 'General Consultation'),
        nullif(trim(p_reason_for_visit), ''),
        'pending',
        TRUE
    )
    RETURNING id INTO v_new_id;

    -- 7. Return safe summary for patient receipt without exposing internal details
    RETURN jsonb_build_object(
        'success', TRUE,
        'booking_reference', v_ref,
        'appointment_date', p_appointment_date,
        'appointment_time', to_char(p_appointment_time, 'HH12:MI AM'),
        'service_name', p_service_name,
        'status', 'pending',
        'message', 'Your appointment request has been recorded successfully.'
    );

EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'Slot collision detected: This time slot was just booked by another visitor. Please select a different time.';
    WHEN OTHERS THEN
        RAISE;
END;
$$;

-- ----------------------------------------------------------------------------
-- PRIVACY-SAFE FUNCTION: get_booked_slots_safe
-- Returns ONLY busy times for a specific date so the public calendar knows
-- which slots to disable, WITHOUT leaking patient identity, phone, or name.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_booked_slots_safe(p_date DATE)
RETURNS TABLE (
    booked_time TEXT,
    slot_type TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    -- Busy appointment slots
    SELECT to_char(appointment_time, 'HH24:MI') AS booked_time, 'appointment' AS slot_type
    FROM appointments
    WHERE appointment_date = p_date
      AND status IN ('pending', 'confirmed')
    
    UNION ALL
    
    -- Blocked/Holiday slots
    SELECT 
        CASE 
            WHEN blocked_time IS NULL THEN 'ALL_DAY'
            ELSE to_char(blocked_time, 'HH24:MI')
        END AS booked_time,
        'blocked' AS slot_type
    FROM blocked_slots
    WHERE blocked_date = p_date;
$$;

-- Grant execution permissions on RPC functions to both anonymous and authenticated users
GRANT EXECUTE ON FUNCTION book_appointment_atomic TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_booked_slots_safe TO anon, authenticated;
