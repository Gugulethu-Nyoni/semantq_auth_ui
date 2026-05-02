/**
 * If you are building a SaaS application use this auth.js - just delete the other 
 * auth.js and rename this file to auth.js
 * 
 * 
 * config.js
 * Application runtime configuration object.
 */

// http://localhost:3003/@semantq/auth

const AppConfig = {
    ENV: (typeof window !== 'undefined' && window.location.hostname.includes('localhost'))
      ? 'development'
      : 'production',
    BASE_URLS: {
      development: 'http://localhost:3003/@semantq/auth',
      production: 'https://api.eventique.co.za/@semantq/auth'
    },

    // BOUNDARY DEFINITION
    // Only levels that require a separate physical directory are defined here.
    STRICT_DASHBOARDS: {
        770: '/system-admin',
        60: '/org-admin'
    },

    // AGNOSTIC FALLBACK
    // Every other access_level (1, 15, 16, 18, 19, etc.) uses this path.
    DEFAULT_DASHBOARD: '/auth/dashboard',

    /**
     * Finds the base path for a given level.
     * Logic: If level is in STRICT_DASHBOARDS, return that path. Otherwise, return default.
     */
    getDashboardPath(level) {
        return this.STRICT_DASHBOARDS[level] || this.DEFAULT_DASHBOARD;
    },

    /**
     * DYNAMIC AUTHORIZATION MAP
     * Derived from STRICT_DASHBOARDS to ensure high-security paths are guarded.
     * Sorting ensures that the most specific/highest level paths are checked first.
     */
    get AUTHORIZATION_MAP() {
        const rules = Object.entries(this.STRICT_DASHBOARDS).map(([level, path]) => ({
            pathPrefix: path,
            requiredLevel: parseInt(level, 10)
        }));

        // Add the default dashboard as the baseline rule (Level 1)
        rules.push({ pathPrefix: this.DEFAULT_DASHBOARD, requiredLevel: 1 });

        // Sort descending by level (highest level/most restrictive first)
        return rules.sort((a, b) => b.requiredLevel - a.requiredLevel);
    },

    ALLOWED_REF_LEVELS: ['1'],
    
    get BASE_URL() {
      return this.BASE_URLS[this.ENV] || this.BASE_URLS.development;
    }
};

export default AppConfig;