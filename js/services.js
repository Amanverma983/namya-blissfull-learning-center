/**
 * ============================================================================
 * NAMYA BLISSFULL LEARNING CENTER - SERVICES CATALOG HANDLER
 * Dynamically loads and renders services with interactive filters
 * ============================================================================
 */

const DEFAULT_SERVICES = [
    {
        id: 'b0000000-0000-0000-0000-000000000001',
        name: 'Comprehensive Child Developmental Assessment',
        category: 'Assessments',
        description: 'Holistic evaluation of developmental milestones, cognitive milestones, fine/gross motor skills, social responsiveness, and school readiness.',
        price: 1500,
        duration_minutes: 45,
        icon: 'clipboard-check'
    },
    {
        id: 'b0000000-0000-0000-0000-000000000002',
        name: 'Speech & Language Therapy Consultation',
        category: 'Therapy',
        description: 'Dedicated evaluation and structured therapy plans for speech delay, articulation, receptive language, and early conversational development.',
        price: 1200,
        duration_minutes: 30,
        icon: 'message-circle'
    },
    {
        id: 'b0000000-0000-0000-0000-000000000003',
        name: 'Behavioral Guidance & Parent Counseling',
        category: 'Counseling',
        description: 'Constructive strategies for temper tantrums, hyperactivity, anxiety, sleep routines, emotional regulation, and positive parent-child bonding.',
        price: 1400,
        duration_minutes: 45,
        icon: 'heart'
    },
    {
        id: 'b0000000-0000-0000-0000-000000000004',
        name: 'Sensory Integration & Occupational Therapy',
        category: 'Therapy',
        description: 'Individualized sensory exercises targeting sensory processing sensitivities, posture tone, motor coordination, and self-care skills.',
        price: 1300,
        duration_minutes: 45,
        icon: 'activity'
    },
    {
        id: 'b0000000-0000-0000-0000-000000000005',
        name: 'Remedial Learning & School Readiness Program',
        category: 'Education & Support',
        description: 'Specialized educational sessions addressing dyslexia, dysgraphia, attention span, numeracy comprehension, and classroom engagement.',
        price: 1100,
        duration_minutes: 45,
        icon: 'book-open'
    },
    {
        id: 'b0000000-0000-0000-0000-000000000006',
        name: 'General Pediatric Wellness & Growth Monitoring',
        category: 'General Pediatrics',
        description: 'Comprehensive physical health review, nutritional guidance, vaccination screening, and physical growth tracking for infants and growing children.',
        price: 800,
        duration_minutes: 30,
        icon: 'shield'
    }
];

async function fetchServices() {
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('services')
                .select('*')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            if (data && data.length > 0 && !error) {
                return data;
            }
        } catch (err) {
            console.warn('Fallback to default services catalog:', err);
        }
    }
    return DEFAULT_SERVICES;
}

function getServiceIconSvg(iconName) {
    const icons = {
        'clipboard-check': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="m9 14 2 2 4-4"></path></svg>`,
        'message-circle': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"></path></svg>`,
        'heart': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>`,
        'activity': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>`,
        'book-open': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`,
        'shield': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`
    };
    return icons[iconName] || icons['clipboard-check'];
}

async function renderServices(containerId = 'servicesGrid') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem;"><p>Loading services catalog...</p></div>`;

    const services = await fetchServices();
    container.innerHTML = '';

    services.forEach(service => {
        const card = document.createElement('div');
        card.className = 'service-card';

        const priceText = service.price 
            ? `${CONFIG.CLINIC.currencySymbol} ${parseFloat(service.price).toLocaleString()}` 
            : 'Enquire for details';

        const bookingUrl = `appointment.html?service=${encodeURIComponent(service.name)}`;

        card.innerHTML = `
            <div class="service-icon-box">
                ${getServiceIconSvg(service.icon || 'clipboard-check')}
            </div>
            <h3>${escapeHtml(service.name)}</h3>
            <p>${escapeHtml(service.description)}</p>
            <div class="service-footer">
                <div class="service-price">
                    <span class="label">Consultation Fee</span>
                    <span class="amount">${priceText}</span>
                </div>
                <a href="${bookingUrl}" class="btn btn-primary btn-sm">
                    Book Slot
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </a>
            </div>
        `;

        container.appendChild(card);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('servicesGrid')) {
        renderServices('servicesGrid');
    }
});
