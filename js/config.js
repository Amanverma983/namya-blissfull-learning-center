/**
 * ============================================================================
 * NAMYA BLISSFULL LEARNING CENTER - CLIENT CONFIGURATION
 * ============================================================================
 * IMPORTANT SECURITY NOTICE:
 * - Only paste your public SUPABASE_ANON_KEY here.
 * - NEVER, UNDER ANY CIRCUMSTANCES, put your SUPABASE_SERVICE_ROLE_KEY here.
 * - The Anon key is safe for frontend browsers when Row Level Security (RLS) is active.
 * ============================================================================
 */

const CONFIG = {
    // 1. SUPABASE CREDENTIALS
    // Replace these placeholder strings with your actual Supabase project keys:
    // Found in Supabase Dashboard -> Project Settings -> API
    SUPABASE_URL: 'https://YOUR_PROJECT_ID.supabase.co',
    SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',

    // 2. CLINIC PROFILE & CONTACT DEFAULTS
    // Used as instant fallback when offline or before database loads
    CLINIC: {
        name: 'Namya Blissfull Learning Center',
        tagline: 'Compassionate Care, Child Development & Healing Excellence',
        doctorName: 'Renu Kumari',
        qualifications: 'Director & Child Development Specialist',
        specialization: 'Child Development, Learning Support & Center Director',
        regNo: 'Director - Namya Blissfull Learning Center',
        experienceYears: 12,
        phone: '+91 98765 43210',
        phoneRaw: '+919876543210',
        whatsapp: '+919876543210',
        email: 'contact@namyablissfull.com',
        address: 'Plot 42, Blissfull Health Avenue, Near Central Garden, New Delhi 110001, India',
        googleMapsEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d112061.09262729792!2d77.13372861208945!3d28.63248490472421!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390cfd5b347eb62d%3A0x37205b715389640!2sDelhi!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin',
        googleMapsDirectionsUrl: 'https://maps.google.com/?q=28.6139,77.2090',
        openingHours: 'Mon - Sat: 9:00 AM - 1:00 PM & 4:00 PM - 8:00 PM | Sun: Closed',
        slotDurationMinutes: 30,
        currencySymbol: '₹'
    },

    // 3. APPOINTMENT SCHEDULING TIME SLOTS
    // Generated slots for morning and evening shifts
    SCHEDULE: {
        morningSlots: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30'],
        eveningSlots: ['16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'],
        daysNoticeMin: 0, // 0 means same-day booking permitted if slots open
        daysAdvanceMax: 30 // can book up to 30 days ahead
    },

    // Helper to detect if live Supabase project is plugged in
    isLiveSupabaseConfigured() {
        return (
            this.SUPABASE_URL && 
            !this.SUPABASE_URL.includes('YOUR_PROJECT_ID') &&
            this.SUPABASE_ANON_KEY &&
            !this.SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY')
        );
    }
};

// Freeze config object to prevent accidental mutation in other scripts
Object.freeze(CONFIG.SCHEDULE);
