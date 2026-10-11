/**
 * ============================================================================
 * NAMYA BLISSFULL LEARNING CENTER - MAIN SCRIPTS
 * Global utilities, dynamic content hydration, mobile menu & interactive UI
 * ============================================================================
 */

let supabaseClient = null;

// Initialize Supabase Client if CDN and credentials exist
function initSupabase() {
    if (typeof window.supabase !== 'undefined' && CONFIG.isLiveSupabaseConfigured()) {
        try {
            supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
            console.log('✓ Supabase client connected successfully.');
        } catch (e) {
            console.warn('Could not initialize Supabase client:', e);
        }
    } else {
        console.info('ℹ Running in Local Demo Mode. Configure js/config.js with your Supabase keys for cloud sync.');
        const banner = document.getElementById('demoModeBanner');
        if (banner) {
            banner.classList.add('show');
        }
    }
}

// ----------------------------------------------------------------------------
// TOAST NOTIFICATION HELPER
// ----------------------------------------------------------------------------
function showToast(message, type = 'info', duration = 4000) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Icon based on type
    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    } else if (type === 'error') {
        iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else {
        iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ----------------------------------------------------------------------------
// SECURITY / SANITIZATION HELPER
// ----------------------------------------------------------------------------
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ----------------------------------------------------------------------------
// DYNAMIC CLINIC DATA HYDRATION
// ----------------------------------------------------------------------------
async function hydrateClinicInfo() {
    let clinic = { ...CONFIG.CLINIC };

    // Attempt live fetch if Supabase client is active
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('clinic_settings')
                .select('*')
                .limit(1)
                .single();

            if (data && !error) {
                clinic.name = data.clinic_name || clinic.name;
                clinic.tagline = data.tagline || clinic.tagline;
                clinic.doctorName = data.doctor_name || clinic.doctorName;
                clinic.qualifications = data.qualifications || clinic.qualifications;
                clinic.specialization = data.specialization || clinic.specialization;
                clinic.regNo = data.registration_no || clinic.regNo;
                clinic.experienceYears = data.experience_years || clinic.experienceYears;
                clinic.phone = data.phone || clinic.phone;
                clinic.whatsapp = data.whatsapp_number || clinic.whatsapp;
                clinic.email = data.email || clinic.email;
                clinic.address = data.address || clinic.address;
                clinic.openingHours = data.opening_hours_text || clinic.openingHours;
            }
        } catch (err) {
            console.log('Using default clinic configuration.');
        }
    }

    // Hydrate DOM elements with data-clinic attributes
    document.querySelectorAll('[data-clinic-name]').forEach(el => el.textContent = clinic.name);
    document.querySelectorAll('[data-clinic-tagline]').forEach(el => el.textContent = clinic.tagline);
    document.querySelectorAll('[data-clinic-doctor]').forEach(el => el.textContent = clinic.doctorName);
    document.querySelectorAll('[data-clinic-qualifications]').forEach(el => el.textContent = clinic.qualifications);
    document.querySelectorAll('[data-clinic-specialization]').forEach(el => el.textContent = clinic.specialization);
    document.querySelectorAll('[data-clinic-regno]').forEach(el => el.textContent = clinic.regNo);
    document.querySelectorAll('[data-clinic-experience]').forEach(el => el.textContent = clinic.experienceYears + '+ Years');
    document.querySelectorAll('[data-clinic-phone]').forEach(el => {
        el.textContent = clinic.phone;
        if (el.tagName === 'A') el.href = `tel:${clinic.phone.replace(/[^0-9+]/g, '')}`;
    });
    document.querySelectorAll('[data-clinic-whatsapp-btn]').forEach(el => {
        if (el.tagName === 'A') {
            const cleanNumber = clinic.whatsapp.replace(/[^0-9]/g, '');
            const defaultMsg = encodeURIComponent(`Hello Namya Blissfull Learning Center, I would like to enquire about consultation and services.`);
            el.href = `https://wa.me/${cleanNumber}?text=${defaultMsg}`;
        }
    });
    document.querySelectorAll('[data-clinic-email]').forEach(el => {
        el.textContent = clinic.email;
        if (el.tagName === 'A') el.href = `mailto:${clinic.email}`;
    });
    document.querySelectorAll('[data-clinic-address]').forEach(el => el.textContent = clinic.address);
    document.querySelectorAll('[data-clinic-hours]').forEach(el => el.textContent = clinic.openingHours);
}

// ----------------------------------------------------------------------------
// MOBILE MENU NAVIGATION
// ----------------------------------------------------------------------------
function initMobileNavigation() {
    const menuToggle = document.getElementById('menuToggle');
    const mobileDrawer = document.getElementById('mobileDrawer');
    const closeDrawer = document.getElementById('closeDrawer');

    if (!menuToggle || !mobileDrawer) return;

    function openMenu() {
        mobileDrawer.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
        mobileDrawer.classList.remove('open');
        document.body.style.overflow = '';
    }

    menuToggle.addEventListener('click', openMenu);
    if (closeDrawer) closeDrawer.addEventListener('click', closeMenu);

    // Close when clicking outside content
    mobileDrawer.addEventListener('click', (e) => {
        if (e.target === mobileDrawer) closeMenu();
    });

    // Close when link is clicked
    mobileDrawer.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeMenu);
    });
}

// ----------------------------------------------------------------------------
// FAQ ACCORDION HANDLER
// ----------------------------------------------------------------------------
function initFaqAccordion() {
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const questionBtn = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        if (!questionBtn || !answer) return;

        questionBtn.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // Close other items
            faqItems.forEach(other => {
                other.classList.remove('active');
                const otherAnswer = other.querySelector('.faq-answer');
                if (otherAnswer) otherAnswer.style.maxHeight = null;
            });

            // Toggle current item
            if (!isActive) {
                item.classList.add('active');
                answer.style.maxHeight = answer.scrollHeight + 'px';
            }
        });
    });
}

// ----------------------------------------------------------------------------
// STICKY HEADER SCROLL EFFECT
// ----------------------------------------------------------------------------
function initHeaderScrollEffect() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 30) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }, { passive: true });
}

// Run on DOM loaded
document.addEventListener('DOMContentLoaded', () => {
    initSupabase();
    hydrateClinicInfo();
    initMobileNavigation();
    initFaqAccordion();
    initHeaderScrollEffect();
});
