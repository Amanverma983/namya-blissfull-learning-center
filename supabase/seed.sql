-- ============================================================================
-- NAMYA BLISSFULL LEARNING CENTER - SEED & INITIAL DATA
-- Initial clinic profile, sample services, and demonstration appointments
-- ============================================================================

-- Clean existing seed data if re-running
DELETE FROM clinic_settings;
DELETE FROM services;
DELETE FROM appointments;
DELETE FROM blocked_slots;

-- 1. Insert Clinic Profile Settings
INSERT INTO clinic_settings (
    id,
    clinic_name,
    tagline,
    doctor_name,
    qualifications,
    specialization,
    registration_no,
    experience_years,
    phone,
    whatsapp_number,
    email,
    address,
    google_maps_url,
    opening_hours_text,
    morning_start,
    morning_end,
    evening_start,
    evening_end,
    slot_duration_minutes
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Namya Blissfull Learning Center',
    'Empowering Children & Families with Compassionate Care, Developmental Guidance & Healing',
    'Dr. [Doctor Name Placeholder - Replace with Verified Name]',
    'MBBS, MD (Pediatrics), Fellowship in Child Development [Sample Credential - Pending Verification]',
    'Developmental Pediatrics, Child Behavior & Early Learning Support [Placeholder]',
    'MCI-REG-[Placeholder-Pending-Verification]',
    12,
    '+91 98765 43210',
    '+919876543210',
    'contact@namyablissfull.com',
    'Plot 42, Blissfull Health Avenue, Near Central Garden, New Delhi 110001, India',
    'https://maps.google.com/?q=28.6139,77.2090',
    'Monday – Saturday: 09:00 AM – 01:00 PM & 04:00 PM – 08:00 PM | Sunday: Closed',
    '09:00:00',
    '13:00:00',
    '16:00:00',
    '20:00:00',
    30
);

-- 2. Insert Clinical & Developmental Services
INSERT INTO services (id, name, category, description, price, duration_minutes, is_active, sort_order) VALUES
(
    'b0000000-0000-0000-0000-000000000001',
    'Comprehensive Child Developmental Assessment',
    'Assessments',
    'Holistic evaluation of milestone progression, cognitive development, motor coordination, and early learning readiness for toddlers and young children.',
    1500.00,
    45,
    TRUE,
    1
),
(
    'b0000000-0000-0000-0000-000000000002',
    'Speech & Language Therapy Consultation',
    'Therapy',
    'Personalized assessment and therapy sessions addressing speech delays, articulation clarity, social communication, and language enrichment.',
    1200.00,
    30,
    TRUE,
    2
),
(
    'b0000000-0000-0000-0000-000000000003',
    'Behavioral Guidance & Parent Counseling',
    'Counseling',
    'Compassionate sessions addressing behavioral challenges, anxiety, emotional regulation, attention difficulties, and positive parenting strategies.',
    1400.00,
    45,
    TRUE,
    3
),
(
    'b0000000-0000-0000-0000-000000000004',
    'Sensory Integration & Occupational Therapy',
    'Therapy',
    'Specialized therapy targeting sensory processing, fine motor coordination, posture balance, and daily life skill independence.',
    1300.00,
    45,
    TRUE,
    4
),
(
    'b0000000-0000-0000-0000-000000000005',
    'Remedial Learning & School Readiness Program',
    'Education & Support',
    'Structured individualized learning interventions for dyslexia support, numeracy concepts, handwriting, and classroom adaptation.',
    1100.00,
    45,
    TRUE,
    5
),
(
    'b0000000-0000-0000-0000-000000000006',
    'General Pediatric Wellness Checkup',
    'General Pediatrics',
    'Routine health evaluation, physical growth tracking, dietary recommendations, and seasonal wellness advice for infants and children.',
    800.00,
    30,
    TRUE,
    6
);

-- 3. Insert Demonstration Appointments (Sample data for admin panel visualization)
INSERT INTO appointments (
    booking_reference,
    patient_name,
    patient_phone,
    patient_email,
    appointment_date,
    appointment_time,
    service_name,
    reason_for_visit,
    status,
    consent_given,
    created_at
) VALUES 
(
    'NBLC-DEMO-001',
    'Sample Patient: Aarav Sharma',
    '+91 98111 22334',
    'parent.aarav@example.com',
    CURRENT_DATE,
    '10:00:00',
    'Comprehensive Child Developmental Assessment',
    'Routine milestone checkup and kindergarten readiness evaluation.',
    'confirmed',
    TRUE,
    NOW() - INTERVAL '2 hours'
),
(
    'NBLC-DEMO-002',
    'Sample Patient: Meera Nair',
    '+91 98222 33445',
    'meera.parent@example.com',
    CURRENT_DATE,
    '11:30:00',
    'Speech & Language Therapy Consultation',
    'Speech delay guidance and pronunciation screening.',
    'pending',
    TRUE,
    NOW() - INTERVAL '4 hours'
),
(
    'NBLC-DEMO-003',
    'Sample Patient: Rohan Verma',
    '+91 98333 44556',
    'rohan.family@example.com',
    CURRENT_DATE + INTERVAL '1 day',
    '16:30:00',
    'Behavioral Guidance & Parent Counseling',
    'Attention and hyperactive behavior consultation.',
    'confirmed',
    TRUE,
    NOW() - INTERVAL '1 day'
),
(
    'NBLC-DEMO-004',
    'Sample Patient: Ananya Patel',
    '+91 98444 55667',
    'ananya.p@example.com',
    CURRENT_DATE + INTERVAL '2 days',
    '17:00:00',
    'Sensory Integration & Occupational Therapy',
    'Follow up session on sensory processing exercises.',
    'pending',
    TRUE,
    NOW() - INTERVAL '12 hours'
);
