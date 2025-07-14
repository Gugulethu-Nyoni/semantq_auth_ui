// auth.js
import AppConfig from './config.js';

const PATHS = {
    VALIDATE_SESSION: `${AppConfig.BASE_URL}/validate-session`,
    LOGOUT: `${AppConfig.BASE_URL}/logout`,
    LOGIN: '../login' // relative path to login page
};

/**
 * Validates the session cookie on the backend and retrieves user's access level.
 * @returns {Promise<{isValid: boolean, accessLevel: number|null}>} An object indicating session validity and user's access level.
 */
export async function verifySession() {
    console.log('Validating session...');
    try {
        const res = await fetch(PATHS.VALIDATE_SESSION, {
            method: 'GET',
            credentials: 'include'
        });

        if (!res.ok) {
            console.warn('Session validation failed (non-OK response)');
            return { isValid: false, accessLevel: null };
        }

        const data = await res.json();
        console.log('Session validation response:', data);

        // Return both validity and access_level
        return {
            isValid: data.success && data.data?.valid === true,
            accessLevel: data.data?.access_level || null // Default to null if not present
        };

    } catch (err) {
        console.error('Session validation error:', err);
        return { isValid: false, accessLevel: null };
    }
}

/**
 * Secures the current page by checking session validity and user's access level.
 * Redirects to login if session is invalid or access level is insufficient.
 * @param {number} [requiredAccessLevel=1] The minimum access level required for the page. Defaults to 1 (basic user).
 */
export async function securePage(requiredAccessLevel = 1) {
    const { isValid, accessLevel } = await verifySession();

    if (!isValid) {
        console.warn('Session invalid, redirecting to login.');
        window.location.href = PATHS.LOGIN;
        return; // Stop further execution
    }

    // Check if the user's access level meets the required level
    if (accessLevel === null || accessLevel < requiredAccessLevel) {
        console.warn(`Access denied: User access_level (${accessLevel}) is less than required (${requiredAccessLevel}). Redirecting to login.`);
        window.location.href = PATHS.LOGIN; // Or redirect to an "access denied" page
        return; // Stop further execution
    }

    console.log(`Page secured: User has access_level ${accessLevel}, required: ${requiredAccessLevel}.`);
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
// Developers can now call securePage(2) for a page requiring access_level 2.
// If no argument is passed, it defaults to 1.
(async () => {
    // Example: securePage(1) for a basic user page
    // securePage(2) for an editor page
    // securePage(3) for an admin page
    await securePage(); // This will default to requiredAccessLevel = 1
})();
