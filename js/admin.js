/**
 * Next Stop Admin Portal Logic
 * Isolated logic specifically for the admin.html page.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Check for existing Supabase session
    const { data: { session }, error } = await window.supabaseClient.auth.getSession();

    setTimeout(() => {
        const persistedRole = localStorage.getItem('nextstop_role');
        if (session || persistedRole === 'admin') {
            // Since we don't have role checks yet, just assume if they have a session they are valid
            // In a real app we'd check `session.user.user_metadata.role === 'admin'` Here.
            showAdminDashboard();
        } else {
            // Not logged in
            showView('view-admin-login');
        }
    }, 1000);

    setupAdminInteractions();
});

// --- UTILITY: IMAGE COMPRESSION ---
async function compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        // Return as a standard image/jpeg File
                        const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });
                        resolve(compressedFile);
                    } else {
                        reject(new Error('Canvas to Blob failed'));
                    }
                }, 'image/jpeg', quality);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
}

// --- NAVIGATION UTILS ---
function showView(viewId) {
    const views = document.querySelectorAll('.view');
    views.forEach(v => v.classList.remove('active'));

    const target = document.getElementById(viewId);
    if (target) target.classList.add('active');
}

function showAdminDashboard() {
    showView('view-admin-dashboard');
    loadAdminData(); // Populate the mock tables when we enter
}

// --- SETUP LISTENERS ---
function setupAdminInteractions() {

    // Admin Login Logic
    const adminLoginForm = document.getElementById('form-admin-login');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const btn = document.getElementById('btn-admin-login');
            const idInput = document.getElementById('login-admin-id').value.trim();
            const passInput = document.getElementById('login-admin-password').value;

            if (!idInput || !passInput) {
                alert('Please enter your Admin ID and password.');
                return;
            }

            // Alias
            const emailAlias = idInput.includes('@') ? idInput : `${idInput}@nextstop.com`;

            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Authenticating...';
            btn.disabled = true;

            try {
                const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                    email: emailAlias,
                    password: passInput
                });

                btn.innerHTML = 'Login as Admin';
                btn.disabled = false;

                if (error) {
                    console.error("Admin Login Error:", error);
                    alert('Access Denied: Invalid Admin Credentials.');
                } else {
                    localStorage.setItem('nextstop_role', 'admin');
                    adminLoginForm.reset();
                    showAdminDashboard();
                }
            } catch (err) {
                console.error("Unexpected error:", err);
                btn.innerHTML = 'Login as Admin';
                btn.disabled = false;
                alert('System Error. Could not connect.');
            }
        });
    }

    // Admin Logout Logic
    const logoutBtn = document.getElementById('btn-admin-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const { error } = await window.supabaseClient.auth.signOut();
            localStorage.removeItem('nextstop_role');
            if (!error) {
                showView('view-admin-login');
            }
        });
    }
}

// --- TAB SWITCHING ---
window.switchAdminTab = function (tabId, element) {
    // UI Tab State
    const tabs = document.querySelectorAll('.year-tab');
    tabs.forEach(t => t.classList.remove('active'));
    if (element) element.classList.add('active');

    // Content Display State
    const contents = document.querySelectorAll('.admin-tab-content');
    contents.forEach(c => c.style.display = 'none');

    const targetContent = document.getElementById(`admin-tab-${tabId}`);
    if (targetContent) targetContent.style.display = 'block';
};

// --- MODAL UTILS ---
window.openAdminModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
};

window.closeAdminModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        // Look for forms to reset
        const form = modal.querySelector('form');
        if (form) form.reset();

        // Specific resets for Payment Modal
        if (modalId === 'modal-payment') {
            const studentSelect = document.getElementById('payment-student');
            if (studentSelect) studentSelect.disabled = false;

            const searchInput = document.getElementById('payment-student-search');
            if (searchInput) {
                searchInput.value = '';
                searchInput.disabled = false;
            }
            const resultsDiv = document.getElementById('payment-student-results');
            if (resultsDiv) resultsDiv.style.display = 'none';
            const modalTitle = document.getElementById('modal-payment-title');
            if (modalTitle) modalTitle.textContent = "Log Fee Payment";
            const btn = modal.querySelector('button[type="submit"]');
            if (btn) btn.innerHTML = "Record Payment";

            // Explicitly clear hidden fields (form.reset doesn't)
            const hId = document.getElementById('payment-history-id');
            const hAmt = document.getElementById('payment-original-amount');
            if (hId) hId.value = '';
            if (hAmt) hAmt.value = '';
        }
    }
};

// --- DYNAMIC SUPABASE DATA LOADING ---
window.renderPaymentStudentOptions = function (studentsToRender) {
    const resultsDiv = document.getElementById('payment-student-results');
    if (!resultsDiv) return;

    if (studentsToRender.length === 0) {
        resultsDiv.innerHTML = '<div class="dropdown-item" style="cursor: default;">No students found</div>';
    } else {
        resultsDiv.innerHTML = studentsToRender.map(s => `
            <div class="dropdown-item" onclick="window.selectPaymentStudent('${s.id}', '${s.full_name.replace(/'/g, "\\'")}')">
                <div class="item-title">${s.full_name}</div>
                <div class="item-subtitle">${s.admission_number || 'No Admission No.'} • ${s.course || 'No Course'}</div>
            </div>
        `).join('');
    }
    resultsDiv.style.display = 'block';
};

window.selectPaymentStudent = function (id, name) {
    const searchInput = document.getElementById('payment-student-search');
    const hiddenSelect = document.getElementById('payment-student');
    const resultsDiv = document.getElementById('payment-student-results');

    if (searchInput) searchInput.value = name;
    if (hiddenSelect) {
        // Ensure the option exists in the hidden select so it can be selected
        if (!Array.from(hiddenSelect.options).some(opt => opt.value === id)) {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = name;
            hiddenSelect.appendChild(opt);
        }
        hiddenSelect.value = id;
    }
    if (resultsDiv) resultsDiv.style.display = 'none';
};

// Global click listener for closing dropdown
document.addEventListener('click', (e) => {
    const container = document.getElementById('payment-student-container');
    const resultsDiv = document.getElementById('payment-student-results');
    if (container && resultsDiv && !container.contains(e.target)) {
        resultsDiv.style.display = 'none';
    }
});

window.loadAdminData = async function () {
    const sb = window.supabaseClient;

    // 1. Fetch Routes
    const { data: routes, error: rError } = await sb.from('routes').select('*').order('name');

    // 2. Fetch Students (Profiles)
    const { data: students, error: sError } = await sb.from('profiles')
        .select(`
            id, full_name, email, course, admission_number, register_number, avatar_url, academic_year, route_id,
            routes!route_id(name, bus_number),
            fee_payments(total_due, amount_paid)
        `)
        .eq('role', 'student')
        .order('full_name');

    // 3. Fetch Notifications History
    const { data: notifications, error: nError } = await sb.from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    // 4. Fetch Fee Payments
    const { data: feePayments, error: fError } = await sb.from('fee_payments')
        .select(`
            *,
            profiles(full_name, admission_number, course)
        `);

    // 5. Fetch Pending & Verified Payments
    const { data: historyPayments, error: pError } = await sb.from('payment_history')
        .select(`
            *,
            profiles(full_name, admission_number)
        `)
        .order('date', { ascending: false });

    if (rError) console.error("Error fetching routes:", rError.message);
    if (sError) console.error("Error fetching students:", sError.message);
    if (nError) console.warn("Notifications table might not exist yet:", nError.message);
    if (fError) console.error("Error fetching fee payments:", fError.message);
    if (pError) console.error("Error fetching pending payments:", pError.message);

    // Sort fee payments by student name
    if (feePayments) {
        feePayments.sort((a, b) => {
            const nameA = (a.profiles?.full_name || "").toLowerCase();
            const nameB = (b.profiles?.full_name || "").toLowerCase();
            return nameA.localeCompare(nameB);
        });
    }

    // Store history globally for individual views
    window.adminHistoryPayments = historyPayments;

    // --- POPULATE METRICS ---
    const routeCount = routes ? routes.length : 0;
    const studentCount = students ? students.length : 0;
    const totalCollected = feePayments ? feePayments.reduce((sum, f) => sum + Number(f.amount_paid || 0), 0) : 0;

    document.getElementById('metric-routes').textContent = routeCount;
    document.getElementById('metric-students').textContent = studentCount;
    document.getElementById('metric-fees').textContent = `₹${totalCollected.toLocaleString()}`;

    // --- POPULATE ROUTES TAB ---
    const routesList = document.getElementById('admin-routes-list');
    if (routesList) {
        if (!routes || routes.length === 0) {
            routesList.innerHTML = `<div class="card" style="padding:16px; text-align:center;">No routes found.</div>`;
        } else {
            routesList.innerHTML = routes.map(r => `
                <div class="card" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px;">
                    <div>
                        <h4 style="margin: 0; color: var(--color-teal);">${r.name}</h4>
                        <p style="margin: 0; font-size: 0.75rem; color: var(--color-gray-500);">Bus: ${r.bus_number} • Capacity: ${r.capacity} • ${r.status}</p>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button class="btn btn-outline" onclick='editRoute(${JSON.stringify(r)})' style="padding: 6px; border-color: var(--color-teal); color: var(--color-teal);"><i class="ph ph-pencil-simple"></i></button>
                        <button class="btn btn-outline" onclick="deleteRoute('${r.id}')" style="padding: 6px; border-color: var(--color-error); color: var(--color-error);"><i class="ph ph-trash"></i></button>
                    </div>
                </div>
            `).join('');
        }
    }

    // --- POPULATE STUDENTS TAB ---
    const studentsTable = document.getElementById('admin-students-table');
    if (studentsTable) {
        if (!students || students.length === 0) {
            studentsTable.innerHTML = `<tr><td colspan="3" style="padding:16px; text-align:center;">No students found.</td></tr>`;
        } else {
            studentsTable.innerHTML = students.map(s => {
                const rtName = s.routes ? `${s.routes.name} (${s.routes.bus_number})` : 'Unassigned';
                const acYear = s.academic_year ? `(${s.academic_year})` : '';
                const courseAdmn = [s.course, s.admission_number, acYear].filter(Boolean).join(' • ') || 'No details';
                const emailDisplay = s.email ? s.email : 'No email saved';

                return `
                <tr style="border-bottom: 1px solid var(--color-gray-100);">
                    <td style="padding: 12px 16px;">
                        <div style="font-weight: 500; color: var(--color-gray-900);">${s.full_name}</div>
                        <div style="font-size: 0.75rem; color: var(--color-gray-500);">${emailDisplay} • ${courseAdmn}</div>
                    </td>
                    <td style="padding: 12px 16px; color: var(--color-gray-700);">${rtName}</td>
                    <td style="padding: 12px 16px; white-space: nowrap;">
                        <button class="btn btn-outline" onclick='editStudent(${JSON.stringify(s)})' style="padding: 4px 8px; font-size: 0.75rem;"><i class="ph ph-pencil-simple"></i></button>
                        <button class="btn btn-outline" onclick="deleteStudent('${s.id}')" style="padding: 4px 8px; font-size: 0.75rem; border-color: var(--color-error); color: var(--color-error);"><i class="ph ph-trash"></i></button>
                    </td>
                </tr>
                `;
            }).join('');
        }
    }

    // --- POPULATE NOTIFICATIONS HISTORY ---
    const historyList = document.getElementById('admin-broadcast-history');
    if (historyList) {
        if (!notifications || notifications.length === 0) {
            historyList.innerHTML = `<div class="card" style="padding:16px; text-align:center; color: var(--color-gray-500);">No broadcasts sent yet.</div>`;
        } else {
            historyList.innerHTML = notifications.map(n => {
                const date = new Date(n.created_at).toLocaleString();
                const targetDisplay = n.target_audience === 'all' ? 'All Students' : n.target_audience;
                return `
                <div class="card" style="padding: 16px; border-left: 4px solid var(--color-teal); position: relative;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding-right: 60px;">
                        <h4 style="margin: 0; color: var(--color-gray-900);">${n.title}</h4>
                        <span style="font-size: 0.75rem; color: var(--color-gray-500);">${date}</span>
                    </div>
                    <p style="margin: 0 0 8px 0; font-size: 0.875rem; color: var(--color-gray-700);">${n.message}</p>
                    <div style="font-size: 0.75rem; font-weight: 600; color: var(--color-teal); margin-bottom: 8px;">Target ID: ${targetDisplay}</div>
                    
                    <div style="display: flex; gap: 8px; margin-top: 8px; border-top: 1px solid var(--color-gray-100); pt: 8px;">
                        <button class="btn btn-outline" onclick='editNotification(${JSON.stringify(n).replace(/'/g, "&apos;")})' style="padding: 4px 12px; font-size: 0.75rem; color: var(--color-teal); border-color: var(--color-teal);">
                            <i class="ph ph-pencil"></i> Edit
                        </button>
                        <button class="btn btn-outline" onclick="deleteNotification('${n.id}')" style="padding: 4px 12px; font-size: 0.75rem; color: var(--color-error); border-color: var(--color-error);">
                            <i class="ph ph-trash"></i> Delete
                        </button>
                    </div>
                </div>
                `;
            }).join('');
        }
    }



    // Populate the dropdown in Student Modal & Payment Modal
    const routeSelect = document.getElementById('student-route');
    const broadcastSelect = document.getElementById('broadcast-target');
    const paymentStudentSelect = document.getElementById('payment-student');

    if (routes) {
        const routeOptions = routes.map(r => `<option value="${r.id}">Route: ${r.name} (${r.bus_number})</option>`).join('');

        if (routeSelect) {
            routeSelect.innerHTML = '<option value="">Select a Route...</option>' + routeOptions;
        }

        if (broadcastSelect && broadcastSelect.options.length <= 1) {
            broadcastSelect.innerHTML = '<option value="all">All Students</option>' + routeOptions;
        }
    }

    if (students && paymentStudentSelect) {
        window.adminStudentsList = students; // Store for search filtering
        window.renderPaymentStudentOptions(students);

        // Setup search listener once
        const searchInput = document.getElementById('payment-student-search');
        if (searchInput && !searchInput.dataset.initialized) {
            searchInput.dataset.initialized = 'true';

            searchInput.addEventListener('focus', () => {
                const term = searchInput.value.toLowerCase();
                if (window.adminStudentsList) {
                    const filtered = term ? window.adminStudentsList.filter(s =>
                        s.full_name.toLowerCase().includes(term) ||
                        (s.admission_number && s.admission_number.toLowerCase().includes(term))
                    ) : [...window.adminStudentsList.slice(0, 10)]; // Show top 10 initially
                    window.renderPaymentStudentOptions(filtered);
                }
            });

            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const resultsDiv = document.getElementById('payment-student-results');
                if (window.adminStudentsList) {
                    let filtered = window.adminStudentsList.filter(s =>
                        s.full_name.toLowerCase().includes(term) ||
                        (s.admission_number && s.admission_number.toLowerCase().includes(term))
                    );

                    // Sort: Priority to starts-with matches, then alphabetical
                    filtered.sort((a, b) => {
                        const aName = a.full_name.toLowerCase();
                        const bName = b.full_name.toLowerCase();
                        const aAdm = (a.admission_number || "").toLowerCase();
                        const bAdm = (b.admission_number || "").toLowerCase();

                        const aStarts = aName.startsWith(term) || aAdm.startsWith(term);
                        const bStarts = bName.startsWith(term) || bAdm.startsWith(term);

                        if (aStarts && !bStarts) return -1;
                        if (!aStarts && bStarts) return 1;

                        return aName.localeCompare(bName);
                    });

                    window.renderPaymentStudentOptions(filtered);
                }
            });
        }
    }

    // --- POPULATE PENDING & TRANSACTIONS ---
    const pendingSection = document.getElementById('admin-pending-payments-section');
    const pendingTable = document.getElementById('admin-pending-payments-table');
    const transactionsTable = document.getElementById('admin-transactions-table');

    if (transactionsTable && historyPayments) {
        if (historyPayments.length === 0) {
            transactionsTable.innerHTML = '<tr><td colspan="5" style="padding: 16px; text-align: center; color: var(--color-gray-400);">No transactions yet.</td></tr>';
        } else {
            // Group by student
            const groups = {};
            historyPayments.forEach(v => {
                const sName = v.profiles ? v.profiles.full_name : 'Unknown';
                if (!groups[sName]) groups[sName] = [];
                groups[sName].push(v);
            });

            // Sort group names alphabetically
            const sortedGroupNames = Object.keys(groups).sort();

            let html = '';
            sortedGroupNames.forEach(name => {
                // Header row for the student
                html += `
                <tr class="transaction-group-header" id="history-group-${groups[name][0].student_id}">
                    <td colspan="4"><i class="ph-fill ph-user-circle"></i> ${name}</td>
                </tr>
                `;

                // Transactions for this student
                groups[name].forEach(v => {
                    const dateStr = v.date ? new Date(v.date).toLocaleDateString() : 'N/A';
                    html += `
                    <tr style="border-bottom: 1px solid var(--color-gray-100);">
                        <td style="padding: 12px 16px; color: var(--color-gray-500); font-size: 0.875rem;">Transaction Ref: ${v.reference_id || 'LOGGED'}</td>
                        <td style="padding: 12px 16px; color: var(--color-teal); font-weight: 600;">₹${Number(v.amount).toLocaleString()}</td>
                        <td style="padding: 12px 16px; color: var(--color-gray-500); font-size: 0.75rem;">${dateStr}</td>
                        <td style="padding: 12px 16px; display: flex; gap: 8px;">
                            <button class="btn btn-outline" onclick='editPayment(${JSON.stringify(v).replace(/'/g, "&apos;")})' style="padding: 2px 8px; font-size: 0.7rem; color: var(--color-teal); border-color: var(--color-teal);">Edit</button>
                            <button class="btn btn-outline" onclick="cancelPayment('${v.id}', '${v.student_id}', ${v.amount})" style="padding: 2px 8px; font-size: 0.7rem; color: var(--color-error); border-color: var(--color-error);">Revert</button>
                        </td>
                    </tr>
                    `;
                });
            });
            transactionsTable.innerHTML = html;
        }
    }

    // --- POPULATE FINANCE LEDGER ---
    const financeTable = document.getElementById('admin-finance-table');
    if (financeTable) {
        if (!feePayments || feePayments.length === 0) {
            financeTable.innerHTML = `<tr><td colspan="6" style="padding:16px; text-align:center;">No fee records found. Assign routes to students first.</td></tr>`;
        } else {
            financeTable.innerHTML = feePayments.map(f => {
                const sName = f.profiles ? f.profiles.full_name : 'Unknown Student';
                const sCourse = f.profiles ? f.profiles.course : '';
                const totalDue = Number(f.total_due || 2500);
                const amtPaid = Number(f.amount_paid || 0);
                const remaining = totalDue - amtPaid;

                let badgeClass = 'badge-pending';
                let badgeText = 'PENDING';
                if (amtPaid >= totalDue && totalDue > 0) {
                    badgeClass = 'badge-success';
                    badgeText = 'PAID';
                } else if (amtPaid > 0) {
                    badgeClass = 'badge-active';
                    badgeText = 'PARTIAL';
                }

                return `
                <tr style="border-bottom: 1px solid var(--color-gray-100);">
                    <td style="padding: 12px 16px;">
                        <button class="btn btn-student-history" onclick="window.viewStudentHistory('${f.student_id}')">
                            ${sName}
                        </button>
                        <div style="font-size: 0.75rem; color: var(--color-gray-500); margin-top: 2px;">${sCourse}</div>
                    </td>
                    <td style="padding: 12px 16px; color: var(--color-gray-700);">${f.academic_year || 'N/A'}</td>
                    <td style="padding: 12px 16px; color: var(--color-gray-700);">₹${totalDue.toLocaleString()}</td>
                    <td style="padding: 12px 16px; color: var(--color-teal); font-weight: 600;">₹${amtPaid.toLocaleString()}</td>
                    <td style="padding: 12px 16px; color: var(--color-gray-700);">₹${remaining.toLocaleString()}</td>
                    <td style="padding: 12px 16px;">
                        <span class="status-badge ${badgeClass}">${badgeText}</span>
                    </td>
                </tr>
                `;
            }).join('');
        }
    }
};

// --- CRUD ACTION HANDLERS ---

// ROUTE HANDLERS
window.editRoute = function (route) {
    document.getElementById('route-id').value = route.id;
    document.getElementById('route-name').value = route.name;
    document.getElementById('route-bus').value = route.bus_number;
    document.getElementById('route-capacity').value = route.capacity;
    document.getElementById('modal-route-title').textContent = "Edit Route";
    openAdminModal('modal-route');
};

window.deleteRoute = async function (id) {
    if (!confirm("Are you sure you want to delete this route?")) return;

    const { error } = await window.supabaseClient.from('routes').delete().eq('id', id);
    if (error) alert("Error: " + error.message);
    else loadAdminData();
};

document.addEventListener('DOMContentLoaded', () => {

    // Open New Route Modal
    const newRouteBtns = document.querySelectorAll('#admin-tab-routes .btn-primary');
    if (newRouteBtns.length) {
        newRouteBtns[0].addEventListener('click', () => {
            document.getElementById('modal-route-title').textContent = "Add New Route";
            openAdminModal('modal-route');
        });
    }

    const formRoute = document.getElementById('form-manage-route');
    if (formRoute) {
        formRoute.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('route-id').value;
            const payload = {
                name: document.getElementById('route-name').value,
                bus_number: document.getElementById('route-bus').value,
                capacity: parseInt(document.getElementById('route-capacity').value, 10)
            };

            const btn = e.target.querySelector('button[type="submit"]');
            btn.disabled = true;

            let error;
            if (id) {
                // Update
                const res = await window.supabaseClient.from('routes').update(payload).eq('id', id);
                error = res.error;
            } else {
                // Insert
                const res = await window.supabaseClient.from('routes').insert([payload]);
                error = res.error;
            }

            btn.disabled = false;

            if (error) {
                alert("Action Failed: " + error.message);
            } else {
                closeAdminModal('modal-route');
                loadAdminData();
            }
        });
    }

    // STUDENT HANDLERS
    const newStudentBtns = document.querySelectorAll('#admin-tab-students .btn-primary');
    if (newStudentBtns.length) {
        newStudentBtns[0].addEventListener('click', () => {
            document.getElementById('modal-student-title').textContent = "Add Student";
            document.getElementById('student-creation-notice').style.display = 'none';

            // Reset Photo Input
            document.getElementById('current-avatar-url').value = '';
            document.getElementById('student-photo-preview').innerHTML = `<i class="ph ph-user" style="font-size: 2rem; color: var(--color-gray-500);"></i>`;
            const photoInput = document.getElementById('student-photo');
            if (photoInput) photoInput.value = '';

            // Show Email/Password fields for new user creation
            if (document.getElementById('group-student-email')) document.getElementById('group-student-email').style.display = 'block';
            if (document.getElementById('group-student-password')) document.getElementById('group-student-password').style.display = 'block';

            openAdminModal('modal-student');
        });
    }

    const formStudent = document.getElementById('form-manage-student');
    if (formStudent) {
        formStudent.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('student-id').value;
            const btn = e.target.querySelector('button[type="submit"]');

            const payload = {
                full_name: document.getElementById('student-name').value,
                course: document.getElementById('student-course').value,
                admission_number: document.getElementById('student-admission').value,
                register_number: document.getElementById('student-register').value,
                academic_year: document.getElementById('student-academic-year').value,
                route_id: document.getElementById('student-route').value || null,
                total_due: parseFloat(document.getElementById('student-total-due').value) || 2500
            };
            const totalDue = payload.total_due;
            delete payload.total_due; // Remove from profile payload

            const email = document.getElementById('student-email').value;
            const password = document.getElementById('student-password').value;

            btn.disabled = true;
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Saving...';

            let errorMsg = null;

            // Start Photo Upload Process if file is selected
            payload.avatar_url = document.getElementById('current-avatar-url').value || null;
            let photoFile = document.getElementById('student-photo').files[0];

            if (photoFile) {
                // Compress the image before uploading to save storage
                try {
                    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Compressing Image...';
                    photoFile = await compressImage(photoFile, 800, 800, 0.7);
                    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Uploading...';
                } catch (err) {
                    console.error("Compression failed, using original file", err);
                }
                const cleanFileName = photoFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
                const finalFileName = `avatar_${Date.now()}_${cleanFileName}`;

                // Use supabaseAdmin to bypass Storage RLS restrictions for Admin uploads
                const { data: uploadData, error: uploadError } = await window.supabaseAdmin.storage
                    .from('avatars')
                    .upload(finalFileName, photoFile, { cacheControl: '3600', upsert: false });

                if (uploadError) {
                    errorMsg = "Warning: Failed to upload profile photo. " + uploadError.message;
                } else {
                    const { data: publicUrlData } = window.supabaseAdmin.storage
                        .from('avatars')
                        .getPublicUrl(uploadData.path);
                    payload.avatar_url = publicUrlData.publicUrl;
                }
            }

            if (!errorMsg && id) {
                // UPDATE EXISTING STUDENT
                // 1. Update Public Profile
                if (email) payload.email = email; // Include email in profile update

                const res = await window.supabaseClient.from('profiles').update(payload).eq('id', id);
                if (res.error) errorMsg = res.error.message;

                // 2. Update Auth details so the Virtual ID Card stays in sync
                if (!errorMsg && window.supabaseAdmin) {
                    const authUpdates = {
                        user_metadata: {
                            full_name: payload.full_name,
                            role: 'student',
                            route: payload.route_id,
                            admission: payload.admission_number,
                            register: payload.register_number,
                            avatar: payload.avatar_url,
                            course: payload.course,
                            academic_year: payload.academic_year
                        }
                    };
                    if (email) authUpdates.email = email;
                    if (password) authUpdates.password = password; // Only update password if admin typed a new one

                    if (Object.keys(authUpdates).length > 0) {
                        const { error: authErr } = await window.supabaseAdmin.auth.admin.updateUserById(id, authUpdates);
                        if (authErr && !errorMsg) {
                            errorMsg = "Profile updated, but failed to update Login Credentials: " + authErr.message;
                        }
                    }
                }

            } else {
                // CREATE NEW STUDENT (Requires Service Role Key)
                if (!window.supabaseAdmin) {
                    errorMsg = "Setup Incomplete: You must add your Supabase 'service_role' key to supabase-config.js to mint new users.";
                } else {
                    if (!email || !password) {
                        alert("Email and Password are required to create a new student.");
                        btn.disabled = false;
                        btn.innerHTML = 'Save Student';
                        return;
                    }

                    // 1. Create the Auth User behind the scenes
                    const { data: authData, error: authErr } = await window.supabaseAdmin.auth.admin.createUser({
                        email: email,
                        password: password,
                        email_confirm: true,
                        user_metadata: {
                            full_name: payload.full_name,
                            role: 'student',
                            route: payload.route_id,
                            admission: payload.admission_number,
                            register: payload.register_number,
                            avatar: payload.avatar_url,
                            course: payload.course,
                            academic_year: payload.academic_year
                        }
                    });

                    if (authErr) {
                        errorMsg = "Auth Error: " + authErr.message;
                    } else {
                        // 2. Create/Update the newly created profile with details AND THE EMAIL
                        const newProfileId = authData.user.id;
                        payload.id = newProfileId;      // Required for profile creation
                        payload.role = 'student';       // Required for fetching later
                        payload.email = email;          // Force save email to public profile

                        // Use upsert so that it CREATES the profile if no Postgres trigger exists!
                        if (profErr) {
                            console.warn("Profile upsert failed after Auth creation:", profErr);
                        }

                        // 3. Create or Refresh the Fee Payment record with the specified Total Due
                        await window.supabaseAdmin.from('fee_payments').upsert({
                            student_id: newProfileId,
                            total_due: totalDue,
                            academic_year: payload.academic_year || '2024-2025'
                        });
                    }
                }
            }

            // Sync Total Due for existing users too
            if (!errorMsg && id) {
                const { data: existingFee } = await window.supabaseClient.from('fee_payments').select('amount_paid').eq('student_id', id).maybeSingle();
                await window.supabaseClient.from('fee_payments').upsert({
                    student_id: id,
                    total_due: totalDue,
                    amount_paid: existingFee?.amount_paid || 0,
                    academic_year: payload.academic_year || '2024-2025'
                });
            }

            btn.disabled = false;
            btn.innerHTML = 'Save Student';

            if (errorMsg) {
                alert("Action Failed:\n" + errorMsg);
            } else {
                closeAdminModal('modal-student');
                loadAdminData();
            }
        });
    }
});

window.editStudent = function (student) {
    document.getElementById('student-id').value = student.id;
    document.getElementById('student-name').value = student.full_name;
    document.getElementById('student-course').value = student.course || '';
    document.getElementById('student-academic-year').value = student.academic_year || '';
    document.getElementById('student-admission').value = student.admission_number || '';
    document.getElementById('student-register').value = student.register_number || '';
    document.getElementById('student-route').value = student.route_id || '';

    // Pre-fill Total Due from joined data
    const feeInfo = student.fee_payments?.[0];
    document.getElementById('student-total-due').value = feeInfo?.total_due || 2500;

    // Populate Photo
    document.getElementById('current-avatar-url').value = student.avatar_url || '';
    const photoInput = document.getElementById('student-photo');
    if (photoInput) photoInput.value = '';

    if (student.avatar_url) {
        document.getElementById('student-photo-preview').innerHTML = `<img src="${student.avatar_url}" style="width: 100%; height: 100%; object-fit: cover;">`;
    } else {
        document.getElementById('student-photo-preview').innerHTML = `<i class="ph ph-user" style="font-size: 2rem; color: var(--color-gray-500);"></i>`;
    }

    // Populate Email and prepare Password for edits
    document.getElementById('student-email').value = student.email || '';
    document.getElementById('student-password').value = '';
    document.getElementById('student-password').placeholder = 'Leave blank to keep current';

    // Show Email/Password fields when editing
    if (document.getElementById('group-student-email')) document.getElementById('group-student-email').style.display = 'block';
    if (document.getElementById('group-student-password')) document.getElementById('group-student-password').style.display = 'block';

    document.getElementById('student-creation-notice').style.display = 'block';
    document.getElementById('student-creation-notice').innerText = "Modify student details below. Leave the password blank to keep their current password.";

    document.getElementById('modal-student-title').textContent = "Edit Student Details";
    openAdminModal('modal-student');
};

window.deleteStudent = async function (id) {
    if (!confirm("Are you sure you want to delete this student's profile? This will strip their access but won't delete their core login account.")) return;

    // We can only delete the profile if we don't have Service Role key.
    const { error } = await window.supabaseClient.from('profiles').delete().eq('id', id);
    if (error) alert("Error deleting profile: " + error.message);
    else loadAdminData();
};

// NOTIFICATION HANDLERS
window.editNotification = function (notification) {
    document.getElementById('broadcast-id').value = notification.id;
    document.getElementById('broadcast-title').value = notification.title;
    document.getElementById('broadcast-message').value = notification.message;
    document.getElementById('broadcast-target').value = notification.target_audience;

    const btn = document.getElementById('btn-send-broadcast');
    if (btn) btn.innerHTML = '<i class="ph ph-pencil"></i> Update Announcement';

    // Scroll to the form
    const form = document.getElementById('form-admin-broadcast');
    if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

window.deleteNotification = async function (id) {
    if (!confirm("Are you sure you want to delete this announcement?")) return;

    const { error } = await window.supabaseClient.from('notifications').delete().eq('id', id);
    if (error) alert("Error deleting announcement: " + error.message);
    else loadAdminData();
};



document.addEventListener('DOMContentLoaded', () => {
    // BROADCAST NOTIFICATION HANDLER
    const broadcastForm = document.getElementById('form-admin-broadcast');
    if (broadcastForm) {
        broadcastForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-send-broadcast');
            const id = document.getElementById('broadcast-id').value;
            const title = document.getElementById('broadcast-title').value;
            const message = document.getElementById('broadcast-message').value;
            const target = document.getElementById('broadcast-target').value;

            btn.disabled = true;
            btn.innerHTML = id ? '<i class="ph ph-spinner ph-spin"></i> Updating...' : '<i class="ph ph-spinner ph-spin"></i> Broadcasting...';

            const payload = {
                title: title,
                message: message,
                target_audience: target
            };

            let error;
            if (id) {
                const res = await window.supabaseClient.from('notifications').update(payload).eq('id', id);
                error = res.error;
            } else {
                const res = await window.supabaseClient.from('notifications').insert([payload]);
                error = res.error;
            }

            btn.disabled = false;
            btn.innerHTML = '<i class="ph ph-paper-plane-tilt"></i> Send Announcement Now';

            if (error) {
                alert("Failed to process announcement:\n" + error.message);
                console.error("Broadcast Error:", error);
            } else {
                alert(id ? "Announcement updated successfully!" : "Broadcast sent successfully!");
                broadcastForm.reset();
                document.getElementById('broadcast-id').value = '';
                loadAdminData();
            }
        });
    }

    // Delegate Edit Payment button click
    const transactionsTable = document.getElementById('admin-transactions-table');
    if (transactionsTable) {
        transactionsTable.addEventListener('click', async (e) => {
            const btn = e.target.closest('.btn-edit-payment');
            if (btn) {
                const id = btn.getAttribute('data-id');
                btn.disabled = true;
                const originalText = btn.innerHTML;
                btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';

                // Fetch the full payment object to pass to editPayment
                const { data, error } = await window.supabaseClient.from('payment_history').select('*, profiles(full_name, admission_number)').eq('id', id).single();

                btn.disabled = false;
                btn.innerHTML = originalText;

                if (data) {
                    window.editPayment(data);
                } else {
                    console.error("Failed to fetch payment for edit:", error);
                    alert("Could not load payment details: " + (error?.message || "Unknown error"));
                }
            }
        });
    }
    // LOG PAYMENT HANDLER
    const paymentForm = document.getElementById('form-log-payment');
    if (paymentForm) {
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const btn = paymentForm.querySelector('button[type="submit"]');
            const studentId = document.getElementById('payment-student').value;
            const amount = parseFloat(document.getElementById('payment-amount').value);
            const method = document.getElementById('payment-method').value;
            const reference = document.getElementById('payment-reference').value || null;

            const historyId = document.getElementById('payment-history-id').value;
            const originalAmount = parseFloat(document.getElementById('payment-original-amount').value) || 0;

            if (!studentId || isNaN(amount) || amount <= 0) {
                alert("Please select a student and enter a valid amount.");
                return;
            }

            btn.disabled = true;
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Processing...';

            try {
                let error;

                if (historyId) {
                    // --- UPDATE MODE ---
                    // 1. Update the record in payment_history
                    const { error: histError } = await window.supabaseClient.from('payment_history').update({
                        amount: amount,
                        payment_method: method,
                        reference_id: reference,
                        updated_at: new Date().toISOString()
                    }).eq('id', historyId);

                    if (histError) throw new Error("Update history failed: " + histError.message);

                    // 2. Adjust total balance by difference
                    const difference = amount - originalAmount;
                    if (difference !== 0) {
                        const { data: currentFeeData, error: feeFetchError } = await window.supabaseClient.from('fee_payments')
                            .select('amount_paid')
                            .eq('student_id', studentId)
                            .maybeSingle();

                        if (feeFetchError) throw new Error("Fee record lookup failed: " + feeFetchError.message);

                        const currentPaid = Number(currentFeeData?.amount_paid || 0);
                        const newTotalPaid = currentPaid + difference;

                        const { error: updateError } = await window.supabaseClient.from('fee_payments')
                            .update({ amount_paid: newTotalPaid })
                            .eq('student_id', studentId);

                        if (updateError) throw new Error("Balance adjustment failed: " + updateError.message);
                    }
                    alert('Payment updated successfully!');
                } else {
                    // --- CREATE MODE ---
                    // 1. Insert into Payment History Audit Trail
                    const { error: histError } = await window.supabaseClient.from('payment_history').insert([{
                        student_id: studentId,
                        amount: amount,
                        payment_method: method,
                        reference_id: reference
                    }]);

                    if (histError) throw new Error("History log failed: " + histError.message);

                    // 2. Fetch the current Fee Payment accumulator
                    const { data: feeData, error: fetchError } = await window.supabaseClient.from('fee_payments')
                        .select('amount_paid')
                        .eq('student_id', studentId)
                        .maybeSingle();

                    if (fetchError) throw new Error("Fee record lookup failed: " + fetchError.message);

                    // 3. Update or Insert the Fee Payment summary manually (avoid upsert conflict bug)
                    if (feeData) {
                        const newPaid = Number(feeData.amount_paid || 0) + amount;
                        const { error: updateError } = await window.supabaseClient.from('fee_payments').update({ amount_paid: newPaid }).eq('student_id', studentId);
                        if (updateError) throw new Error("Fee update failed: " + updateError.message);
                    } else {
                        // Fetch student profile for academic year
                        const { data: profile, error: profileError } = await window.supabaseClient.from('profiles').select('academic_year').eq('id', studentId).single();
                        if (profileError) console.warn("Could not fetch student academic year for new fee record:", profileError.message);

                        const { error: insertError } = await window.supabaseClient.from('fee_payments').insert([{
                            student_id: studentId,
                            amount_paid: amount,
                            total_due: 2500, // Setting to User-specified default value
                            academic_year: profile?.academic_year || '2024-2025'
                        }]);
                        if (insertError) throw new Error("Fee creation failed: " + insertError.message);
                    }
                    alert('Payment logged successfully!');
                }

                closeAdminModal('modal-payment');
                if (window.loadAdminData) await window.loadAdminData();
            } catch (err) {
                console.error('Payment processing error:', err);
                alert('Failed to process payment: ' + err.message);
            } finally {
                btn.disabled = false;
                btn.innerHTML = historyId ? "Update Payment" : "Record Payment";
            }
        });
    }
});
// --- REVERSION ACTIONS (Status/Verification Removed) ---
window.cancelPayment = async function (id, studentId, amount) {
    if (!confirm(`Are you sure you want to CANCEL this payment of ₹${amount}? The student's balance will be adjusted.`)) return;

    try {
        // 1. Delete the record from payment_history (since status column is gone)
        const { error: histError } = await window.supabaseClient.from('payment_history')
            .delete()
            .eq('id', id);

        if (histError) throw new Error("Deletion failed: " + histError.message);

        // 2. Adjust Fee Accumulator
        const { data: currentFeeData, error: fetchError } = await window.supabaseClient.from('fee_payments')
            .select('amount_paid')
            .eq('student_id', studentId)
            .maybeSingle();

        if (fetchError) throw new Error("Fee record lookup failed: " + fetchError.message);

        if (currentFeeData) {
            const newTotalPaid = Math.max(0, Number(currentFeeData.amount_paid || 0) - Number(amount));
            const { error: updateError } = await window.supabaseClient.from('fee_payments')
                .update({
                    amount_paid: newTotalPaid,
                    updated_at: new Date().toISOString()
                })
                .eq('student_id', studentId);

            if (updateError) throw new Error("Fee update failed: " + updateError.message);
        }

        alert('Payment Cancelled Successfully!');

        // Refresh data
        await loadAdminData();

        // If history modal is open, refresh its content
        const historyModal = document.getElementById('modal-student-history');
        if (historyModal && historyModal.classList.contains('active')) {
            window.viewStudentHistory(studentId);
        }
    } catch (err) {
        console.error('Cancellation error:', err);
        alert('Failed to cancel: ' + err.message);
    }
};

window.editPayment = function (p) {
    document.getElementById('modal-payment-title').textContent = "Modify Payment Amount";
    document.getElementById('payment-history-id').value = p.id;
    document.getElementById('payment-original-amount').value = p.amount;

    const studentName = p.profiles ? p.profiles.full_name : 'Selected Student';
    const searchInput = document.getElementById('payment-student-search');
    if (searchInput) {
        searchInput.value = studentName;
        searchInput.disabled = true;
    }

    const hiddenSelect = document.getElementById('payment-student');
    if (hiddenSelect) {
        hiddenSelect.value = p.student_id;
        hiddenSelect.disabled = true;
    }

    document.getElementById('payment-amount').value = p.amount;
    document.getElementById('payment-method').value = p.payment_method;
    document.getElementById('payment-reference').value = p.reference_id || '';

    const btn = document.querySelector('#form-log-payment button[type="submit"]');
    if (btn) btn.innerHTML = "Update Payment";

    closeAdminModal('modal-student-history'); // Close history if open
    openAdminModal('modal-payment');
};

window.viewStudentHistory = function (studentId) {
    const student = window.adminStudentsList ? window.adminStudentsList.find(s => s.id === studentId) : null;
    const history = window.adminHistoryPayments ? window.adminHistoryPayments.filter(p => p.student_id === studentId) : [];

    // Set Info
    const infoEl = document.getElementById('history-student-info');
    const metaEl = document.getElementById('history-student-meta');
    if (student) {
        infoEl.textContent = student.full_name;
        metaEl.textContent = `${student.course || 'No Course'} • Adm: ${student.admission_number || 'N/A'}`;
    }

    // Populate Table
    const tableBody = document.getElementById('individual-history-table');
    if (tableBody) {
        if (history.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" style="padding: 24px; text-align: center; color: var(--color-gray-400);">No transactions found for this student.</td></tr>';
        } else {
            tableBody.innerHTML = history.map(h => `
                <tr style="border-bottom: 1px solid var(--color-gray-100);">
                    <td style="padding: 12px 16px; color: var(--color-gray-600);">${h.date ? new Date(h.date).toLocaleDateString() : 'N/A'}</td>
                    <td style="padding: 12px 16px; font-weight: 600; color: var(--color-teal);">₹${Number(h.amount).toLocaleString()}</td>
                    <td style="padding: 12px 16px; text-transform: capitalize; font-size: 0.75rem; color: var(--color-gray-500);">${h.payment_method || 'Cash'}</td>
                    <td style="padding: 12px 16px; display: flex; gap: 8px;">
                        <button class="btn btn-outline" onclick='window.editPayment(${JSON.stringify(h).replace(/'/g, "&apos;")})' style="padding: 2px 8px; font-size: 0.7rem; color: var(--color-teal); border-color: var(--color-teal);">Edit</button>
                        <button class="btn btn-outline" onclick="window.cancelPayment('${h.id}', '${h.student_id}', ${h.amount})" style="padding: 2px 8px; font-size: 0.7rem; color: var(--color-error); border-color: var(--color-error);">Revert</button>
                    </td>
                </tr>
            `).join('');
        }
    }

    openAdminModal('modal-student-history');
};

// Replace scrollToStudentHistory with empty or remove if preferred
window.scrollToStudentHistory = function (studentId) {
    // Redirect to the new modal view instead for convenience
    window.viewStudentHistory(studentId);
};
