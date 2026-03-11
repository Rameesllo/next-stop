/**
 * Next Stop Core Application Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Check for existing Supabase session
  const { data: { session }, error } = await window.supabaseClient.auth.getSession();

  // Supabase Auth State Listener
  window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      console.log('PASSWORD_RECOVERY event detected');
      navigateTo('view-update-password');
    }
  });

  setTimeout(async () => {
    // 1. Check Supabase session first
    if (session) {
      const role = session.user.user_metadata?.role;
      if (role === 'driver') {
        navigateTo('view-driver-dashboard');
      } else if (role === 'admin') {
        window.location.href = 'admin.html'; // Redirect to admin portal
      } else {
        navigateTo('view-student-dashboard');
        refreshDashboardProfile();
      }
    }
    // 2. Fallback to LocalStorage (for bypass logins or refresh persistence)
    else {
      const persistedRole = localStorage.getItem('nextstop_role');
      if (persistedRole === 'driver') {
        navigateTo('view-driver-dashboard');
      } else if (persistedRole === 'admin') {
        window.location.href = 'admin.html';
      } else if (persistedRole === 'student') {
        navigateTo('view-student-dashboard');
        refreshDashboardProfile();
      } else {
        navigateTo('view-role');
      }
    }
  }, 1000); // Small delay to show the loading screen beautifully

  // Set up all navigation listeners
  setupNavigation();
  setupInteractions();
});

/**
 * Navigation System
 * Handles transitioning between different "screens" of the SPA
 */
function navigateTo(viewId) {
  // Hide all views
  const views = document.querySelectorAll('.view');
  views.forEach(view => {
    view.classList.remove('active');
  });

  // Smooth scroll to top
  window.scrollTo({ top: 0, behavior: 'instant' });

  // Show requested view
  const targetView = document.getElementById(viewId);
  if (targetView) {
    targetView.classList.add('active');

    if (viewId === 'view-role') {
      localStorage.removeItem('driver_assigned_route');
      localStorage.removeItem('nextstop_role');
    }

    // Trigger view-specific dynamic logic
    if (viewId === 'view-student-dashboard') {
      refreshDashboardProfile();
      loadDashboardRoutes();
      loadNotifications();
    } else if (viewId === 'view-driver-dashboard') {
      loadDashboardRoutes();
    } else if (viewId === 'view-profile') {
      loadProfileData();
    } else if (viewId === 'view-payment') {
      loadStudentPaymentData();
    }

  } else {
    console.error(`View ${viewId} not found.`);
  }

  // Update bottom nav state if applicable
  updateBottomNav(viewId);
}

function updateBottomNav(viewId) {
  const bottomNavItems = document.querySelectorAll('.nav-item');
  if (!bottomNavItems.length) return;

  // Map views to nav items
  const navMap = {
    'view-student-dashboard': 'nav-home',
    'view-tracking': 'nav-tracking',
    'view-payment': 'nav-payment',
    'view-profile': 'nav-profile'
  };

  const targetNavId = navMap[viewId];

  if (targetNavId) {
    document.getElementById('bottom-nav').style.display = 'flex';

    bottomNavItems.forEach(item => {
      item.classList.remove('active');
      // Reset icons to outline
      const icon = item.querySelector('i');
      if (icon) {
        icon.classList.remove('ph-fill');
        icon.classList.add('ph');
      }
    });

    const activeItem = document.getElementById(targetNavId);
    if (activeItem) {
      activeItem.classList.add('active');
      // Set active icon to fill
      const icon = activeItem.querySelector('i');
      if (icon) {
        icon.classList.remove('ph');
        icon.classList.add('ph-fill');
      }
    }
  } else {
    // Hide bottom nav on other screens (login, role selection, driver)
    const nav = document.getElementById('bottom-nav');
    if (nav) nav.style.display = 'none';
  }
}

/**
 * Setup Click Listeners
 */
function setupNavigation() {
  // Use event delegation for all elements with data-navigate
  document.body.addEventListener('click', (e) => {
    // Find closest element with data-navigate attribute
    const navElement = e.target.closest('[data-navigate]');

    if (navElement) {
      e.preventDefault();
      const targetView = navElement.getAttribute('data-navigate');
      navigateTo(targetView);
    }
  });
}

/**
 * Component Interactions & Supabase Auth
 */
function setupInteractions() {

  // --- Payment Simulation (Kept as UI Demo) ---
  const paymentMethods = document.querySelectorAll('.payment-method');
  paymentMethods.forEach(method => {
    method.addEventListener('click', () => {
      paymentMethods.forEach(m => m.classList.remove('active'));
      method.classList.add('active');
    });
  });

  // --- NATIVE UPI PAYMENT DEEP LINKING (MONTHLY EMI STYLE) ---

}

// --- DRIVER BROADCASTING LOGIC (LIVE LOCATION) ---
const btnStartTrip = document.getElementById('btn-start-trip');
let watchId = null; // Store the GPS watch id
let driverChannel = null;

if (btnStartTrip) {
  btnStartTrip.addEventListener('click', () => {
    const isStarted = btnStartTrip.classList.contains('trip-started');

    // Get the route the driver has selected
    const routeSelect = document.getElementById('driver-route-select');
    const selectedRoute = routeSelect ? routeSelect.value : 'route-calicut';
    const channelName = `bus-tracking-${selectedRoute}`;

    // STOPPING THE TRIP
    if (isStarted) {
      btnStartTrip.classList.remove('trip-started', 'btn-secondary');
      btnStartTrip.classList.add('btn-primary');
      btnStartTrip.innerHTML = '<i class="ph ph-play-circle"></i> Start Trip';
      if (routeSelect) routeSelect.disabled = false;

      // 1. Stop tracking GPS
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        clearInterval(watchId);
        watchId = null;
      }

      // 2. Clear real-time channel
      if (driverChannel) {
        window.supabaseClient.removeChannel(driverChannel);
        driverChannel = null;
      }

      showAlert('Trip Ended', 'Live location broadcasting stopped.', 'info');
    }
    // STARTING THE TRIP
    else {
      if (routeSelect) routeSelect.disabled = true;

      // 1. Initialize Supabase Realtime Channel
      driverChannel = window.supabaseClient.channel(channelName);
      driverChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Driver broadcasting on: ${channelName}`);
        }
      });

      // 2. Setup the broadcast function wrapper
      const broadcastLocation = (lat, lng, speed) => {
        if (driverChannel) {
          driverChannel.send({
            type: 'broadcast',
            event: 'location_update',
            payload: { lat: lat, lng: lng, speed: speed || 0, routeId: selectedRoute }
          });
          console.log("Broadcasted:", lat, lng);
        }
      };

      // 3. Start watching real GPS
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, speed } = position.coords;
          broadcastLocation(latitude, longitude, speed);
        },
        (error) => {
          console.error("GPS Error:", error);
          showAlert('GPS Warning', 'Real GPS failed. Running simulation mode for testing.', 'warning');

          // Fallback Simulation Mode if real GPS is blocked or unavailable
          let simLat = 11.1339; // Default: Calicut University
          let simLng = 75.8966;

          if (selectedRoute === 'route-kondotty') {
            simLat = 11.1444; // Kondotty Starting Point
            simLng = 75.9613;
          }

          watchId = setInterval(() => {
            // Simulate bus moving slowly Northeast
            simLat += 0.0001;
            simLng += 0.0001;
            broadcastLocation(simLat, simLng, 25);
          }, 3000); // 3 seconds
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );

      // Update UI to reflect active state
      btnStartTrip.classList.add('trip-started', 'btn-secondary');
      btnStartTrip.classList.remove('btn-primary');
      btnStartTrip.innerHTML = '<i class="ph ph-stop-circle"></i> End Trip';
      btnStartTrip.disabled = false;

      showAlert('Trip Started', 'Live location is now broadcasting to students.', 'success');
    }
  });
}

// --- EMERGENCY BREAKDOWN LOGIC ---
window.triggerEmergency = async function () {
  const routeSelect = document.getElementById('driver-route-select');
  const routeId = routeSelect ? routeSelect.value : 'all';
  const routes = [
    { id: 'route-calicut', name: 'Calicut University', bus_number: '4' },
    { id: 'route-kondotty', name: 'Kondotty', bus_number: '2' }
  ];
  const selectedRoute = routes.find(r => r.id === routeId) || { name: 'Unknown Route', bus_number: 'N/A' };

  if (!confirm(`Are you sure you want to trigger an EMERGENCY breakdown alert for ${selectedRoute.name} (Bus #${selectedRoute.bus_number})?`)) {
    return;
  }

  try {
    const title = "🚨 Emergency Breakdown";
    const message = `Bus #${selectedRoute.bus_number} on the ${selectedRoute.name} route has experienced a breakdown. A replacement bus will be arranged shortly. Please stay updated.`;

    // 1. Database Notification (Persistent for all students on route)
    const { error } = await window.supabaseClient
      .from('notifications')
      .insert([
        {
          title: title,
          message: message,
          target_audience: routeId
        }
      ]);

    if (error) throw error;

    // 2. Real-time Broadcast (Instant for students currently tracking)
    const channelName = `bus-tracking-${routeId}`;
    const emergencyChannel = window.supabaseClient.channel(`emergency-${routeId}`);

    emergencyChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await emergencyChannel.send({
          type: 'broadcast',
          event: 'emergency_alert',
          payload: { title, message, routeId }
        });
        window.supabaseClient.removeChannel(emergencyChannel);
      }
    });

    // Also try broadcasting on the tracking channel if it exists
    const trackingChannel = window.supabaseClient.channel(channelName);
    trackingChannel.send({
      type: 'broadcast',
      event: 'location_update', // Reuse location pipe or create new one
      payload: { emergency: true, title, message }
    });

    showAlert('Emergency Alert Sent', 'All students on this route have been notified.', 'success');
  } catch (err) {
    console.error("Emergency Alert Error:", err);
    showAlert('Error', 'Failed to send alert: ' + err.message, 'error');
  }
};

// --- N/A (Driver QR Code Scanner Reverted) ---
// --- SUPABASE AUTHENTICATION ---

// --- SUPABASE AUTHENTICATION ---

// 2. Student Login
const loginForm = document.getElementById('form-student-login');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = document.getElementById('btn-student-login');
    const emailInput = document.getElementById('login-email').value.trim();
    const passInput = document.getElementById('login-password').value;

    if (!emailInput || !passInput) {
      showAlert('Invalid Input', 'Please enter your email and password.', 'warning');
      return;
    }

    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Logging in...';
    btn.disabled = true;

    try {
      const { data, error } = await window.supabaseClient.auth.signInWithPassword({
        email: emailInput,
        password: passInput
      });

      btn.innerHTML = 'Login';
      btn.disabled = false;

      if (error) {
        console.error("Login Error from Supabase:", error);
        let msg = error.message;
        if (msg.includes("Invalid login credentials")) {
          msg = "Wrong email or password. Please try again or Sign Up first.";
        }
        showAlert('Login Failed', msg, 'error');
      } else {
        showAlert('Login Successful', 'Welcome back!', 'success');
        localStorage.removeItem('driver_assigned_route');
        localStorage.setItem('nextstop_role', 'student');
        loginForm.reset();

        // After login, app behavior runs via initApp. No need to duplicate UI hydration here.

        // Instantly load the Student Dashboard (Home) after login
        refreshDashboardProfile();
        navigateTo('view-student-dashboard');

        // Optionally, auto-load their assigned route here if you build the profile system:
        // loadTrackingData(data.user.id, "Auto Route", "TBD");
      }
    } catch (err) {
      console.error("Unexpected error during login:", err);
      btn.innerHTML = 'Login';
      btn.disabled = false;
      showAlert('System Error', 'Could not connect to the database. Check console.', 'error');
    }
  });
}

// 3. Driver Login
const driverLoginForm = document.getElementById('form-driver-login');
if (driverLoginForm) {
  driverLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = document.getElementById('btn-driver-login');
    const idInput = document.getElementById('login-driver-id').value.trim();
    const passInput = document.getElementById('login-driver-password').value;

    if (!idInput || !passInput) {
      showAlert('Invalid Input', 'Please enter your Driver ID and password.', 'warning');
      return;
    }

    // Alias translation: if the ID is just "emeabus", map it to "emeabus@routesync.com"
    // This allows Supabase to validate it as an email without confusing the drivers.
    const emailAlias = idInput.includes('@') ? idInput : `${idInput}@nextstop.com`;

    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Verifying...';
    btn.disabled = true;

    try {
      // Route specific password mapping
      const routePasswords = {
        '123': 'route-kondotty',
        '1234': 'route-calicut'
      };

      const assignedRoute = routePasswords[passInput];

      if (!assignedRoute) {
        btn.innerHTML = 'Verify & Login';
        btn.disabled = false;
        showAlert('Access Denied', 'Invalid Password. Please check your credentials.', 'error');
        return;
      }

      // We still try Supabase for session consistency, but for drivers we allow a "bypass"
      // if it's one of the hardcoded route passwords from the prompt.
      const { data, error } = await window.supabaseClient.auth.signInWithPassword({
        email: emailAlias,
        password: passInput
      });

      // Bypassing strict Supabase requirement for the specific requested passwords
      const isRoutePass = (passInput === '123' || passInput === '1234');

      if (error && !isRoutePass) {
        console.error("Driver Login Error:", error);
        btn.innerHTML = 'Verify & Login';
        btn.disabled = false;
        showAlert('Access Denied', 'Invalid Driver ID or Password.', 'error');
      } else {
        // Store assigned route and role for the session
        localStorage.setItem('driver_assigned_route', assignedRoute);
        localStorage.setItem('nextstop_role', 'driver');

        btn.innerHTML = 'Verify & Login';
        btn.disabled = false;

        showAlert('Access Granted', 'Welcome to the Driver Portal', 'success');
        driverLoginForm.reset();
        navigateTo('view-driver-dashboard');
      }
    } catch (err) {
      console.error("Unexpected error during driver login:", err);
      btn.innerHTML = 'Verify & Login';
      btn.disabled = false;
      showAlert('System Error', 'Could not connect to the secure server.', 'error');
    }
  });
}

// 4. Admin Login
const adminLoginForm = document.getElementById('form-admin-login');
if (adminLoginForm) {
  adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = document.getElementById('btn-admin-login');
    const idInput = document.getElementById('login-admin-id').value.trim();
    const passInput = document.getElementById('login-admin-password').value;

    if (!idInput || !passInput) {
      showAlert('Invalid Input', 'Please enter your Admin ID and password.', 'warning');
      return;
    }

    // Map admin ID to an email for Supabase (e.g., 'admin' -> 'admin@nextstop.com')
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
        showAlert('Access Denied', 'Invalid Admin Credentials.', 'error');
      } else {
        localStorage.setItem('nextstop_role', 'admin');
        showAlert('Login Successful', 'Welcome to the Next Stop Admin Portal', 'success');
        adminLoginForm.reset();
        window.location.href = 'admin.html';
      }
    } catch (err) {
      console.error("Unexpected error during admin login:", err);
      btn.innerHTML = 'Login as Admin';
      btn.disabled = false;
      showAlert('System Error', 'Could not connect to the server.', 'error');
    }
  });
}

// 5. Forgot Password Request
const forgotPasswordForm = document.getElementById('form-forgot-password');
if (forgotPasswordForm) {
  forgotPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-forgot-password');
    const email = document.getElementById('forgot-email').value.trim();

    if (!email) {
      showAlert('Invalid Email', 'Please enter your email address.', 'warning');
      return;
    }

    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Sending link...';
    btn.disabled = true;

    try {
      const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname,
      });

      btn.innerHTML = 'Send Reset Link';
      btn.disabled = false;

      if (error) {
        showAlert('Reset Failed', error.message, 'error');
      } else {
        showAlert('Email Sent', 'Check your inbox for the reset link.', 'success');
        forgotPasswordForm.reset();
        navigateTo('view-student-login');
      }
    } catch (err) {
      console.error("Forgot password error:", err);
      btn.innerHTML = 'Send Reset Link';
      btn.disabled = false;
      showAlert('Error', 'An unexpected error occurred.', 'error');
    }
  });
}

// 6. Update Password Submission
const updatePasswordForm = document.getElementById('form-update-password');
if (updatePasswordForm) {
  updatePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-update-password');
    const password = document.getElementById('update-password').value;
    const confirm = document.getElementById('update-password-confirm').value;

    if (password.length < 6) {
      showAlert('Weak Password', 'Password must be at least 6 characters.', 'warning');
      return;
    }

    if (password !== confirm) {
      showAlert('Passwords Match', 'New passwords do not match.', 'warning');
      return;
    }

    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Updating...';
    btn.disabled = true;

    try {
      const { error } = await window.supabaseClient.auth.updateUser({
        password: password
      });

      btn.innerHTML = 'Update Password';
      btn.disabled = false;

      if (error) {
        showAlert('Update Failed', error.message, 'error');
      } else {
        showAlert('Success!', 'Your password has been updated.', 'success');
        updatePasswordForm.reset();
        navigateTo('view-student-login');
      }
    } catch (err) {
      console.error("Update password error:", err);
      btn.innerHTML = 'Update Password';
      btn.disabled = false;
      showAlert('Error', 'An unexpected error occurred.', 'error');
    }
  });
}

// 7. Sign Out (Student Profile View)
// There is a sign out card in view-profile
const signOutBtn = document.querySelector('#view-profile .card-interactive');
if (signOutBtn) {
  // Override the generic data-navigate behavior by making it an explicit listener
  signOutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation(); // prevent default navigation

    const { error } = await window.supabaseClient.auth.signOut();

    if (error) {
      showAlert('Sign Out Error', error.message, 'error');
    } else {
      showAlert('Signed Out', 'You have been securely logged out.', 'info');
      navigateTo('view-role');
    }
  });
}

/**
 * --- DYNAMIC DATA FETCHING ---
 */

async function loadDashboardRoutes() {
  const studentGrid = document.getElementById('dashboard-route-grid');
  const driverGrid = document.getElementById('driver-route-grid');

  if (!studentGrid && !driverGrid) return;

  // REVERTED: Using static mock routes instead of querying the deleted `routes` table
  let routes = [
    { id: 'route-calicut', name: 'Calicut University', bus_number: '4' },
    { id: 'route-kondotty', name: 'Kondotty', bus_number: '2' }
  ];

  // If driver, filter to assigned route
  const assignedRouteId = localStorage.getItem('driver_assigned_route');

  if (assignedRouteId) {
    routes = routes.filter(r => r.id === assignedRouteId);
  }

  // Pre-defined random colors for UI flare
  const colors = [
    { bg: 'rgba(254, 243, 199, 0.4)', text: 'var(--color-warning)' },
    { bg: 'rgba(204, 251, 241, 0.4)', text: 'var(--color-teal)' },
    { bg: 'rgba(224, 231, 255, 0.4)', text: 'var(--color-primary)' },
  ];

  // 1. Render Student Route Grid (v2 Match Image)
  if (studentGrid) {
    studentGrid.innerHTML = routes.map((r, i) => {
      const stops = i === 0 ? "7 stops" : "4 stops";
      const price = i === 0 ? "₹1500/month" : "₹1800/month";
      const path = i === 0 ? "Calicut University → EMEA" : "Kondotty → EMEA";

      return `
        <div class="route-card-v2" onclick="loadTrackingData('${r.id}', '${r.name}', '${r.bus_number}'); document.getElementById('nav-tracking').click();">
          <div class="illustration-box">
             <img src="bus1.jpg" alt="Bus">
          </div>
          <div class="route-meta">
            <h4>Route ${i + 1}</h4>
            <p>${path}</p>
            <div class="stats">${stops} • ${price}</div>
          </div>
          <div class="chevron-box">
            <i class="ph ph-caret-right"></i>
          </div>
        </div>
        `;
    }).join('');
  }

  // 2. Render Driver Route Grid & Populate Hidden Select
  const driverSelect = document.getElementById('driver-route-select');
  if (driverGrid && driverSelect) {
    driverSelect.innerHTML = ''; // Clear select options

    driverGrid.innerHTML = routes.map((r, i) => {
      const c = colors[i % colors.length];

      // Add to pure HTML select
      const option = document.createElement('option');
      option.value = r.id;
      option.text = r.name;
      if (i === 0) option.selected = true;
      driverSelect.appendChild(option);

      const isActive = i === 0 ? 'active' : '';
      const borderStyle = i === 0 ? '2px solid var(--color-teal)' : '1px solid var(--color-gray-200)';
      const bgStyle = i === 0 ? 'rgba(0, 128, 128, 0.05)' : 'var(--color-white)';

      return `
        <div class="card route-card card-interactive ${isActive}" id="driver-card-${r.id}"
            style="display: flex; align-items: center; gap: 1rem; border: ${borderStyle}; background-color: ${bgStyle};"
            onclick="selectDriverRoute('${r.id}')">
            <div class="route-icon"
                style="width: 48px; height: 48px; border-radius: 12px; display:flex; align-items:center; justify-content:center; font-size: 1.5rem; background-color: ${c.bg}; color: ${c.text};">
                <i class="ph-fill ph-bus"></i>
            </div>
            <div class="route-info" style="text-align: left; flex: 1;">
                <h4 style="margin: 0; font-size: 1rem; color: var(--color-gray-900); font-weight: 600;">${r.name}</h4>
                <p style="margin: 4px 0 0 0; font-size: 0.875rem; color: var(--color-gray-500);">Bus #${r.bus_number}</p>
            </div>
        </div>
        `;
    }).join('');
  }

  // --- BACKGROUND TRIP-STARTED NOTIFICATIONS ---
  // Setup global listeners so if the student is on the dashboard, they get a push notification when ANY bus starts
  if (!window.globalTripListenersSet && routes.length > 0) {
    window.globalTripListenersSet = true;
    routes.forEach(r => {
      const channel = window.supabaseClient.channel(`notify-${r.id}`);
      channel.on('broadcast', { event: 'tripStarted' }, (payload) => {
        showAlert(`🚌 Bus Started!`, `Bus #${r.bus_number} (${r.name}) has departed from the college and is en-route.`, 'success');
      }).subscribe();
    });
  }
}

window.selectDriverRoute = function (routeId) {
  document.getElementById('driver-route-select').value = routeId;

  // Reset all cards visually
  const cards = document.querySelectorAll('#driver-route-grid .route-card');
  cards.forEach(card => {
    card.classList.remove('active');
    card.style.border = '1px solid var(--color-gray-200)';
    card.style.backgroundColor = 'var(--color-white)';
  });

  // Make selected active
  const selectedCard = document.getElementById(`driver-card-${routeId}`);
  if (selectedCard) {
    selectedCard.classList.add('active');
    selectedCard.style.border = '2px solid var(--color-teal)';
    selectedCard.style.backgroundColor = 'rgba(0, 128, 128, 0.05)';
  }
}

// Global state to store current route
window.currentRouteId = null;

/**
 * --- DYNAMIC DATA FETCHING ---
 */

/**
 * Fetches profile data from Supabase or falls back to user metadata
 * Uses a caching promise to avoid redundant parallel calls
 */
window.cachedProfilePromise = null;

async function getProfileData() {
  if (window.cachedProfilePromise) return window.cachedProfilePromise;

  window.cachedProfilePromise = (async () => {
    try {
      // Use getSession as it is faster and contains user metadata
      const { data: { session }, error: sessionErr } = await window.supabaseClient.auth.getSession();

      if (sessionErr) {
        if (sessionErr.name === 'AbortError') {
          console.warn("Auth Lock Stolen (AbortError) - another tab is likely handling session.");
        } else {
          console.error("Session fetch error:", sessionErr);
        }
      }

      const user = session?.user;
      if (!user) return null;

      const { data: profile } = await window.supabaseClient
        .from('profiles')
        .select(`
      *,
      routes!route_id(name, bus_number)
    `)
        .eq('id', user.id)
        .single();

      return {
        fullName: profile?.full_name || user.user_metadata?.full_name || 'Student',
        admissionNumber: profile?.admission_number || user.user_metadata?.admission || '2024CS001',
        avatarUrl: profile?.avatar_url || user.user_metadata?.avatar,
        email: profile?.email || user.email,
        routeName: profile?.routes?.name || 'Not Assigned',
        busNumber: profile?.routes?.bus_number || 'N/A',
        profile // full object
      };
    } catch (err) {
      if (err.name === 'AbortError') {
        console.warn("Caught AbortError in getProfileData - ignoring.");
      } else {
        console.error("Error in getProfileData:", err);
      }
      return null;
    }
  })();

  return window.cachedProfilePromise;
}

/**
 * Hydrates the Student Dashboard header with dynamic user data
 */
async function refreshDashboardProfile() {
  const data = await getProfileData();
  if (!data) return;

  const nameEl = document.getElementById('dashboard-student-name');
  if (nameEl) nameEl.textContent = data.fullName;

  const idEl = document.getElementById('dashboard-student-id');
  if (idEl) idEl.textContent = data.admissionNumber;

  const avatarEl = document.getElementById('dashboard-avatar');
  if (avatarEl && data.avatarUrl) {
    avatarEl.innerHTML = `<img src="${data.avatarUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
  }
}

async function loadProfileData() {
  const data = await getProfileData();
  if (!data) return;

  const profile = data.profile;
  const metadataName = data.fullName;
  const metadataAdmission = data.admissionNumber;
  const metadataAvatar = data.avatarUrl;

  const metadataRoute = data.routeName;
  const metadataBus = data.busNumber;
  const metadataRegister = profile?.register_number || 'Not Assigned';
  const metadataCourse = profile?.course || 'Not Assigned';
  const metadataAcademicYear = profile?.academic_year || 'Not Assigned';

  // Update Virtual ID Card HTML elements
  const vidAvatarContainer = document.getElementById('vid-avatar-container');
  if (vidAvatarContainer && metadataAvatar) {
    vidAvatarContainer.innerHTML = `<img src="${metadataAvatar}" style="width: 100%; height: 100%; object-fit: cover;">`;
  }

  const nameEl = document.getElementById('vid-name');
  if (nameEl) nameEl.textContent = metadataName;

  const emailEl = document.getElementById('vid-email');
  if (emailEl) emailEl.textContent = data.email;

  const routeEl = document.getElementById('vid-route');
  if (routeEl) routeEl.textContent = metadataRoute;

  const admissionNoEl = document.getElementById('vid-admission-no');
  if (admissionNoEl) admissionNoEl.textContent = metadataAdmission;

  const regNoEl = document.getElementById('vid-reg-no');
  if (regNoEl) regNoEl.textContent = metadataRegister;

  const courseEl = document.getElementById('vid-course');
  if (courseEl) courseEl.textContent = metadataCourse;

  const ayEl = document.getElementById('vid-academic-year');
  if (ayEl) ayEl.textContent = metadataAcademicYear;

  const busEl = document.getElementById('vid-bus');
  if (busEl) {
    if (metadataBus !== 'N/A') {
      busEl.textContent = `Bus #${metadataBus}`;
    } else {
      busEl.textContent = 'Pending Assignment';
    }
  }

  // The Live QR Code feature was reverted. The container is now just a static icon.
}

async function loadStudentPaymentData() {
  const { data: { session } } = await window.supabaseClient.auth.getSession();
  if (!session) return;

  const studentId = session.user.id;

  // 1. Fetch Fee Payment Summary
  const { data: feeData, error: feeErr } = await window.supabaseClient.from('fee_payments')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle();

  // 2. Fetch Payment History Log
  const { data: historyData, error: histErr } = await window.supabaseClient.from('payment_history')
    .select('*')
    .eq('student_id', studentId)
    .order('date', { ascending: false });

  if (feeErr) console.error("Fee error:", feeErr);
  if (histErr) console.error("History error:", histErr);

  // Render Summary Box
  const acYearEl = document.getElementById('pay-academic-year');
  const totalPaidEl = document.getElementById('pay-total-paid');
  const nextDueEl = document.getElementById('pay-next-due');
  const badgeEl = document.getElementById('pay-progress-badge');
  const statusEl = document.getElementById('pay-status-text');

  let totalDue = 2500;
  let amountPaid = 0;

  if (feeData) {
    totalDue = Number(feeData.total_due || 2500);
    amountPaid = Number(feeData.amount_paid || 0);

    if (acYearEl) acYearEl.textContent = `Academic Program (${feeData.academic_year || 'N/A'})`;
  }

  const remaining = totalDue - amountPaid;

  if (totalPaidEl) totalPaidEl.textContent = `₹${amountPaid.toLocaleString()}`;
  if (nextDueEl) {
    if (remaining > 0) {
      nextDueEl.innerHTML = `Remaining: ₹${remaining.toLocaleString()}`;
    } else {
      nextDueEl.innerHTML = `Fully Paid`;
    }
  }

  if (badgeEl && statusEl) {
    if (feeData && amountPaid >= totalDue && totalDue > 0) {
      badgeEl.textContent = 'Cleared';
      badgeEl.style.background = 'var(--color-success)';
      statusEl.textContent = 'No pending dues';
      statusEl.style.color = 'var(--color-success)';
    } else if (feeData && amountPaid > 0) {
      badgeEl.textContent = 'Partial';
      badgeEl.style.background = 'rgba(255,255,255,0.2)';
      statusEl.textContent = 'Fees pending';
    } else {
      badgeEl.textContent = 'Pending';
      badgeEl.style.background = 'rgba(255,0,0,0.5)';
      statusEl.textContent = 'Awaiting payment';
    }
  }

  // Store state for tab switching
  window.lastFeeData = feeData;
  window.lastHistoryData = historyData;
  window.lastAmountPaid = amountPaid;
  if (window.selectedPaymentYearOffset === undefined) {
    window.selectedPaymentYearOffset = 0;
  }

  renderPaymentTabs(feeData, amountPaid);
  renderPaymentYear(feeData, historyData, amountPaid, window.selectedPaymentYearOffset);
}

/**
 * Renders tabs for each academic year
 */
function renderPaymentTabs(feeData, amountPaid) {
  const tabsContainer = document.getElementById('payment-year-tabs');
  if (!tabsContainer) return;

  const monthlyFee = 250;
  const monthsPerYear = 10;
  const yearCost = monthlyFee * monthsPerYear;

  // Determine how many years to show (at least 1, plus any years with payments)
  let startYear = new Date().getFullYear();
  if (feeData && feeData.academic_year) {
    const yearMatches = feeData.academic_year.match(/^(\d{4})/);
    if (yearMatches && yearMatches[1]) {
      startYear = parseInt(yearMatches[1], 10);
    }
  }

  // Calculate total years: standard is 3 or 4, but we'll show up to 5 if paid
  let totalYearsToShow = 1;
  const paidYears = Math.ceil(amountPaid / yearCost);
  totalYearsToShow = Math.max(1, paidYears, 3); // Show at least 3 years by default for college

  let tabsHtml = '';
  for (let i = 0; i < totalYearsToShow; i++) {
    const isActive = i === window.selectedPaymentYearOffset ? 'active' : '';
    const yearLabel = `${startYear + i}-${(startYear + i + 1).toString().slice(-2)}`;
    tabsHtml += `<div class="year-tab ${isActive}" onclick="switchPaymentYear(${i}, this)">${yearLabel}</div>`;
  }

  tabsContainer.innerHTML = tabsHtml;
}

/**
 * Switches the active payment year tab
 */
window.switchPaymentYear = function (offset, element) {
  window.selectedPaymentYearOffset = offset;

  // Update UI tabs
  const tabs = document.querySelectorAll('#payment-year-tabs .year-tab');
  tabs.forEach(t => t.classList.remove('active'));
  if (element) element.classList.add('active');

  // Re-render the month list
  renderPaymentYear(window.lastFeeData, window.lastHistoryData, window.lastAmountPaid, offset);
};

function renderPaymentYear(feeData, historyData, amountPaid, selectedYearOffset = 0) {
  console.log("Rendering Payment Year:", { feeData, amountPaid, selectedYearOffset });
  const monthlyContainer = document.getElementById('monthly-installments-container');
  if (monthlyContainer) {
    const monthlyFee = 250;
    const monthsPerYear = 10;
    const yearCost = monthlyFee * monthsPerYear;

    // Remaining paid amount available for THIS selected year
    // We subtract the cost of all previous years
    let remainingPaid = Math.max(0, amountPaid - (selectedYearOffset * yearCost));

    // Determine the starting calendar year
    let startYear = new Date().getFullYear();
    if (feeData && feeData.academic_year) {
      const yearMatches = feeData.academic_year.match(/^(\d{4})/);
      if (yearMatches && yearMatches[1]) {
        startYear = parseInt(yearMatches[1], 10);
      }
    }

    // Adjust startYear based on the offset
    const currentYearStart = startYear + selectedYearOffset;

    const monthNamesFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    let html = '';

    // Show 10 months for the selected academic year
    for (let i = 0; i < monthsPerYear; i++) {
      // Academic year in many Indian colleges starts in June (Index 5)
      const realMonthIndex = (5 + i) % 12;
      const yearOffsetForMonth = Math.floor((5 + i) / 12);
      const monthDisplay = `${monthNamesFull[realMonthIndex]} ${currentYearStart + yearOffsetForMonth}`;
      let statusHtml = '';
      let amountHtml = '';
      let bgStyle = '';
      let iconColor = '';
      let iconType = '';
      let payButtonHtml = '';

      // Payments are now verified sequentially based on total amount paid.
      // Individual month lookup by name is removed to avoid schema errors.
      const pendingPayment = null;

      const colors = [
        { bg: 'rgba(254, 243, 199, 0.4)' },
        { bg: 'rgba(204, 251, 241, 0.4)' },
        { bg: 'rgba(224, 231, 255, 0.4)' },
      ];

      if (remainingPaid >= monthlyFee) {
        // Fully paid month
        remainingPaid -= monthlyFee;
        statusHtml = 'Payment Successful';
        amountHtml = `₹${monthlyFee}`;
        iconColor = 'var(--color-success)';
        iconType = 'ph-check-circle';
      } else if (pendingPayment) {
        // Pending Verification month
        statusHtml = 'Pending Verification';
        amountHtml = `₹${monthlyFee}`;
        iconColor = 'var(--color-warning)';
        iconType = 'ph-clock';
      } else if (remainingPaid > 0) {
        // Partially paid month
        const left = monthlyFee - remainingPaid;
        statusHtml = `Partial (₹${remainingPaid} paid)`;
        amountHtml = `₹${left}`;
        remainingPaid = 0;
        iconColor = '#D97706';
        iconType = 'ph-clock-counter-clockwise';
        payButtonHtml = `<button class="btn btn-primary" onclick="showAlert('Manual Payment', 'Please pay ₹${left} balance at the college finance office.', 'info')" style="padding: 4px 12px; font-size: 0.75rem; border-radius: var(--radius-full); margin-top: 8px;">Pay Balance</button>`;
      } else {
        // Unpaid month
        statusHtml = 'Awaiting Payment';
        amountHtml = `₹${monthlyFee}`;
        iconColor = 'var(--color-error)';
        iconType = 'ph-info';
        payButtonHtml = `<button class="btn btn-primary" onclick="showAlert('Manual Payment', 'Please pay ₹${monthlyFee} at the college finance office.', 'info')" style="padding: 4px 12px; font-size: 0.75rem; border-radius: var(--radius-full); margin-top: 8px;">Pay Now</button>`;
      }

      const p = colors[i % colors.length];

      html += `
        <div class="payment-card-premium" style="animation-delay: ${i * 0.05}s">
          <div class="status-icon" style="background-color: ${p.bg}; color: ${iconColor};">
            <i class="ph-fill ${iconType}"></i>
          </div>
          <div class="payment-info">
            <h4>${monthDisplay}</h4>
            <p>${statusHtml}</p>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 800; color: var(--color-gray-900); font-size: 1.1rem;">${amountHtml}</div>
            ${payButtonHtml}
          </div>
        </div>
      `;
    }

    monthlyContainer.innerHTML = html;
  }
}

async function loadTrackingData(routeId, routeName, busNumber) {
  window.currentRouteId = routeId;
  navigateTo('view-tracking');

  // Update headers
  document.getElementById('track-route-number').textContent = routeName || 'N/A';
  document.getElementById('track-bus-id').textContent = busNumber || 'N/A';
  const badge = document.getElementById('tracking-status-badge');

  if (badge) {
    badge.innerHTML = '<div style="width: 8px; height: 8px; border-radius: 50%; background: var(--color-warning);"></div> Connecting...';
  }

  // Cleanup old sub if doing multiple times
  if (window.currentTrackingChannel) {
    window.supabaseClient.removeChannel(window.currentTrackingChannel);
    window.currentTrackingChannel = null;
  }

  // Define static routing stops with coordinates for the dynamic list
  let stops = [];
  const normalizedRouteName = (routeName || '').toLowerCase();

  if (normalizedRouteName.includes('calicut') || normalizedRouteName.includes('univers') || normalizedRouteName.includes('univerc')) {
    stops = [
      { name: 'Calicut University', lat: 11.1314, lng: 75.8945, status: 'upcoming' },
      { lat: 11.1290, lng: 75.8946, status: 'upcoming' },
      { name: 'Kohinoor', lat: 11.1276, lng: 75.8947, status: 'upcoming' },
      { lat: 11.1285, lng: 75.8975, status: 'upcoming' },
      { lat: 11.1305, lng: 75.9010, status: 'upcoming' },
      { name: 'Devathiyal', lat: 11.1345, lng: 75.9030, status: 'upcoming' },
      { lat: 11.1365, lng: 75.9080, status: 'upcoming' },
      { lat: 11.1375, lng: 75.9120, status: 'upcoming' },
      { name: 'Puthur Pallikal', lat: 11.1377, lng: 75.9166, status: 'upcoming' },
      { lat: 11.1385, lng: 75.9205, status: 'upcoming' },
      { lat: 11.1375, lng: 75.9245, status: 'upcoming' },
      { name: 'Vayaloram', lat: 11.1355, lng: 75.9280, status: 'upcoming' },
      { lat: 11.1340, lng: 75.9315, status: 'upcoming' },
      { lat: 11.1325, lng: 75.9350, status: 'upcoming' },
      { lat: 11.1320, lng: 75.9370, status: 'upcoming' },
      { name: 'Chembolchira', lat: 11.1332, lng: 75.9385, status: 'upcoming' },
      { lat: 11.1345, lng: 75.9395, status: 'upcoming' },
      { lat: 11.1355, lng: 75.9410, status: 'upcoming' },
      { lat: 11.1345, lng: 75.9420, status: 'upcoming' },
      { name: 'EMEA College (Kummiparamba)', lat: 11.1341, lng: 75.9429, status: 'upcoming' }
    ];
  } else if (normalizedRouteName.includes('kondotty')) {
    stops = [
      { name: 'Kondotty', lat: 11.1481, lng: 75.9592, status: 'upcoming' },
      { lat: 11.1496, lng: 75.9584, status: 'upcoming' },
      { lat: 11.1518, lng: 75.9565, status: 'upcoming' },
      { lat: 11.1543, lng: 75.9535, status: 'upcoming' },
      { lat: 11.1562, lng: 75.9515, status: 'upcoming' },
      { name: 'Kolathur', lat: 11.157483, lng: 75.949693, status: 'upcoming' },
      { lat: 11.1545, lng: 75.9496, status: 'upcoming' },
      { lat: 11.1515, lng: 75.9489, status: 'upcoming' },
      { lat: 11.1485, lng: 75.9484, status: 'upcoming' },
      { name: 'Airport Junction', lat: 11.145481, lng: 75.948158, status: 'upcoming' },
      { lat: 11.1453, lng: 75.9460, status: 'upcoming' },
      { lat: 11.1444, lng: 75.9425, status: 'upcoming' },
      { lat: 11.1434, lng: 75.9395, status: 'upcoming' },
      { lat: 11.1425, lng: 75.9370, status: 'upcoming' },
      { name: 'EMEA College (Kummiparamba)', lat: 11.1341, lng: 75.9429, status: 'upcoming' }
    ];
  }
  window.trackingStops = stops;

  // Initialize Leaflet Map
  if (window.viewMap) {
    window.viewMap.remove();
    window.viewMap = null;
  }

  if (stops.length > 0) {
    setTimeout(() => {
      // 1. Create the map instance
      window.viewMap = L.map('track-map', {
        zoomControl: false // Hide default zoom for cleaner mobile UI
      }).setView([stops[0].lat, stops[0].lng], 13);

      // 2. Add OpenStreetMap Tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(window.viewMap);

      // 3. Draw Route Path Polyline
      const routeCoordinates = stops.map(stop => [stop.lat, stop.lng]);
      const routeLine = L.polyline(routeCoordinates, {
        color: '#0D9488', // Teal
        weight: 4,
        opacity: 0.8,
        dashArray: '10, 10'
      }).addTo(window.viewMap);

      // 4. Add markers for each NAMED station
      stops.forEach((stop, index) => {
        if (!stop.name) return; // Skip waypoints

        const namedStops = stops.filter(s => s.name);
        const isStart = stop.name === namedStops[0].name;
        const isEnd = stop.name === namedStops[namedStops.length - 1].name;

        L.circleMarker([stop.lat, stop.lng], {
          radius: isStart || isEnd ? 6 : 4,
          fillColor: isStart || isEnd ? '#0D9488' : '#ffffff',
          color: '#0D9488',
          weight: 2,
          opacity: 1,
          fillOpacity: 1
        }).bindTooltip(stop.name, {
          permanent: true,
          direction: 'top',
          className: 'map-label',
          offset: [0, -10]
        }).addTo(window.viewMap);
      });

      // 5. Fit map bounds to show the entire route
      window.viewMap.fitBounds(routeLine.getBounds(), { padding: [20, 20] });

      // 6. Init dynamic stops list text
      updateMetroProgress(stops[0].lat, stops[0].lng);
    }, 100); // UI transition delay
  } else {
    const stopList = document.querySelector('#view-tracking .stop-list');
    if (stopList) stopList.innerHTML = `<div style="color: var(--color-gray-500); padding: 1rem;">No stops mapped for this route.</div>`;
  }

  // Establish Supabase Socket purely for broadcast listening
  const channelName = `bus-tracking-${routeId}`;
  const channel = window.supabaseClient.channel(channelName);

  channel.on('broadcast', { event: 'location_update' }, (message) => {
    console.log("Received Location Sync:", message.payload);

    if (badge && !badge.innerHTML.includes('Connected')) {
      badge.innerHTML = '<div style="width: 8px; height: 8px; border-radius: 50%; background: var(--color-success);"></div> Connected (Live)';
      badge.style.border = '1px solid rgba(16, 185, 129, 0.3)';
    }

    if (message.payload) {
      if (message.payload.emergency) {
        showAlert(message.payload.title, message.payload.message, 'error');
      }
      if (message.payload.lat && message.payload.lng) {
        updateMetroProgress(message.payload.lat, message.payload.lng);
      }
    }
  });

  // Listen for specific emergency broadcast
  channel.on('broadcast', { event: 'emergency_alert' }, (message) => {
    showAlert(message.payload.title, message.payload.message, 'error');
  });

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      window.currentTrackingChannel = channel;
      console.log(`Student subscribed to: ${channelName}`);
    } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
      if (badge) {
        badge.innerHTML = '<div style="width: 8px; height: 8px; border-radius: 50%; background: var(--color-error);"></div> Offline';
      }
    }
  });
}

// --- DYNAMIC METRO PROGRESS ALGORITHM ---

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function updateMetroProgress(currentLat, currentLng) {
  if (!window.trackingStops || window.trackingStops.length === 0) return;

  let closestIndex = 0;
  let minDistance = Infinity;
  let totalRouteDistance = 0;
  let distanceCovered = 0;

  // Calculate total route distance for the progress bar
  for (let i = 0; i < window.trackingStops.length - 1; i++) {
    totalRouteDistance += getDistanceFromLatLonInKm(
      window.trackingStops[i].lat, window.trackingStops[i].lng,
      window.trackingStops[i + 1].lat, window.trackingStops[i + 1].lng
    );
  }

  const distances = window.trackingStops.map((stop, index) => {
    const dist = getDistanceFromLatLonInKm(currentLat, currentLng, stop.lat, stop.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closestIndex = index;
    }
    return dist;
  });

  // Calculate distance covered so far (up to closest index)
  for (let i = 0; i < closestIndex; i++) {
    distanceCovered += getDistanceFromLatLonInKm(
      window.trackingStops[i].lat, window.trackingStops[i].lng,
      window.trackingStops[i + 1].lat, window.trackingStops[i + 1].lng
    );
  }

  // Update Live Bus Marker on Leaflet Map
  if (window.viewMap) {
    if (!window.busLiveMarker) {
      const busIcon = L.divIcon({
        html: '<div style="font-size: 1.5rem; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">🚍</div>',
        className: 'live-bus-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });
      window.busLiveMarker = L.marker([currentLat, currentLng], { icon: busIcon, zIndexOffset: 1000 }).addTo(window.viewMap);
    } else {
      window.busLiveMarker.setLatLng([currentLat, currentLng]);
    }
    // Optionally gently pan to bus if checking frequently, but we'll leave it free-roaming for the user
  }

  const stopList = document.querySelector('#view-tracking .stop-list');
  if (stopList) stopList.innerHTML = '';

  // Generate HTML for NAMED stops only
  let stopsHTMLArray = [];

  // Add the vertical progress connection line
  if (totalRouteDistance > 0) {
    let verticalRatio = distanceCovered / totalRouteDistance;
    verticalRatio = Math.max(0, Math.min(1, verticalRatio));
    const completedHeightPercent = verticalRatio * 100;
    stopsHTMLArray.push(`<div class="stop-list-progress" style="height: ${completedHeightPercent}%;"></div>`);
  }

  // Identify the "Next Stop" from the list of named stops
  let nextStopIndex = -1;
  for (let i = closestIndex; i < window.trackingStops.length; i++) {
    if (window.trackingStops[i].name) {
      nextStopIndex = i;
      break;
    }
  }

  window.trackingStops.forEach((stop, index) => {
    if (!stop.name) return; // Skip waypoints for the list UI

    const distForStop = distances[index];
    const timeInMins = Math.round((distForStop / 30) * 60);
    const timeText = timeInMins > 0 ? ` • ~${timeInMins} min` : '';

    if (index < closestIndex && index !== nextStopIndex) {
      stop.status = 'passed';
      stop.distance = 'Departed';
    } else if (index === nextStopIndex) {
      if (minDistance < 0.2 && index === window.trackingStops.length - 1) {
        stop.status = 'passed';
        stop.distance = 'Arrived';
      } else {
        stop.status = 'approaching';
        stop.distance = minDistance < 1 && index === closestIndex ? `Approaching${timeText}` : `${distances[index].toFixed(1)} km away${timeText}`;
      }
    } else {
      stop.status = (index === window.trackingStops.length - 1) ? 'destination' : 'upcoming';
      stop.distance = `${distances[index].toFixed(1)} km away${timeText}`;
    }

    let stopClass = 'stop-item';
    let dotContent = '';
    let statusBadge = '';
    let distanceColor = '';

    if (stop.status === 'passed') {
      stopClass += ' passed';
      dotContent = '<i class="ph ph-check"></i>';
      statusBadge = '<span class="badge badge-success">Passed</span>';
    }
    else if (stop.status === 'approaching') {
      stopClass += ' active';
      dotContent = '<i class="ph-fill ph-bus" style="color: var(--color-teal);"></i>';
      statusBadge = '<span class="badge badge-success">🟢 Approaching</span>';
      distanceColor = 'color: var(--color-teal); font-weight: 600;';
    }
    else if (stop.status === 'upcoming') {
      statusBadge = '<span class="badge badge-warning" style="background-color: var(--color-gray-100); color: var(--color-gray-600);">Scheduled</span>';
    }
    else if (stop.status === 'destination') {
      dotContent = '<i class="ph-fill ph-flag"></i>';
      statusBadge = '<span class="badge badge-error">🔴 Destination</span>';
    }

    const html = `
      <div class="${stopClass}">
        <div class="stop-dot" ${stop.status === 'destination' ? 'style="background-color: var(--color-gray-100);"' : ''}>${dotContent}</div>
        <div class="stop-details">
          <h4>${stop.name}</h4>
          <div class="stop-meta">
            <span class="stop-distance" style="${distanceColor}">${stop.distance}</span>
            ${statusBadge}
          </div>
        </div>
      </div>
    `;

    stopsHTMLArray.unshift(html);
  });

  if (stopList) {
    stopList.innerHTML = stopsHTMLArray.join('');
  }
}

/**
 * Custom Notification/Alert System
 */
function showAlert(title, message, type = 'info') {
  // Remove existing toasts
  const existingToast = document.querySelector('.alert-toast');
  if (existingToast) {
    existingToast.remove();
  }

  // Set icon and color based on type
  let iconClass = 'ph-info';
  let colorVar = 'var(--color-teal)';

  if (type === 'success') {
    iconClass = 'ph-check-circle';
    colorVar = 'var(--color-success)';
  } else if (type === 'warning') {
    iconClass = 'ph-warning';
    colorVar = 'var(--color-warning)';
  } else if (type === 'error') {
    iconClass = 'ph-warning-circle';
    colorVar = 'var(--color-error)';
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'alert-toast';
  toast.style.borderLeftColor = colorVar;

  toast.innerHTML = `
    <div class="alert-icon" style="color: ${colorVar}">
      <i class="ph ${iconClass}"></i>
    </div>
    <div class="alert-content">
      <p style="color: var(--color-gray-900); font-weight: 600; margin-bottom: 2px;">${title}</p>
      <p style="color: var(--color-gray-500); font-weight: 400; font-size: 0.75rem;">${message}</p>
    </div>
  `;

  document.body.appendChild(toast);

  // Animate in
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  // Auto dismiss
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300); // Wait for transition
  }, 3000);
}

/**
 * --- GLOBAL NOTIFICATIONS SYSTEM ---
 */
async function loadNotifications() {
  let session = null;
  try {
    const { data } = await window.supabaseClient.auth.getSession();
    session = data.session;
  } catch (err) {
    if (err.name === 'AbortError') return; // Silent return
    console.error("Auth error in loadNotifications:", err);
  }

  if (!session) return;

  const currentRouteId = session.user.user_metadata?.route || 'all';

  // 1. Fetch initial list from DB
  const { data: notifications, error } = await window.supabaseClient
    .from('notifications')
    .select('*')
    .or(`target_audience.eq.all,target_audience.eq.${currentRouteId}`)
    .order('created_at', { ascending: false })
    .limit(10);

  // Global variable to keep the live list so the marquee stays updated
  window.currentNotificationsList = [];

  if (error) {
    console.warn("Notifications table might not exist yet:", error.message);
  } else {
    const list = notifications || [];
    window.currentNotificationsList = list;
    renderNotifications(list);

    // Check for unread messages against LocalStorage
    if (list.length > 0) {
      const newestDate = list[0].created_at;
      const lastReadDate = localStorage.getItem('nextstop_last_read_notif');

      if (!lastReadDate || new Date(newestDate) > new Date(lastReadDate)) {
        const badge = document.getElementById('student-notification-badge');
        if (badge) badge.style.display = 'block';
      }
    }
  }

  // 2. Setup Realtime Listener if not already set
  if (!window.notificationsListenerSet) {
    window.notificationsListenerSet = true;
    window.supabaseClient
      .channel('public:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
        const newNotif = payload.new;
        if (newNotif.target_audience === 'all' || newNotif.target_audience === currentRouteId) {
          window.currentNotificationsList.unshift(newNotif); // Add to top of list
          prependNotification(newNotif);
          const badge = document.getElementById('student-notification-badge');
          if (badge) badge.style.display = 'block';

          const isEmergency = newNotif.title.includes('🚨') || newNotif.title.toLowerCase().includes('emergency') || newNotif.message.toLowerCase().includes('breakdown');
          const alertType = isEmergency ? 'error' : 'info';
          showAlert(`📣 ${newNotif.title}`, newNotif.message, alertType);
        }
      })
      .subscribe();
  }
}

// Global function to mark notifications as read when the bell is clicked
window.markNotificationsRead = function () {
  const badge = document.getElementById('student-notification-badge');

  if (badge) badge.style.display = 'none';

  // Save the latest timestamp as read
  if (window.currentNotificationsList && window.currentNotificationsList.length > 0) {
    localStorage.setItem('nextstop_last_read_notif', window.currentNotificationsList[0].created_at);
  }

  // Navigate to the dedicated notifications view
  navigateTo('view-notifications');
};

function renderNotifications(notifications) {
  const container = document.getElementById('student-notifications-list');
  if (!container) return;

  if (notifications.length === 0) {
    container.innerHTML = `
      <div class="messenger-empty">
        <i class="ph ph-chat-centered-text"></i>
        <p>No new messages from management.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = notifications.map(n => createNotificationHTML(n)).join('');
}

function prependNotification(n) {
  const container = document.getElementById('student-notifications-list');
  if (!container) return;

  if (container.innerHTML.includes('No new announcements')) {
    container.innerHTML = '';
  }

  const html = createNotificationHTML(n);
  container.insertAdjacentHTML('afterbegin', html);
}

function createNotificationHTML(n) {
  const date = new Date(n.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Decide icon based on title/content keywords
  let icon = 'ph-bell';
  const text = (n.title + n.message).toLowerCase();
  if (text.includes('emergency') || text.includes('breakdown')) icon = 'ph-warning-octagon';
  else if (text.includes('bus') || text.includes('route') || text.includes('driver')) icon = 'ph-bus';
  else if (text.includes('delay') || text.includes('traffic') || text.includes('late')) icon = 'ph-clock';
  if (text.includes('pay') || text.includes('fee') || text.includes('money')) icon = 'ph-credit-card';
  if (text.includes('holiday') || text.includes('close')) icon = 'ph-calendar-x';

  return `
    <div class="msg-item">
      <div class="msg-avatar">
        <i class="ph-fill ${icon}"></i>
      </div>
      <div class="msg-content">
        <div class="msg-bubble">
          <h4>${n.title}</h4>
          <p>${n.message}</p>
        </div>
        <span class="msg-time">${date}</span>
      </div>
    </div>
  `;
}
