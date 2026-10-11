const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('====================================================');
console.log('NAMYA BLISSFULL LEARNING CENTER - COMPREHENSIVE AUDIT');
console.log('====================================================\n');

let totalErrors = 0;
let totalWarnings = 0;

function reportPass(msg) {
    console.log(`  [PASS] ${msg}`);
}
function reportFail(msg) {
    totalErrors++;
    console.error(`  [FAIL] ${msg}`);
}
function reportWarn(msg) {
    totalWarnings++;
    console.warn(`  [WARN] ${msg}`);
}

const BASE_DIR = path.join(__dirname, '..');
const PAGES = ['index.html', 'about.html', 'services.html', 'appointment.html', 'contact.html', 'admin.html'];

// 1. Check file existence
console.log('TEST SUITE 1: Checking Core Files Existence...');
const REQUIRED_FILES = [
    'index.html',
    'about.html',
    'services.html',
    'appointment.html',
    'contact.html',
    'admin.html',
    'css/style.css',
    'css/admin.css',
    'js/config.js',
    'js/main.js',
    'js/services.js',
    'js/appointment.js',
    'js/admin.js',
    'supabase/schema.sql',
    'supabase/policies.sql',
    'supabase/seed.sql',
    'robots.txt',
    'sitemap.xml',
    '_headers',
    '_redirects',
    '.gitignore',
    'README.md'
];

REQUIRED_FILES.forEach(file => {
    const fullPath = path.join(BASE_DIR, file);
    if (fs.existsSync(fullPath)) {
        reportPass(`Found: ${file}`);
    } else {
        reportFail(`Missing required file: ${file}`);
    }
});

// 2. HTTP Server Endpoint Status Check
console.log('\nTEST SUITE 2: HTTP Endpoint Status Verification on http://localhost:8085...');
async function checkUrl(urlPath) {
    return new Promise((resolve) => {
        const req = http.get(`http://localhost:8085/${urlPath}`, (res) => {
            if (res.statusCode === 200 || res.statusCode === 304) {
                reportPass(`HTTP GET /${urlPath} => Status ${res.statusCode} OK`);
                resolve(true);
            } else {
                reportFail(`HTTP GET /${urlPath} => Status ${res.statusCode}`);
                resolve(false);
            }
        });
        req.on('error', (err) => {
            reportFail(`HTTP GET /${urlPath} Connection Error: ${err.message}`);
            resolve(false);
        });
    });
}

async function runHttpTests() {
    for (const page of PAGES) {
        await checkUrl(page);
    }
    await checkUrl('css/style.css');
    await checkUrl('css/admin.css');
    await checkUrl('js/config.js');
    await checkUrl('js/main.js');
    await checkUrl('js/services.js');
    await checkUrl('js/appointment.js');
    await checkUrl('js/admin.js');
}

// 3. Static Code Audit: Verify All Element IDs referenced in JS exist in HTML
console.log('\nTEST SUITE 3: DOM ID Mapping Integrity...');
function checkIdIntegrity() {
    // Audit appointment.html vs js/appointment.js
    const apptHtml = fs.readFileSync(path.join(BASE_DIR, 'appointment.html'), 'utf8');
    const apptJs = fs.readFileSync(path.join(BASE_DIR, 'js/appointment.js'), 'utf8');

    const apptIds = [
        'appointmentDate',
        'slotsContainer',
        'slotStatusMessage',
        'morningSlotsGrid',
        'eveningSlotsGrid',
        'selectedSlotDisplay',
        'appointmentTime',
        'patientName',
        'patientNameError',
        'patientPhone',
        'patientPhoneError',
        'patientEmail',
        'patientEmailError',
        'appointmentService',
        'visitReason',
        'consentCheckbox',
        'submitBookingBtn',
        'bookingForm',
        'bookingConfirmationModal',
        'modalRefCode',
        'modalPatientName',
        'modalDate',
        'modalTime',
        'modalService',
        'modalWhatsAppBtn',
        'closeModalBtn'
    ];

    console.log('Checking appointment.html DOM IDs:');
    apptIds.forEach(id => {
        if (apptHtml.includes(`id="${id}"`)) {
            reportPass(`appointment.html contains #${id}`);
        } else {
            reportFail(`appointment.html missing ID #${id} referenced in appointment.js!`);
        }
    });

    // Audit admin.html vs js/admin.js
    const adminHtml = fs.readFileSync(path.join(BASE_DIR, 'admin.html'), 'utf8');
    const adminIds = [
        'adminAuthScreen',
        'adminAppScreen',
        'adminUserEmail',
        'loginEmail',
        'loginPassword',
        'loginSubmitBtn',
        'adminLoginForm',
        'adminLogoutBtn',
        'metricToday',
        'metricUpcoming',
        'metricPending',
        'metricTotal',
        'searchInput',
        'statusFilter',
        'dateFilter',
        'exportCsvBtn',
        'appointmentsTableBody',
        'emptyState',
        'paginationInfo',
        'prevPageBtn',
        'nextPageBtn',
        'blockDate',
        'blockTime',
        'blockReason',
        'blockSlotForm',
        'clinicSettingsForm'
    ];

    console.log('\nChecking admin.html DOM IDs:');
    adminIds.forEach(id => {
        if (adminHtml.includes(`id="${id}"`)) {
            reportPass(`admin.html contains #${id}`);
        } else {
            reportFail(`admin.html missing ID #${id} referenced in admin.js!`);
        }
    });

    // Audit main.js global IDs across pages
    const mainIds = ['demoModeBanner', 'menuToggle', 'mobileDrawer', 'closeDrawer'];
    console.log('\nChecking global navigation IDs:');
    PAGES.forEach(page => {
        const content = fs.readFileSync(path.join(BASE_DIR, page), 'utf8');
        if (page === 'admin.html') return; // Admin has custom layout
        mainIds.forEach(id => {
            if (content.includes(`id="${id}"`)) {
                reportPass(`${page} contains #${id}`);
            } else {
                reportFail(`${page} missing #${id}!`);
            }
        });
    });
}

// 4. Broken Link Checker (all internal <a href="..."> must resolve to a valid file)
console.log('\nTEST SUITE 4: Internal Links Resolution...');
function checkLinks() {
    PAGES.forEach(page => {
        const content = fs.readFileSync(path.join(BASE_DIR, page), 'utf8');
        const hrefRegex = /href="([^"#?]+)(#[^"]*)?(\?[^"]*)?"/g;
        let match;
        while ((match = hrefRegex.exec(content)) !== null) {
            const linkTarget = match[1];
            if (linkTarget.startsWith('http') || linkTarget.startsWith('tel:') || linkTarget.startsWith('mailto:') || linkTarget.startsWith('data:')) {
                continue;
            }
            const targetPath = path.join(BASE_DIR, linkTarget);
            if (fs.existsSync(targetPath)) {
                reportPass(`[${page}] -> href="${linkTarget}" resolves successfully`);
            } else {
                reportFail(`[${page}] -> Broken link to href="${linkTarget}"`);
            }
        }
    });
}

async function main() {
    await runHttpTests();
    checkIdIntegrity();
    checkLinks();

    console.log('\n====================================================');
    console.log(`AUDIT COMPLETE: ${totalErrors} Errors, ${totalWarnings} Warnings`);
    console.log('====================================================');

    process.exit(totalErrors > 0 ? 1 : 0);
}

main();
