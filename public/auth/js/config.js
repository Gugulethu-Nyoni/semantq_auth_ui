/**
 * config.js
 * * Application runtime configuration object.
 * * ENV can either be set dynamically based on the window location
 * or manually for testing/dev purposes by assigning a fixed value:
 * * Example:
 * ENV: 'development'
 * ENV: 'production'
 * * BASE_URLS can also be customized with different backend endpoints
 * as needed (e.g., using 127.0.0.1 instead of localhost, or pointing
 * to a staging server):
 * * Example:
 * BASE_URLS: {
 * development: 'http://localhost:3003',
 * production: 'https://api.example.com'
 * }
 */
/**
 * config.js
 * Application runtime configuration object.
 */
const AppConfig = {
    ENV: (typeof window !== 'undefined' && window.location.hostname.includes('localhost'))
      ? 'development'
      : 'production',

    BASE_URLS: {
      development: 'http://localhost:3003/@semantq/auth',
      production: 'https://example.com'
    },

    // 🔑 Core definition: Maps access_level (key) to its default dashboard path (value).
    DASHBOARD_PATHS: {
      1: '/auth/dashboard',
      2: '/auth/campus/admin',
      3: '/auth/dashboard/superadmin'
    },

    // 🔒 DYNAMICALLY GENERATED AUTHORIZATION MAP
    // This map is derived from DASHBOARD_PATHS to ensure the logic is never hardcoded.
    // The higher the level, the more specific (and restrictive) the path should be.
    // We sort it in descending order of level (3, 2, 1) for path-matching priority.
    get AUTHORIZATION_MAP() {
        const paths = this.DASHBOARD_PATHS;
        const levels = Object.keys(paths)
            .map(level => parseInt(level, 10))
            .filter(level => level > 0); // Ignore level 0 if present

        // Sort descending (3, 2, 1) so stricter checks run first in auth.js
        levels.sort((a, b) => b - a); 

        return levels.map(level => ({
            pathPrefix: paths[level],
            requiredLevel: level
        }));
        
        /* The resulting array will look like:
           [
             { pathPrefix: '/auth/dashboard/superadmin', requiredLevel: 3 },
             { pathPrefix: '/auth/campus/admin', requiredLevel: 2 },
             { pathPrefix: '/auth/dashboard', requiredLevel: 1 },
           ]
        */
    },

    ALLOWED_REF_LEVELS: ['1'],
    
    get BASE_URL() {
      return this.BASE_URLS[this.ENV] || this.BASE_URLS.development;
    }
};

export default AppConfig;