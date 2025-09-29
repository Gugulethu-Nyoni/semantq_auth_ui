import AppConfig from './config.js';
import { $state, $derived, $effect } from '@semantq/state';

/* ==================== */
/* CORE STATE      */
/* ==================== */
const _auth = $state({
  isAuthenticated: false,
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
/* PUBLIC API      */
/* ==================== */
const auth = {
  // Reactive state
  state: {
    isAuthenticated: $derived(() => _auth.value.isAuthenticated),
    rawUser: $derived(() => _auth.value.user),
    accessLevel: $derived(() => _auth.value.accessLevel),
    userId: $derived(() => _auth.value.user?.id || null),
    userName: $derived(() => _auth.value.user?.name || 'Guest')
  },

  // Methods
  async login(email, password) {
    console.log('[AUTH] Attempting login for:', email);
    const res = await fetch(`${AppConfig.BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      const message = await res.text();
      console.warn('[AUTH] Login failed:', message);
      return { success: false, message };
    }

    const result = await res.json();
    console.log('[AUTH] User data from server:', result);

    const user = result?.data?.user;

    if (!user || typeof user.access_level !== 'number') {
      console.error('[AUTH] Invalid user data returned:', user);
      return { success: false, message: 'Invalid user data returned from server.' };
    }

    _auth.value = {
      isAuthenticated: true,
      user,
      accessLevel: user.access_level,
      lastValidated: Date.now()
    };

    console.log('[AUTH] State updated after login:', _auth.value);
    console.log('[AUTH] Session storage snapshot:', sessionStorage.getItem('auth-session'));

    return { success: true };
  },

  async validate() {
    console.log('[AUTH] Validating session...');
    try {
      const res = await fetch(`${AppConfig.BASE_URL}/validate-session`, {
        method: 'GET',
        credentials: 'include'
      });

      const result = res.ok ? await res.json() : { success: false };
      const isValid = result.success === true;

      if (!isValid) {
        _auth.value = {
          isAuthenticated: false,
          user: null,
          accessLevel: null,
          lastValidated: null
        };
        console.log('[AUTH] Session invalid. User logged out.');

        // Redirect to login page
        window.location.href = '/auth/login';

        return false;
      } else {
        _auth.value = {
          ..._auth.value,
          isAuthenticated: true,
          lastValidated: Date.now()
        };
        console.log('[AUTH] Session valid, state updated:', _auth.value);
      }

      console.log('[AUTH] Session storage snapshot after validate:', sessionStorage.getItem('auth-session'));
      return isValid;

    } catch (error) {
      console.error('[AUTH] Session validation error:', error);
      _auth.value = {
        isAuthenticated: false,
        user: null,
        accessLevel: null,
        lastValidated: null
      };

      // Redirect to login page on error too
      window.location.href = '/auth/login';

      return false;
    }
  },

  async logout() {
    console.log('[AUTH] Logging out...');
    await fetch(`${AppConfig.BASE_URL}/logout`, {
      method: 'POST',
      credentials: 'include'
    });

    // Reset state
    _auth.value = {
      isAuthenticated: false,
      user: null,
      accessLevel: null,
      lastValidated: null
    };

    console.log('[AUTH] State reset after logout:', _auth.value);
    console.log('[AUTH] Session storage snapshot after logout:', sessionStorage.getItem('auth-session'));

    // Redirect after logout
    window.location.href = '/auth/login';
  },

  getDashboardPath() {
    const accessLevel = _auth.value.accessLevel;
    // Use the new mapping object, with a fallback for unconfigured levels
    return AppConfig.DASHBOARD_PATHS[accessLevel] || AppConfig.DASHBOARD_PATHS[1];
  }
};

/* ==================== */
/* USER OBJECT WITH PROPER PROPERTIES */
/* ==================== */
export const user = {
  get id() {
    return auth.state.userId.value;
  },
  get name() {
    return auth.state.userName.value;
  },
  get email() {
    return auth.state.rawUser.value?.email ?? '';
  },
  get accessLevel() {
    return auth.state.accessLevel.value;
  },
  // Backward compatibility - access_level property
  get access_level() {
    return auth.state.accessLevel.value;
  },
  // Get the complete raw user object
  get raw() {
    return auth.state.rawUser.value;
  },
  // Add a method to check if user exists
  get exists() {
    return !!auth.state.rawUser.value;
  }
};

console.log("User Object Properties:", {
  id: user.id,
  name: user.name,
  email: user.email,
  accessLevel: user.accessLevel,
  access_level: user.access_level
});

/* ==================== */
/* CLEAN NAMED EXPORTS */
/* ==================== */
export const isAuthenticated = auth.state.isAuthenticated;
export const accessLevel = auth.state.accessLevel;
export const login = auth.login;
export const getDashboardPath = auth.getDashboardPath;
export const logout = auth.logout;
export const validate = auth.validate;

export const redirectToDashboard = () => {
  window.location.href = auth.getDashboardPath();
};

/* ==================== */
/* AUTO-SETUP & EFFECTS */
/* ==================== */
$effect(() => {
  if (auth.state.isAuthenticated.value) {
    console.log('[AUTH] Starting session heartbeat validation every 5 minutes.');
    const interval = setInterval(auth.validate, 300000);
    return () => {
      console.log('[AUTH] Clearing session heartbeat interval.');
      clearInterval(interval);
    };
  }
});

$effect(() => {
  if (auth.state.isAuthenticated.value) {
    const expiryMs = 3600000; // 1 hour
    const remainingMs = expiryMs - (Date.now() - (_auth.value.lastValidated || Date.now()));

    console.log('[AUTH] Setting auto-redirect timer for session expiry:', remainingMs, 'ms');
    const timer = setTimeout(() => {
      console.log('[AUTH] Session expired - logging out and redirecting to login page.');
      _auth.value.isAuthenticated = false;
      window.location.href = '/auth/login';
    }, remainingMs);

    return () => {
      console.log('[AUTH] Clearing session expiry timer.');
      clearTimeout(timer);
    };
  }
});

// Initial validation on page load except on login page
if (!window.location.pathname.includes('login')) {
  console.log('[AUTH] Performing initial session validation...');
  auth.validate();
}

// Logout button handler
window.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      auth.logout();
    });
  }
});