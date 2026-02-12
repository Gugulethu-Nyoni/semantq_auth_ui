import AppConfig from './config.js';
import { $state, $derived, $effect } from '@semantq/state';

/* ==================== */
/* CORE STATE           */
/* ==================== */
/* ==================== */
/* CORE STATE           */
/* ==================== */
const _auth = $state({
    isAuthenticated: false,
    isValidating: false,   
    isInitialized: false,  
    user: null,            // This will now contain: { id, email, username, name, access_level ... }
    accessLevel: null,
    lastValidated: null
}, {
    key: 'auth-session',
    storage: sessionStorage,
    debounce: 100
});

console.log('[AUTH] Initial _auth state:', _auth.value);

/* ==================== */
/* ROUTER AUTHORIZATION LOGIC */
/* ==================== */

function enforceAuthorization() {
    // If we are still validating or haven't checked yet, don't enforce anything
    if (_auth.value.isValidating || !_auth.value.isInitialized) return;

    const isAuthenticated = _auth.value.isAuthenticated;
    const accessLevel = _auth.value.accessLevel;
    
    let currentPath = window.location.pathname.replace(/\/+$/, '');
    if (currentPath === "") currentPath = "/";

    const PUBLIC_ROUTES = ['/auth/login', '/auth/signup', '/'];
    const isPublicRoute = PUBLIC_ROUTES.some(route => currentPath === route);

    // 1. Authentication Check
    if (!isAuthenticated) {
        if (!isPublicRoute) {
            console.warn('[AUTH GUARD] Unauthenticated access. Redirecting to login.');
            window.location.href = '/auth/login';
        }
        return;
    }

    // 2. Redirect Authenticated Users from Public Routes
    if (isPublicRoute) {
        console.log('[AUTH GUARD] Authenticated user on public route. Redirecting to dashboard.');
        redirectToDashboard();
        return;
    }

    // 3. Authorization Check (Level Specific)
    let isStrictMatchViolation = false;
    let targetLevel = null;

    for (const level in AppConfig.DASHBOARD_PATHS) {
        const path = AppConfig.DASHBOARD_PATHS[level];
        if (currentPath === path) {
            targetLevel = parseInt(level, 10);
            if (accessLevel !== targetLevel) {
                isStrictMatchViolation = true;
                break;
            }
        }
    }

    if (isStrictMatchViolation) {
        console.warn(`[AUTH GUARD] Access violation. Level ${accessLevel} restricted from ${currentPath}.`);
        redirectToDashboard();
        return;
    }
}

/* ==================== */
/* PUBLIC API           */
/* ==================== */
const auth = {
    state: {
        isAuthenticated: $derived(() => _auth.value.isAuthenticated),
        isValidating: $derived(() => _auth.value.isValidating),
        isInitialized: $derived(() => _auth.value.isInitialized),
        rawUser: $derived(() => _auth.value.user),
        accessLevel: $derived(() => _auth.value.accessLevel),
        userId: $derived(() => _auth.value.user?.id || null),
        userName: $derived(() => _auth.value.user?.name || 'Guest')
    },

    async login(identifier, password) { // Changed 'email' to 'identifier'
        console.log('[AUTH] Attempting login for:', identifier);
        _auth.value.isValidating = true;

        try {
            const res = await fetch(`${AppConfig.BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                // Using 'identifier' ensures it works with both email and username
                body: JSON.stringify({ identifier, password }) 
            });

            if (!res.ok) {
                const message = await res.text();
                return { success: false, message };
            }

            const result = await res.json();
            const user = result?.data?.user;

            _auth.value = {
                ..._auth.value,
                isAuthenticated: true,
                isInitialized: true,
                isValidating: false,
                user,
                accessLevel: user.access_level,
                lastValidated: Date.now()
            };

            return { success: true };
        } catch (err) {
            _auth.value.isValidating = false;
            return { success: false, message: err.message };
        }
    },

   async validate() {
    console.log('[AUTH] Validating session...');
    _auth.value.isValidating = true;

    try {
        const res = await fetch(`${AppConfig.BASE_URL}/validate-session`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!res.ok) {
            this.clearState();
            return false;
        }

        const result = await res.json();
        
        if (!result.success) {
            this.clearState();
            return false;
        }

        _auth.value = {
            ..._auth.value,
            isAuthenticated: true,
            isInitialized: true,
            isValidating: false,
            user: {
                id: result.data.userId,
                email: result.data.email,
                username: result.data.username, // NEW: Capture username
                // Improved logic: Use username, then email prefix, then 'User'
                name: result.data.username || result.data.email?.split('@')[0] || 'User',
                access_level: result.data.access_level
            },
            accessLevel: result.data.access_level,
            lastValidated: Date.now()
        };
        
        return true;
    } catch (error) {
        console.error('[AUTH] Validation error:', error);
        this.clearState();
        return false;
    }
},

    async logout() {
        console.log('[AUTH] Logging out...');
        await fetch(`${AppConfig.BASE_URL}/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        this.clearState();
        window.location.href = '/auth/login';
    },

    clearState() {
        _auth.value = {
            isAuthenticated: false,
            isInitialized: true,
            isValidating: false,
            user: null,
            accessLevel: null,
            lastValidated: null
        };
    },

    getDashboardPath() {
        const accessLevel = _auth.value.accessLevel;
        return AppConfig.DASHBOARD_PATHS[accessLevel] || AppConfig.DASHBOARD_PATHS[1];
    }
};

/* ==================== */
/* USER OBJECT          */
/* ==================== */
/* ==================== */
/* USER OBJECT          */
/* ==================== */
export const user = {
    // Returns the unique database ID
    get id() { return auth.state.userId.value; },

    // Returns the primary display name (Prioritizes Username > Name > Email Prefix)
    get name() { return auth.state.userName.value; },

    // NEW: Returns the explicit username (or null if they didn't set one)
    get username() { return auth.state.username.value; },

    // Returns the user's email address
    get email() { return auth.state.rawUser.value?.email ?? ''; },

    // Returns the numeric access level (1, 2, etc.)
    get accessLevel() { return auth.state.accessLevel.value; },

    // Returns the full un-proxied user object from the state
    get raw() { return auth.state.rawUser.value; },

    // Boolean check to see if a user session is active
    get exists() { return !!auth.state.rawUser.value; }
};

/* ==================== */
/* CLEAN NAMED EXPORTS */
/* ==================== */
export const isAuthenticated = auth.state.isAuthenticated;
export const isValidating = auth.state.isValidating;
export const isInitialized = auth.state.isInitialized;
export const login = auth.login;
export const logout = auth.logout;
export const validate = auth.validate;
export const redirectToDashboard = () => { window.location.href = auth.getDashboardPath(); };

// ADD THESE TO FIX THE BUILD ERRORS:
export const accessLevel = auth.state.accessLevel; // Fixes "accessLevel" import errors
export const getDashboardPath = auth.getDashboardPath; // Fixes "getDashboardPath" import errors

/* ==================== */
/* AUTO-SETUP & EFFECTS */
/* ==================== */

// Only run auth checks when NOT validating and after initialization
$effect(() => {
    if (!_auth.value.isValidating && _auth.value.isInitialized) {
        enforceAuthorization();
    }
}, [auth.state.isAuthenticated, auth.state.isValidating, auth.state.isInitialized]);

// Heartbeat
$effect(() => {
    if (auth.state.isAuthenticated.value) {
        const interval = setInterval(auth.validate, 300000);
        return () => clearInterval(interval);
    }
});

// Initial validation
if (!window.location.pathname.includes('login')) {
    auth.validate();
}

window.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            auth.logout();
        });
    }
});