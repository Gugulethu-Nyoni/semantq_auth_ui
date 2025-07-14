// login.js
import AppConfig from './config.js';

console.log('✅ Login script initialized');

// Constants
const PATHS = {
    // We will determine the specific dashboard path dynamically
    LOGIN_API: `${AppConfig.BASE_URL}/login`,
    VALIDATE_SESSION: `${AppConfig.BASE_URL}/validate-session`
};

// DOM Elements
const form = document.getElementById('login-form');
const statusDiv = document.getElementById('auth-status');
const submitBtn = form.querySelector('button[type="submit"]');

// UI Utilities
function showStatus(message, isError = false) {
    console.log(`UI Status: ${message}`);
    statusDiv.textContent = message;
    statusDiv.className = isError ? 'error' : 'success';
    statusDiv.classList.remove('hidden');
}

function setLoadingState(isLoading) {
    submitBtn.disabled = isLoading;
    form.classList.toggle('loading', isLoading);
}

// Session Validation (from auth.js, but duplicated here for login-specific checks)
// Note: In a real app, you might centralize this more, but for now, it's fine.
async function verifySessionAndGetAccessLevel() {
    console.log('🔒 Starting session verification...');
    try {
        const startTime = performance.now();
        const res = await fetch(PATHS.VALIDATE_SESSION, {
            method: 'GET',
            credentials: 'include'
        });
        const duration = (performance.now() - startTime).toFixed(2);

        console.log(`Session verification: ${res.status} (${duration}ms)`);

        if (!res.ok) {
            console.log('❌ Validation failed - response not OK');
            return { isValid: false, accessLevel: null };
        }

        const data = await res.json();
        console.log('Validation response:', data);
        return {
            isValid: data.success && data.data?.valid === true,
            accessLevel: data.data?.access_level || null
        };

    } catch (err) {
        console.error('❌ Session verification error:', err);
        return { isValid: false, accessLevel: null };
    }
}

/**
 * Redirects the user to the appropriate dashboard based on their access level.
 * @param {number} userAccessLevel The access level of the logged-in user.
 */
async function redirectToDashboard(userAccessLevel) {
    let dashboardPath;

    // Determine the dashboard path based on access_level
    if (userAccessLevel === 3) { // Admin or Super Admin
        dashboardPath = AppConfig.SUPER_ADMIN_DASHBOARD;
    } else if (userAccessLevel === 2) { // Editor/Moderator
        dashboardPath = AppConfig.ADMIN_DASHBOARD;
    } else { // Default to user dashboard (access_level 1)
        dashboardPath = AppConfig.USER_DASHBOARD;
    }

    console.log(`➡️ Verifying dashboard accessibility for access_level ${userAccessLevel} at ${dashboardPath}...`);
    try {
        const check = await fetch(dashboardPath, {
            method: 'HEAD', // Use HEAD request to check accessibility without downloading content
            credentials: 'include'
        });

        if (!check.ok) {
            throw new Error(`Dashboard ${dashboardPath} unavailable or access denied`);
        }

        console.log('✅ Dashboard verified - redirecting...');
        window.location.replace(dashboardPath);

    } catch (err) {
        console.error('❌ Dashboard redirect failed:', err);
        showStatus(`Dashboard unavailable for your access level. Please contact support.`, true);
        setLoadingState(false);
    }
}

// Form Submission Handler
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('📝 Form submission started');
    setLoadingState(true);

    const email = form.email.value.trim();
    const password = form.password.value;

    if (!email || !password) {
        console.log('❌ Validation failed - missing fields');
        showStatus('Please enter both email and password.', true);
        setLoadingState(false);
        return;
    }

    showStatus('Authenticating...');
    console.log('🔐 Attempting authentication...');

    try {
        const loginStart = performance.now();
        const loginRes = await fetch(PATHS.LOGIN_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });
        const loginDuration = (performance.now() - loginStart).toFixed(2);

        console.log(`Login response: ${loginRes.status} (${loginDuration}ms)`);

        if (!loginRes.ok) {
            const errorData = await loginRes.json();
            console.error('❌ Login failed:', errorData);
            throw new Error(errorData.message || 'Authentication failed');
        }

        const loginData = await loginRes.json();
        console.log('✅ Auth successful:', loginData);

        // Get the access_level from the login response
        const userAccessLevel = loginData.data?.user?.access_level;
        if (userAccessLevel === undefined || userAccessLevel === null) {
            console.error('❌ Login response missing user access_level.');
            throw new Error('Login successful but access level not found.');
        }

        console.log('🔍 Verifying session and access level...');
        const { isValid, accessLevel: verifiedAccessLevel } = await verifySessionAndGetAccessLevel();

        if (!isValid || verifiedAccessLevel === null || verifiedAccessLevel !== userAccessLevel) {
            // This check ensures consistency between login response and session validation
            console.error('❌ Session validation failed or access level mismatch.');
            throw new Error('Session validation failed after login. Please try again.');
        }

        showStatus('Login successful! Redirecting...');
        console.log('➡️ Preparing dashboard redirect based on access level');
        setTimeout(() => redirectToDashboard(userAccessLevel), 1500);

    } catch (err) {
        console.error('❌ Authentication error:', {
            message: err.message,
            stack: err.stack
        });
        showStatus(err.message || 'Authentication failed. Please try again.', true);
        setLoadingState(false);
    }
});

// Auto-focus email field on load
form.email.focus();
console.log('📄 Login form ready');
