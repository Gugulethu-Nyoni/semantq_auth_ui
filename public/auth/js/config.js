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
const AppConfig = {
  ENV: (typeof window !== 'undefined' && window.location.hostname.includes('localhost'))
    ? 'development'
    : 'production',

  BASE_URLS: {
    development: 'http://localhost:3003/@semantq/auth',
    production: 'https://example.com'
  },

  // Removed the generic DASHBOARD as it's now specific to access levels
  // DASHBOARD: 'dashboard', 

  // NEW: Dashboard paths based on access levels
  USER_DASHBOARD: '/auth/dashboard',
  RESEARCHER_DASHBOARD: '/auth/res/dashboard',
  SUPER_ADMIN_DASHBOARD: '/auth/dashboard/superadmin',
  // You can add more specific dashboards here if needed, e.g., SUPER_ADMIN_DASHBOARD: '/dashboard/superadmin'
  
  // here you control what access level you want to allow from front end
  // end <a href="/auth/signup?ref=2"> Sign Up </a> 
  // so the default is 1 - end user access level so no need to set that up in URL params
 ALLOWED_REF_LEVELS: ['1', '2'],
  /**
   * Returns the base API URL for the current environment
   */
  get BASE_URL() {
    return this.BASE_URLS[this.ENV] || this.BASE_URLS.development;
  }
};

export default AppConfig;
