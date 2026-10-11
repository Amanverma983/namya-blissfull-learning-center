/**
 * ============================================================================
 * NAMYA BLISSFULL LEARNING CENTER - ADMIN DASHBOARD CONTROLLER
 * Supabase Auth, Appointment Management, Calendar Slot Blocker, Settings Sync & CSV Export
 * ============================================================================
 */

let allAppointments = [];
let filteredAppointments = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 8;
let currentUser = null;

// Initial demonstration data for offline testing
const INITIAL_DEMO_APPOINTMENTS = [
    {
        id: 'demo-1',
        booking_reference: 'NBLC-20261011-9A4B',
        patient_name: 'Aarav Sharma (Sample)',
        patient_phone: '+91 98111 22334',
        patient_email: 'aarav.parent@example.com',
        appointment_date: new Date().toISOString().split('T')[0],
        appointment_time: '10:00',
        service_name: 'Comprehensive Child Developmental Assessment',
        reason_for_visit: 'Routine milestone assessment and early kindergarten readiness review.',
        status: 'confirmed',
        created_at: new Date().toISOString()
    },
    {
        id: 'demo-2',
        booking_reference: 'NBLC-20261011-8C1D',
        patient_name: 'Meera Nair (Sample)',
        patient_phone: '+91 98222 33445',
        patient_email: 'meera.parent@example.com',
        appointment_date: new Date().toISOString().split('T')[0],
        appointment_time: '11:30',
        service_name: 'Speech & Language Therapy Consultation',
        reason_for_visit: 'Speech articulation checkup and language delay guidance.',
        status: 'pending',
        created_at: new Date().toISOString()
    },
    {
        id: 'demo-3',
        booking_reference: 'NBLC-20261012-3E7F',
        patient_name: 'Rohan Verma (Sample)',
        patient_phone: '+91 98333 44556',
        patient_email: 'rohan.family@example.com',
        appointment_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        appointment_time: '16:30',
        service_name: 'Behavioral Guidance & Parent Counseling',
        reason_for_visit: 'Attention span guidance and bedtime routine regulation.',
        status: 'confirmed',
        created_at: new Date().toISOString()
    },
    {
        id: 'demo-4',
        booking_reference: 'NBLC-20261013-5A2C',
        patient_name: 'Ananya Patel (Sample)',
        patient_phone: '+91 98444 55667',
        patient_email: 'ananya.p@example.com',
        appointment_date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
        appointment_time: '17:00',
        service_name: 'Sensory Integration & Occupational Therapy',
        reason_for_visit: 'Fine motor balance and classroom handwriting practice.',
        status: 'pending',
        created_at: new Date().toISOString()
    }
];

// ----------------------------------------------------------------------------
// AUTHENTICATION MANAGEMENT
// ----------------------------------------------------------------------------
async function checkAuthSession() {
    if (supabaseClient) {
        try {
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            if (session && !error) {
                currentUser = session.user;
                renderAuthenticatedUI(currentUser.email);
                loadAppointmentsFromSupabase();
                return;
            }
        } catch (e) {
            console.warn('Session check error:', e);
        }
    }

    // Check Demo Local Auth
    const demoUser = sessionStorage.getItem('namya_demo_admin_logged_in');
    if (demoUser) {
        currentUser = { email: demoUser };
        renderAuthenticatedUI(demoUser);
        loadLocalDemoAppointments();
    } else {
        renderUnauthenticatedUI();
    }
}

function renderAuthenticatedUI(email) {
    document.getElementById('adminAuthScreen').style.display = 'none';
    document.getElementById('adminAppScreen').style.display = 'block';
    document.getElementById('adminUserEmail').textContent = email;
}

function renderUnauthenticatedUI() {
    document.getElementById('adminAuthScreen').style.display = 'flex';
    document.getElementById('adminAppScreen').style.display = 'none';
}

async function handleAdminLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const loginBtn = document.getElementById('loginSubmitBtn');
    const originalText = loginBtn.textContent;

    loginBtn.disabled = true;
    loginBtn.textContent = 'Authenticating...';

    try {
        if (supabaseClient) {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            currentUser = data.user;
            showToast('Welcome back, Admin!', 'success');
            renderAuthenticatedUI(currentUser.email);
            loadAppointmentsFromSupabase();
        } else {
            // Local Demo Authentication Mode
            await new Promise(r => setTimeout(r, 400));
            // Demo credentials: admin@namyablissfull.com / admin123
            if (password.length >= 6) {
                sessionStorage.setItem('namya_demo_admin_logged_in', email);
                currentUser = { email };
                showToast('Logged in (Local Demo Mode)', 'success');
                renderAuthenticatedUI(email);
                loadLocalDemoAppointments();
            } else {
                throw new Error('Please enter a password with at least 6 characters.');
            }
        }
    } catch (err) {
        console.error('Login error:', err);
        showToast(err.message || 'Invalid email or password.', 'error');
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = originalText;
    }
}

async function handleAdminLogout() {
    if (supabaseClient) {
        await supabaseClient.auth.signOut();
    }
    sessionStorage.removeItem('namya_demo_admin_logged_in');
    currentUser = null;
    showToast('Logged out successfully.', 'info');
    renderUnauthenticatedUI();
}

// ----------------------------------------------------------------------------
// DATA FETCHING & STATE
// ----------------------------------------------------------------------------
async function loadAppointmentsFromSupabase() {
    try {
        const { data, error } = await supabaseClient
            .from('appointments')
            .select('*')
            .order('appointment_date', { ascending: true })
            .order('appointment_time', { ascending: true });

        if (error) throw error;

        allAppointments = data || [];
        applyFiltersAndSearch();
        updateDashboardMetrics();
    } catch (err) {
        console.error('Error fetching Supabase appointments:', err);
        showToast('Could not load cloud appointments. Falling back to demo data.', 'warning');
        loadLocalDemoAppointments();
    }
}

function loadLocalDemoAppointments() {
    let saved = localStorage.getItem('namya_clinic_demo_appointments');
    if (!saved) {
        localStorage.setItem('namya_clinic_demo_appointments', JSON.stringify(INITIAL_DEMO_APPOINTMENTS));
        allAppointments = [...INITIAL_DEMO_APPOINTMENTS];
    } else {
        try {
            allAppointments = JSON.parse(saved);
        } catch (e) {
            allAppointments = [...INITIAL_DEMO_APPOINTMENTS];
        }
    }
    applyFiltersAndSearch();
    updateDashboardMetrics();
}

// ----------------------------------------------------------------------------
// METRICS COMPUTATION
// ----------------------------------------------------------------------------
function updateDashboardMetrics() {
    const todayStr = new Date().toISOString().split('T')[0];

    const totalCount = allAppointments.length;
    const todayCount = allAppointments.filter(a => a.appointment_date === todayStr && a.status !== 'cancelled').length;
    const upcomingCount = allAppointments.filter(a => a.appointment_date > todayStr && a.status !== 'cancelled').length;
    const pendingCount = allAppointments.filter(a => a.status === 'pending').length;

    document.getElementById('metricTotal').textContent = totalCount;
    document.getElementById('metricToday').textContent = todayCount;
    document.getElementById('metricUpcoming').textContent = upcomingCount;
    document.getElementById('metricPending').textContent = pendingCount;
}

// ----------------------------------------------------------------------------
// SEARCH & FILTERING
// ----------------------------------------------------------------------------
function applyFiltersAndSearch() {
    const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    const dateFilter = document.getElementById('dateFilter')?.value || '';

    filteredAppointments = allAppointments.filter(item => {
        // Status filter
        if (statusFilter !== 'all' && item.status !== statusFilter) return false;

        // Date filter
        if (dateFilter && item.appointment_date !== dateFilter) return false;

        // Text search (Patient name, reference, phone, or service)
        if (searchTerm) {
            const matchName = item.patient_name?.toLowerCase().includes(searchTerm);
            const matchRef = item.booking_reference?.toLowerCase().includes(searchTerm);
            const matchPhone = item.patient_phone?.toLowerCase().includes(searchTerm);
            const matchService = item.service_name?.toLowerCase().includes(searchTerm);
            if (!matchName && !matchRef && !matchPhone && !matchService) return false;
        }

        return true;
    });

    currentPage = 1;
    renderAppointmentsTable();
}

// ----------------------------------------------------------------------------
// RENDER TABLE & PAGINATION
// ----------------------------------------------------------------------------
function renderAppointmentsTable() {
    const tbody = document.getElementById('appointmentsTableBody');
    const emptyState = document.getElementById('emptyState');
    const paginationInfo = document.getElementById('paginationInfo');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');

    if (!tbody) return;

    if (filteredAppointments.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        if (paginationInfo) paginationInfo.textContent = '0 records found';
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    const totalPages = Math.ceil(filteredAppointments.length / ITEMS_PER_PAGE);
    currentPage = Math.min(Math.max(currentPage, 1), totalPages);

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const pageItems = filteredAppointments.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    tbody.innerHTML = '';

    pageItems.forEach(appt => {
        const tr = document.createElement('tr');

        // Status badge class
        const statusClass = `badge-status ${appt.status}`;

        // Format time 12hr
        let timeFormatted = appt.appointment_time || '';
        if (timeFormatted.includes(':')) {
            const parts = timeFormatted.split(':');
            const h = parseInt(parts[0], 10);
            const m = parts[1];
            const ampm = h >= 12 ? 'PM' : 'AM';
            const displayH = h % 12 || 12;
            timeFormatted = `${displayH}:${m} ${ampm}`;
        }

        // Prepare pre-formatted WhatsApp message based on status
        const cleanPhone = (appt.patient_phone || '').replace(/[^0-9]/g, '');
        const phoneWithCountry = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
        let waText = `Hello ${appt.patient_name}, regarding your appointment (Ref: ${appt.booking_reference}) at Namya Blissfull Learning Center for ${appt.appointment_date} at ${timeFormatted}.`;
        if (appt.status === 'confirmed') {
            waText = `Dear ${appt.patient_name},\n\nYour appointment at Namya Blissfull Learning Center has been CONFIRMED!\n\n📋 Booking Ref: ${appt.booking_reference}\n📅 Date: ${appt.appointment_date}\n⏰ Time: ${timeFormatted}\n🩺 Service: ${appt.service_name}\n📍 Address: Plot 42, Blissfull Health Avenue, New Delhi\n\nPlease arrive 10 minutes prior to your slot. Thank you!`;
        } else if (appt.status === 'rejected') {
            waText = `Dear ${appt.patient_name},\n\nRegarding your appointment request (${appt.booking_reference}) at Namya Blissfull Learning Center: unfortunately this slot could not be accommodated. Please let us know if you would like to reschedule for an alternate time. Thank you!`;
        }
        const waUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(waText)}`;

        tr.innerHTML = `
            <td>
                <span class="ref-code">${escapeHtml(appt.booking_reference)}</span>
            </td>
            <td>
                <div class="patient-cell">
                    <span class="patient-name">${escapeHtml(appt.patient_name)}</span>
                    <div class="patient-contact">
                        <span>📞 ${escapeHtml(appt.patient_phone)}</span>
                        <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="whatsapp-chat-pill" title="Send WhatsApp Confirmation to Patient">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"></path></svg>
                            <span>WhatsApp</span>
                        </a>
                    </div>
                </div>
            </td>
            <td>
                <strong>${escapeHtml(appt.appointment_date)}</strong><br>
                <small class="text-muted">${timeFormatted}</small>
            </td>
            <td>
                <span style="font-weight: 500;">${escapeHtml(appt.service_name)}</span>
                ${appt.reason_for_visit ? `<br><small class="text-muted" title="${escapeHtml(appt.reason_for_visit)}">Note: ${escapeHtml(appt.reason_for_visit.substring(0, 30))}...</small>` : ''}
            </td>
            <td>
                <span class="${statusClass}">${escapeHtml(appt.status)}</span>
            </td>
            <td>
                <div class="action-buttons">
                    ${appt.status === 'pending' ? `
                        <button type="button" class="btn-action btn-approve" data-id="${escapeHtml(appt.id)}" data-action="confirmed" title="Approve this appointment">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            <span>Approve</span>
                        </button>
                        <button type="button" class="btn-action btn-reject" data-id="${escapeHtml(appt.id)}" data-action="rejected" title="Reject this appointment">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            <span>Reject</span>
                        </button>
                    ` : ''}

                    ${appt.status === 'confirmed' ? `
                        <button type="button" class="btn-action btn-complete" data-id="${escapeHtml(appt.id)}" data-action="completed" title="Mark as Completed">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                            <span>Complete</span>
                        </button>
                        <button type="button" class="btn-action btn-cancel" data-id="${escapeHtml(appt.id)}" data-action="cancelled" title="Cancel Appointment">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                            <span>Cancel</span>
                        </button>
                    ` : ''}

                    ${appt.status === 'completed' ? `
                        <span style="font-size:0.8rem; color:var(--emerald-600); font-weight:600; display:inline-flex; align-items:center; gap:0.25rem;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Completed
                        </span>
                    ` : ''}

                    ${appt.status === 'cancelled' || appt.status === 'rejected' ? `
                        <button type="button" class="btn-action btn-approve" data-id="${escapeHtml(appt.id)}" data-action="confirmed" title="Re-open & Approve">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            <span>Re-open</span>
                        </button>
                    ` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (paginationInfo) {
        paginationInfo.textContent = `Showing ${startIndex + 1} to ${Math.min(startIndex + ITEMS_PER_PAGE, filteredAppointments.length)} of ${filteredAppointments.length} bookings (Page ${currentPage} of ${totalPages})`;
    }
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

// ----------------------------------------------------------------------------
// APPOINTMENT STATUS ACTIONS (APPROVE, REJECT, COMPLETE, CANCEL)
// Instant non-blocking execution with feedback toast and persistence
// ----------------------------------------------------------------------------
async function updateAppointmentStatus(id, newStatus) {
    if (!id || !newStatus) return;

    try {
        if (supabaseClient) {
            const { error } = await supabaseClient
                .from('appointments')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;
        } else {
            // Local Demo Mode Persistence
            const target = allAppointments.find(a => a.id === id);
            if (target) {
                target.status = newStatus;
                localStorage.setItem('namya_clinic_demo_appointments', JSON.stringify(allAppointments));
            }
        }

        // Update in-memory state
        const item = allAppointments.find(a => a.id === id);
        if (item) item.status = newStatus;

        applyFiltersAndSearch();
        updateDashboardMetrics();

        // Informative Toast Notification
        let toastMsg = `Appointment status set to ${newStatus.toUpperCase()}.`;
        let toastType = 'success';
        if (newStatus === 'confirmed') {
            toastMsg = `Appointment APPROVED! Click the green WhatsApp button in the row to send confirmation to patient.`;
            toastType = 'success';
        } else if (newStatus === 'rejected') {
            toastMsg = `Appointment REJECTED.`;
            toastType = 'warning';
        } else if (newStatus === 'completed') {
            toastMsg = `Appointment marked as COMPLETED!`;
            toastType = 'success';
        } else if (newStatus === 'cancelled') {
            toastMsg = `Appointment CANCELLED.`;
            toastType = 'warning';
        }
        showToast(toastMsg, toastType);
    } catch (err) {
        console.error('Status update failed:', err);
        showToast('Failed to update status. Please try again.', 'error');
    }
}
window.updateAppointmentStatus = updateAppointmentStatus;

// Delegated click handler so clicking anywhere on the button works reliably
document.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const action = btn.getAttribute('data-action');
    if (id && action) {
        e.preventDefault();
        updateAppointmentStatus(id, action);
    }
});

// ----------------------------------------------------------------------------
// EXPORT TO CSV
// ----------------------------------------------------------------------------
function exportAppointmentsToCsv() {
    if (filteredAppointments.length === 0) {
        showToast('No records available to export.', 'warning');
        return;
    }

    const headers = ['Booking Reference', 'Patient Name', 'Phone', 'Email', 'Date', 'Time', 'Service', 'Status', 'Reason for Visit', 'Created At'];
    const rows = filteredAppointments.map(a => [
        `"${(a.booking_reference || '').replace(/"/g, '""')}"`,
        `"${(a.patient_name || '').replace(/"/g, '""')}"`,
        `"${(a.patient_phone || '').replace(/"/g, '""')}"`,
        `"${(a.patient_email || '').replace(/"/g, '""')}"`,
        `"${a.appointment_date || ''}"`,
        `"${a.appointment_time || ''}"`,
        `"${(a.service_name || '').replace(/"/g, '""')}"`,
        `"${a.status || ''}"`,
        `"${(a.reason_for_visit || '').replace(/"/g, '""')}"`,
        `"${a.created_at || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.setAttribute('href', url);
    downloadLink.setAttribute('download', `Namya_Clinic_Appointments_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    showToast('Appointment data exported to CSV successfully.', 'success');
}

// ----------------------------------------------------------------------------
// CALENDAR SLOT BLOCKING / CLINIC HOLIDAYS
// ----------------------------------------------------------------------------
async function handleBlockSlotSubmission(e) {
    e.preventDefault();
    const blockDate = document.getElementById('blockDate').value;
    const blockTime = document.getElementById('blockTime').value || null;
    const blockReason = document.getElementById('blockReason').value.trim() || 'Clinic Holiday / Doctor Unavailable';

    if (!blockDate) {
        showToast('Please pick a date to block.', 'error');
        return;
    }

    try {
        if (supabaseClient) {
            const { error } = await supabaseClient.from('blocked_slots').insert([{
                blocked_date: blockDate,
                blocked_time: blockTime,
                reason: blockReason
            }]);
            if (error) throw error;
        }

        showToast(`Slot on ${blockDate} has been blocked.`, 'success');
        document.getElementById('blockSlotForm').reset();
    } catch (err) {
        console.error('Failed to block slot:', err);
        showToast('Could not block slot: ' + (err.message || 'Unknown error'), 'error');
    }
}

// ----------------------------------------------------------------------------
// CLINIC PROFILE SETTINGS UPDATE
// ----------------------------------------------------------------------------
async function handleSettingsUpdate(e) {
    e.preventDefault();
    const settings = {
        doctor_name: document.getElementById('settingDoctorName').value.trim(),
        qualifications: document.getElementById('settingQualifications').value.trim(),
        specialization: document.getElementById('settingSpecialization').value.trim(),
        registration_no: document.getElementById('settingRegNo').value.trim(),
        phone: document.getElementById('settingPhone').value.trim(),
        whatsapp_number: document.getElementById('settingWhatsApp').value.trim(),
        opening_hours_text: document.getElementById('settingHours').value.trim()
    };

    try {
        if (supabaseClient) {
            const { error } = await supabaseClient
                .from('clinic_settings')
                .update(settings)
                .neq('id', '00000000-0000-0000-0000-000000000000'); // update all settings rows

            if (error) throw error;
        }

        showToast('Clinic settings updated successfully!', 'success');
    } catch (err) {
        console.error('Settings update error:', err);
        showToast('Error saving settings: ' + err.message, 'error');
    }
}

// ----------------------------------------------------------------------------
// TABS NAVIGATION & EVENT SETUP
// ----------------------------------------------------------------------------
function initAdminTabs() {
    const tabButtons = document.querySelectorAll('.admin-tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            tabButtons.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const targetPane = document.getElementById(targetTab);
            if (targetPane) targetPane.classList.add('active');
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuthSession();
    initAdminTabs();

    // Login & Logout
    const loginForm = document.getElementById('adminLoginForm');
    if (loginForm) loginForm.addEventListener('submit', handleAdminLogin);

    const logoutBtn = document.getElementById('adminLogoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleAdminLogout);

    // Filters
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('input', applyFiltersAndSearch);

    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) statusFilter.addEventListener('change', applyFiltersAndSearch);

    const dateFilter = document.getElementById('dateFilter');
    if (dateFilter) dateFilter.addEventListener('change', applyFiltersAndSearch);

    // Export
    const exportBtn = document.getElementById('exportCsvBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportAppointmentsToCsv);

    // Pagination
    const prevBtn = document.getElementById('prevPageBtn');
    if (prevBtn) prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderAppointmentsTable();
        }
    });

    const nextBtn = document.getElementById('nextPageBtn');
    if (nextBtn) nextBtn.addEventListener('click', () => {
        currentPage++;
        renderAppointmentsTable();
    });

    // Forms
    const blockSlotForm = document.getElementById('blockSlotForm');
    if (blockSlotForm) blockSlotForm.addEventListener('submit', handleBlockSlotSubmission);

    const settingsForm = document.getElementById('clinicSettingsForm');
    if (settingsForm) settingsForm.addEventListener('submit', handleSettingsUpdate);
});
