/**
 * ============================================================================
 * NAMYA BLISSFULL LEARNING CENTER - APPOINTMENT BOOKING ENGINE
 * Dynamic slot availability checking, client-side validation & atomic submission
 * ============================================================================
 */

let selectedSlotTime = null;
let currentBookedSlots = new Set();

// Mock appointments storage for local demo testing before Supabase keys are configured
const LOCAL_STORAGE_KEY = 'namya_clinic_demo_appointments';
function getLocalDemoAppointments() {
    try {
        const data = localStorage.getItem(LOCAL_STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
}
function saveLocalDemoAppointment(appt) {
    const list = getLocalDemoAppointments();
    list.push(appt);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
}

// ----------------------------------------------------------------------------
// INITIALIZE DATE PICKER (RESTRICT TO TODAY & NEXT 30 DAYS)
// ----------------------------------------------------------------------------
function initDatePicker() {
    const dateInput = document.getElementById('appointmentDate');
    if (!dateInput) return;

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const minDateStr = `${yyyy}-${mm}-${dd}`;

    // Max date (30 days ahead)
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + (CONFIG.SCHEDULE.daysAdvanceMax || 30));
    const maxYYYY = maxDate.getFullYear();
    const maxMM = String(maxDate.getMonth() + 1).padStart(2, '0');
    const maxDD = String(maxDate.getDate()).padStart(2, '0');
    const maxDateStr = `${maxYYYY}-${maxMM}-${maxDD}`;

    dateInput.min = minDateStr;
    dateInput.max = maxDateStr;

    // Set default value to tomorrow if today's evening passed or today
    const currentHour = today.getHours();
    if (currentHour >= 19) {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tYYYY = tomorrow.getFullYear();
        const tMM = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const tDD = String(tomorrow.getDate()).padStart(2, '0');
        dateInput.value = `${tYYYY}-${tMM}-${tDD}`;
    } else {
        dateInput.value = minDateStr;
    }

    // Refresh slots on date change
    dateInput.addEventListener('change', () => {
        selectedSlotTime = null;
        updateSelectedSlotDisplay();
        fetchAvailableSlotsForDate(dateInput.value);
    });

    // Trigger initial slot load
    fetchAvailableSlotsForDate(dateInput.value);
}

// ----------------------------------------------------------------------------
// FETCH REAL-TIME BOOKED SLOTS FOR SELECTED DATE
// ----------------------------------------------------------------------------
async function fetchAvailableSlotsForDate(selectedDate) {
    const slotContainer = document.getElementById('slotsContainer');
    const slotStatusMessage = document.getElementById('slotStatusMessage');
    if (!slotContainer) return;

    if (slotStatusMessage) {
        slotStatusMessage.textContent = 'Checking slot availability...';
        slotStatusMessage.className = 'slot-status-info text-muted';
    }

    currentBookedSlots.clear();

    // Check if Sunday (clinic closed)
    const dateObj = new Date(selectedDate + 'T00:00:00');
    if (dateObj.getDay() === 0) { // 0 = Sunday
        if (slotStatusMessage) {
            slotStatusMessage.textContent = 'Clinic is closed on Sundays. Please select a Monday to Saturday date.';
            slotStatusMessage.className = 'slot-status-info text-warning';
        }
        renderSlotButtons([]);
        return;
    }

    try {
        if (supabaseClient) {
            // Live Database Query via Safe RPC
            const { data, error } = await supabaseClient.rpc('get_booked_slots_safe', {
                p_date: selectedDate
            });

            if (error) {
                console.warn('RPC call failed, checking standard appointments fallback:', error);
                throw error;
            }

            if (data && Array.isArray(data)) {
                data.forEach(row => {
                    if (row.booked_time === 'ALL_DAY') {
                        currentBookedSlots.add('ALL_DAY');
                    } else if (row.booked_time) {
                        currentBookedSlots.add(row.booked_time);
                    }
                });
            }
        } else {
            // Local Demo Mode Fallback
            const localAppts = getLocalDemoAppointments();
            localAppts.forEach(item => {
                if (item.appointment_date === selectedDate && item.status !== 'cancelled' && item.status !== 'rejected') {
                    currentBookedSlots.add(item.appointment_time);
                }
            });
        }

        if (currentBookedSlots.has('ALL_DAY')) {
            if (slotStatusMessage) {
                slotStatusMessage.textContent = 'The doctor is unavailable on this date (Special Leave/Holiday).';
                slotStatusMessage.className = 'slot-status-info text-danger';
            }
            renderSlotButtons([]);
            return;
        }

        renderSlotButtons();
        if (slotStatusMessage) {
            slotStatusMessage.textContent = 'Select your preferred consultation time slot:';
            slotStatusMessage.className = 'slot-status-info text-success';
        }

    } catch (err) {
        console.error('Error fetching booked slots:', err);
        renderSlotButtons(); // render available slots default
        if (slotStatusMessage) {
            slotStatusMessage.textContent = 'Available slots loaded. Real-time availability will be validated on booking.';
            slotStatusMessage.className = 'slot-status-info text-muted';
        }
    }
}

// ----------------------------------------------------------------------------
// RENDER INTERACTIVE TIME SLOT BUTTONS
// ----------------------------------------------------------------------------
function renderSlotButtons() {
    const morningContainer = document.getElementById('morningSlotsGrid');
    const eveningContainer = document.getElementById('eveningSlotsGrid');
    if (!morningContainer || !eveningContainer) return;

    morningContainer.innerHTML = '';
    eveningContainer.innerHTML = '';

    const dateInput = document.getElementById('appointmentDate');
    const selectedDateStr = dateInput ? dateInput.value : '';
    const now = new Date();
    const isToday = selectedDateStr === `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    function createSlotButton(timeStr) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'slot-btn';
        btn.dataset.time = timeStr;

        // Convert HH:MM to 12-hour format for user-friendly display
        const [h, m] = timeStr.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        const displayLabel = `${displayH}:${String(m).padStart(2, '0')} ${ampm}`;
        btn.textContent = displayLabel;

        const slotMinutes = h * 60 + m;

        // Check if slot has already passed today
        const isPastSlot = isToday && (slotMinutes <= currentMinutes + 15);
        // Check if slot is already booked in database
        const isBooked = currentBookedSlots.has(timeStr);

        if (isPastSlot || isBooked) {
            btn.disabled = true;
            btn.classList.add('booked');
            btn.title = isPastSlot ? 'Past time slot' : 'Already reserved';
        } else {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedSlotTime = timeStr;
                updateSelectedSlotDisplay();
                clearFieldError('slotSelectionError');
            });
        }

        return btn;
    }

    // Render Morning Slots
    CONFIG.SCHEDULE.morningSlots.forEach(timeStr => {
        morningContainer.appendChild(createSlotButton(timeStr));
    });

    // Render Evening Slots
    CONFIG.SCHEDULE.eveningSlots.forEach(timeStr => {
        eveningContainer.appendChild(createSlotButton(timeStr));
    });
}

function updateSelectedSlotDisplay() {
    const displayEl = document.getElementById('selectedSlotDisplay');
    const hiddenInput = document.getElementById('appointmentTime');
    if (hiddenInput) hiddenInput.value = selectedSlotTime || '';

    if (displayEl) {
        if (selectedSlotTime) {
            const [h, m] = selectedSlotTime.split(':').map(Number);
            const ampm = h >= 12 ? 'PM' : 'AM';
            const displayH = h % 12 || 12;
            displayEl.innerHTML = `<strong>Selected Time:</strong> <span class="badge-status confirmed">${displayH}:${String(m).padStart(2, '0')} ${ampm}</span>`;
        } else {
            displayEl.innerHTML = `<span class="text-muted">No time slot selected yet.</span>`;
        }
    }
}

// ----------------------------------------------------------------------------
// FORM VALIDATION & ERROR HANDLING
// ----------------------------------------------------------------------------
function setFieldError(fieldId, errorMsg) {
    const errorEl = document.getElementById(`${fieldId}Error`);
    const inputEl = document.getElementById(fieldId);
    if (inputEl) inputEl.classList.add('error');
    if (errorEl) {
        errorEl.textContent = errorMsg;
        errorEl.classList.add('visible');
    }
}

function clearFieldError(fieldId) {
    const errorEl = document.getElementById(`${fieldId}Error`);
    const inputEl = document.getElementById(fieldId);
    if (inputEl) inputEl.classList.remove('error');
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.classList.remove('visible');
    }
}

function validateBookingForm() {
    let isValid = true;

    // 1. Patient Name
    const nameInput = document.getElementById('patientName');
    if (!nameInput.value.trim() || nameInput.value.trim().length < 2) {
        setFieldError('patientName', 'Please provide a valid patient name (at least 2 characters).');
        isValid = false;
    } else {
        clearFieldError('patientName');
    }

    // 2. Phone Number (at least 8-10 digits)
    const phoneInput = document.getElementById('patientPhone');
    const cleanPhone = phoneInput.value.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 8) {
        setFieldError('patientPhone', 'Please provide a valid contact number (at least 8-10 digits).');
        isValid = false;
    } else {
        clearFieldError('patientPhone');
    }

    // 3. Email (optional, but if provided must match format)
    const emailInput = document.getElementById('patientEmail');
    if (emailInput.value.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailInput.value.trim())) {
            setFieldError('patientEmail', 'Please provide a valid email format or leave blank.');
            isValid = false;
        } else {
            clearFieldError('patientEmail');
        }
    } else {
        clearFieldError('patientEmail');
    }

    // 4. Appointment Date
    const dateInput = document.getElementById('appointmentDate');
    const todayStr = new Date().toISOString().split('T')[0];
    if (!dateInput.value || dateInput.value < todayStr) {
        setFieldError('appointmentDate', 'Please select a valid future appointment date.');
        isValid = false;
    } else {
        clearFieldError('appointmentDate');
    }

    // 5. Time Slot
    if (!selectedSlotTime) {
        setFieldError('slotSelection', 'Please click to select an available time slot above.');
        isValid = false;
    } else {
        clearFieldError('slotSelection');
    }

    // 6. Consent Checkbox
    const consentInput = document.getElementById('consentCheckbox');
    if (!consentInput.checked) {
        setFieldError('consent', 'Please check the box to consent to contact and appointment scheduling.');
        isValid = false;
    } else {
        clearFieldError('consent');
    }

    return isValid;
}

// ----------------------------------------------------------------------------
// ATOMIC BOOKING SUBMISSION HANDLER
// ----------------------------------------------------------------------------
async function handleBookingSubmission(event) {
    event.preventDefault();

    if (!validateBookingForm()) {
        showToast('Please correct highlighted fields before submitting.', 'error');
        return;
    }

    const submitBtn = document.getElementById('submitBookingBtn');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
        <svg class="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
        Securing Appointment Slot...
    `;

    const formData = {
        name: document.getElementById('patientName').value.trim(),
        phone: document.getElementById('patientPhone').value.trim(),
        email: document.getElementById('patientEmail').value.trim() || null,
        date: document.getElementById('appointmentDate').value,
        time: selectedSlotTime,
        service: document.getElementById('appointmentService').value,
        reason: document.getElementById('visitReason').value.trim() || null
    };

    try {
        let bookingResult = null;

        if (supabaseClient) {
            // Live Atomic Database RPC Call (Double-Booking Proof)
            const { data, error } = await supabaseClient.rpc('book_appointment_atomic', {
                p_patient_name: formData.name,
                p_patient_phone: formData.phone,
                p_patient_email: formData.email,
                p_appointment_date: formData.date,
                p_appointment_time: formData.time + ':00',
                p_service_name: formData.service,
                p_reason_for_visit: formData.reason
            });

            if (error) {
                console.error('Database booking error:', error);
                throw error;
            }

            bookingResult = data;
        } else {
            // Local Demo Simulation Mode
            // Emulate network latency
            await new Promise(res => setTimeout(res, 600));

            // Verify local collision
            const localAppts = getLocalDemoAppointments();
            const collision = localAppts.find(a => 
                a.appointment_date === formData.date && 
                a.appointment_time === formData.time &&
                a.status !== 'cancelled'
            );

            if (collision) {
                throw new Error('This time slot was just booked by another visitor. Please select a different time.');
            }

            const demoRef = `NBLC-${formData.date.replace(/-/g, '')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            const newBooking = {
                id: 'demo-' + Date.now(),
                booking_reference: demoRef,
                patient_name: formData.name,
                patient_phone: formData.phone,
                patient_email: formData.email,
                appointment_date: formData.date,
                appointment_time: formData.time,
                service_name: formData.service,
                reason_for_visit: formData.reason,
                status: 'pending',
                created_at: new Date().toISOString()
            };

            saveLocalDemoAppointment(newBooking);

            bookingResult = {
                success: true,
                booking_reference: demoRef,
                appointment_date: formData.date,
                appointment_time: formData.time,
                service_name: formData.service,
                status: 'pending'
            };
        }

        // Show Confirmation Modal
        openBookingConfirmationModal(bookingResult, formData);
        showToast('Appointment reserved successfully!', 'success');

        // Reset Form
        document.getElementById('bookingForm').reset();
        selectedSlotTime = null;
        updateSelectedSlotDisplay();
        fetchAvailableSlotsForDate(document.getElementById('appointmentDate').value);

    } catch (err) {
        console.error('Booking failed:', err);
        const errMsg = err.message || 'Booking could not be completed. Please check your slot and try again.';
        showToast(errMsg, 'error', 6000);
        // Refresh slots in case someone took it
        fetchAvailableSlotsForDate(formData.date);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

// ----------------------------------------------------------------------------
// SUCCESS CONFIRMATION MODAL & WHATSAPP CHAT INITIATION
// ----------------------------------------------------------------------------
function openBookingConfirmationModal(result, formData) {
    const modal = document.getElementById('bookingConfirmationModal');
    if (!modal) return;

    document.getElementById('modalRefCode').textContent = result.booking_reference;
    document.getElementById('modalPatientName').textContent = formData.name;
    document.getElementById('modalDate').textContent = result.appointment_date;
    document.getElementById('modalTime').textContent = result.appointment_time;
    document.getElementById('modalService').textContent = result.service_name;

    // Configure Direct WhatsApp Action with pre-filled enquiry message
    const waBtn = document.getElementById('modalWhatsAppBtn');
    if (waBtn) {
        const cleanNumber = CONFIG.CLINIC.whatsapp.replace(/[^0-9]/g, '');
        const message = `Hello Namya Blissfull Learning Center, I just scheduled an appointment.\n\nBooking Ref: ${result.booking_reference}\nPatient Name: ${formData.name}\nDate: ${result.appointment_date}\nTime: ${result.appointment_time}\nService: ${result.service_name}\n\nPlease let me know if any pre-consultation details are needed. Thank you!`;
        waBtn.href = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
    }

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeBookingConfirmationModal() {
    const modal = document.getElementById('bookingConfirmationModal');
    if (modal) {
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }
}

// ----------------------------------------------------------------------------
// INITIALIZE FROM URL QUERY PARAMETERS (e.g. ?service=...)
// ----------------------------------------------------------------------------
function checkUrlParameters() {
    const params = new URLSearchParams(window.location.search);
    const serviceParam = params.get('service');
    if (serviceParam) {
        const serviceSelect = document.getElementById('appointmentService');
        if (serviceSelect) {
            // Find matching option or add temporary option
            let found = false;
            for (let i = 0; i < serviceSelect.options.length; i++) {
                if (serviceSelect.options[i].value.toLowerCase() === serviceParam.toLowerCase()) {
                    serviceSelect.selectedIndex = i;
                    found = true;
                    break;
                }
            }
            if (!found) {
                const opt = document.createElement('option');
                opt.value = serviceParam;
                opt.textContent = serviceParam;
                opt.selected = true;
                serviceSelect.appendChild(opt);
            }
        }
    }
}

// Setup Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initDatePicker();
    checkUrlParameters();

    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', handleBookingSubmission);
    }

    const closeModalBtn = document.getElementById('closeModalBtn');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeBookingConfirmationModal);
    }

    const modal = document.getElementById('bookingConfirmationModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeBookingConfirmationModal();
        });
    }
});
