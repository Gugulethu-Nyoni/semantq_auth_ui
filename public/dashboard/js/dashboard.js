import AppConfig from '../../auth/js/config.js';

console.log("📊 Dashboard script loaded");

const PATHS = {
    VALIDATE_SESSION: `${AppConfig.BASE_URL}/validate-session`,
    PROFILE: `${AppConfig.BASE_URL}/profile`,
    LOGOUT: `${AppConfig.BASE_URL}/logout`,
    LOGIN: 'login' // Relative path to login page
};

// Session Validation
async function verifySession() {
    console.log('🔒 Validating session...');
    try {
        const res = await fetch(PATHS.VALIDATE_SESSION, {
            method: 'GET',
            credentials: 'include'
        });

        if (!res.ok) {
            console.warn('Session validation failed with non-OK response');
            return false;
        }

        const data = await res.json();
        console.log('Session validation response:', data);
        return data.success && data.data?.valid === true;

    } catch (err) {
        console.error('Session validation error:', err);
        return false;
    }
}

// Fetch user profile
async function fetchUserProfile() {
    console.log('Fetching user profile...');
    try {
        const response = await fetch(PATHS.PROFILE, {
            method: 'GET',
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.data?.profile) {
                console.log('User profile fetched:', data.data.profile);
                displayUserProfile(data.data.profile);
            } else {
                console.error('Invalid profile response', data);
                window.location.href = PATHS.LOGIN;
            }
        } else {
            const errorData = await response.json();
            console.error('Profile fetch failed:', errorData.message || 'Unknown error');
            if (response.status === 401 || response.status === 403) {
                window.location.href = PATHS.LOGIN;
            }
        }
    } catch (error) {
        console.error('Network error fetching profile:', error);
        window.location.href = PATHS.LOGIN;
    }
}

// Display profile info
function displayUserProfile(profile) {
    const dashboardData = document.getElementById('dashboard-data');
    if (dashboardData) {
        dashboardData.innerHTML = `
            <p><strong>Hi</strong> ${profile.name || 'Not set'}</p>
        `;
    }
}

// Logout function
async function logout() {
    console.log('Logging out...');
    try {
        const response = await fetch(PATHS.LOGOUT, {
            method: 'POST',
            credentials: 'include'
        });

        if (response.ok) {
            window.location.href = PATHS.LOGIN;
        } else {
            const errorData = await response.json();
            console.error('Logout failed:', errorData.message || 'Unknown error');
        }
    } catch (error) {
        console.error('Logout network error:', error);
    }
}

// Page load sequence
async function initDashboard() {
    const sessionIsValid = await verifySession();
    if (!sessionIsValid) {
        window.location.href = PATHS.LOGIN;
        return;
    }

    await fetchUserProfile();
}

// Run on page load
initDashboard();

// Expose logout globally
window.logout = logout;