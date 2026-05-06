import AppConfig from './config.js';
import { $state, $derived, $effect } from '@semantq/state';

/* ==================== */
/* CORE STATE           */
/* ==================== */
const _auth = $state({
    isAuthenticated: false,
    isValidating: false,   
    isInitialized: false,  
    user: null,
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
    if (_auth.value.isValidating || !_auth.value.isInitialized) return;

    const isAuthenticated = _auth.value.isAuthenticated;
    const accessLevel = _auth.value.accessLevel;
    
    let currentPath = window.location.pathname.replace(/\/+$/, '');
    if (currentPath === "") currentPath = "/";

    const PUBLIC_ROUTES = ['/auth/login', '/auth/signup', '/'];
    const isPublicRoute = PUBLIC_ROUTES.some(route => currentPath === route);

    // 1. Block unauthenticated users from protected routes
    if (!isAuthenticated) {
        if (!isPublicRoute) {
            console.warn('[AUTH GUARD] Unauthenticated access. Redirecting to login.');
            window.location.href = '/auth/login';
        }
        return;
    }

    // 2. Redirect authenticated users away from public routes
    if (isPublicRoute) {
        console.log('[AUTH GUARD] Authenticated user on public route. Redirecting to dashboard.');
        redirectToDashboard();
        return;
    }

    // 3. UNIVERSAL: User can only access their assigned dashboard or sub-paths
    const userDashboard = AppConfig.getDashboardPath(accessLevel);
    
    // Check if current path is the user's dashboard or a sub-path of it
    const isAuthorizedPath = currentPath === userDashboard || currentPath.startsWith(userDashboard + '/');
    
    if (!isAuthorizedPath) {
        console.warn(`[AUTH GUARD] Level ${accessLevel} blocked from ${currentPath}. Only ${userDashboard}/* allowed.`);
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
        userName: $derived(() => _auth.value.user?.name || 'Guest'),
        username: $derived(() => _auth.value.user?.username || null),
        organizationId: $derived(() => _auth.value.user?.organizationId || null)
    },

    async login(identifier, password) {
        console.log('[AUTH] Attempting login for:', identifier);
        _auth.value.isValidating = true;

        try {
            const res = await fetch(`${AppConfig.BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ identifier, password }) 
            });

            const data = await res.json();

            if (!res.ok) {
                _auth.value.isValidating = false;
                const errorMessage = data.error?.message || data.message || 'Login failed';
                return { success: false, message: errorMessage };
            }

            const user = data?.data?.user;

            _auth.value = {
                ..._auth.value,
                isAuthenticated: true,
                isInitialized: true,
                isValidating: false,
                user,
                accessLevel: user.access_level,
                lastValidated: Date.now()
            };

            return { success: true, message: 'Login successful' };
        } catch (err) {
            _auth.value.isValidating = false;
            return { success: false, message: err.message || 'Login failed' };
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
                username: result.data.username,
                name: result.data.name || result.data.username || result.data.email?.split('@')[0] || 'User',
                surname: result.data.surname || '',  // NEW
                access_level: result.data.access_level,
                organizationId: result.data.organizationId
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
        return AppConfig.getDashboardPath(accessLevel);
    }
};

/* ==================== */
/* USER OBJECT          */
/* ==================== */
export const user = {
    get id() { return auth.state.userId.value; },
    get name() { return auth.state.userName.value; },
    get surname() { return auth.state.rawUser.value?.surname ?? '' },  // NEW
    get fullName() {  // NEW - convenience getter
        const name = auth.state.userName.value || '';
        const surname = auth.state.rawUser.value?.surname || '';
        return `${name} ${surname}`.trim();
    },
    get username() { return auth.state.username.value; },
    get email() { return auth.state.rawUser.value?.email ?? ''; },
    get accessLevel() { return auth.state.accessLevel.value; },
    get organizationId() { return auth.state.organizationId.value; },
    get raw() { return auth.state.rawUser.value; },
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
export const accessLevel = auth.state.accessLevel;
export const getDashboardPath = auth.getDashboardPath;
export const organizationId = auth.state.organizationId;

/* ==================== */
/* AUTO-SETUP & EFFECTS */
/* ==================== */

$effect(() => {
    if (!_auth.value.isValidating && _auth.value.isInitialized) {
        enforceAuthorization();
    }
}, [auth.state.isAuthenticated, auth.state.isValidating, auth.state.isInitialized]);

$effect(() => {
    if (auth.state.isAuthenticated.value) {
        const interval = setInterval(auth.validate, 300000);
        return () => clearInterval(interval);
    }
});

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