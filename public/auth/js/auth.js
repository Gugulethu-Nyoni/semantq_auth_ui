import AppConfig from './config.js';

const PATHS = {
    VALIDATE_SESSION: `${AppConfig.BASE_URL}/validate-session`,
    LOGOUT: `${AppConfig.BASE_URL}/logout`,
    LOGIN: '../login' // relative path to login page
};

// Validate session cookie on the backend
export async function verifySession() {
    console.log('Validating session...');
    try {
        const res = await fetch(PATHS.VALIDATE_SESSION, {
            method: 'GET',
            credentials: 'include'
        });

        if (!res.ok) {
            console.warn('Session validation failed (non-OK response)');
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

// Redirect to login page if session is invalid
export async function securePage() {
    const sessionIsValid = await verifySession();
    if (!sessionIsValid) {
        window.location.href = PATHS.LOGIN;
    }
}

// Logout user and redirect to login
export async function logout() {
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

// (Optional) Expose logout globally for button clicks etc.
window.logout = logout;

// Self-invoking async function to auto-secure the page on import
(async () => {
    await securePage();
})();
