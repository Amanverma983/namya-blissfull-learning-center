-- ============================================================================
-- NAMYA BLISSFULL LEARNING CENTER - ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Zero-Trust security model for public clinic visitors vs staff
-- ============================================================================

-- Enable RLS on every table
ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_slots ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 1. CLINIC SETTINGS POLICIES
-- Public visitors can read clinic information.
-- Only authenticated admin staff can update settings.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view clinic settings" ON clinic_settings;
CREATE POLICY "Public can view clinic settings"
ON clinic_settings FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated admins can update clinic settings" ON clinic_settings;
CREATE POLICY "Authenticated admins can update clinic settings"
ON clinic_settings FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 2. SERVICES CATALOG POLICIES
-- Public visitors can view active services.
-- Authenticated staff can view all, insert, update, or delete.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view active services" ON services;
CREATE POLICY "Public can view active services"
ON services FOR SELECT
TO anon, authenticated
USING (is_active = true OR (auth.role() = 'authenticated'));

DROP POLICY IF EXISTS "Admins can manage services (insert)" ON services;
CREATE POLICY "Admins can manage services (insert)"
ON services FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage services (update)" ON services;
CREATE POLICY "Admins can manage services (update)"
ON services FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage services (delete)" ON services;
CREATE POLICY "Admins can manage services (delete)"
ON services FOR DELETE
TO authenticated
USING (true);

-- ----------------------------------------------------------------------------
-- 3. APPOINTMENTS POLICIES (HIGH SENSITIVITY PATIENT DATA)
-- Public / Anon: Absolutely NO direct SELECT access!
-- Only logged-in admin users can view, search, filter, or manage appointments.
-- Public booking is routed strictly through the atomic SECURITY DEFINER RPC.
-- ----------------------------------------------------------------------------

-- Admin Staff: Full read access to all bookings
DROP POLICY IF EXISTS "Admins can read appointments" ON appointments;
CREATE POLICY "Admins can read appointments"
ON appointments FOR SELECT
TO authenticated
USING (true);

-- Admin Staff: Can update appointment status (confirm, cancel, complete, reschedule)
DROP POLICY IF EXISTS "Admins can update appointments" ON appointments;
CREATE POLICY "Admins can update appointments"
ON appointments FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Admin Staff: Can delete spam or invalid bookings if needed
DROP POLICY IF EXISTS "Admins can delete appointments" ON appointments;
CREATE POLICY "Admins can delete appointments"
ON appointments FOR DELETE
TO authenticated
USING (true);

-- ----------------------------------------------------------------------------
-- 4. BLOCKED SLOTS POLICIES
-- Public queries slot status via `get_booked_slots_safe` RPC (does not leak notes).
-- Authenticated staff can view and manage calendar exceptions.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can read blocked slots" ON blocked_slots;
CREATE POLICY "Admins can read blocked slots"
ON blocked_slots FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can insert blocked slots" ON blocked_slots;
CREATE POLICY "Admins can insert blocked slots"
ON blocked_slots FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can delete blocked slots" ON blocked_slots;
CREATE POLICY "Admins can delete blocked slots"
ON blocked_slots FOR DELETE
TO authenticated
USING (true);
