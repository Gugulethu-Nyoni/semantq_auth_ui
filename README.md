# Installing Semantq Auth UI for Your Semantq Full Stack (CRUD) Projects

**`@semantq/auth`** is a scoped, full-stack authentication package supporting MySQL and Supabase adapters. It includes functionality for:

- Email-based account creation
- Email confirmation
- Login and logout
- Password recovery

**`semantq_auth_ui`** is an optional plug-and-play user interface layer built for Semantq-based full-stack projects. It works **on top of `@semantq/auth`** and simplifies the process of getting your frontend authentication UI up and running. This is a guide for installing the Semantq Auth UI to your Semantq project.

## Prerequisites

Before installing the **Auth UI**, make sure you've installed the Semantq server and core auth module.

### 1. Install the Semantq Server

```bash
npm install:server
```

### 2. Install the Core Auth Package

You install the @semantq/auth as a semantqQL node package not a project root module:

```bash
cd semantqQL
```

```bash
npm install @semantq/auth
```

## Install the Auth UI

Use the Semantq CLI to add the Auth UI to your project:

```bash
semantq add:auth-ui
```

### What This Command Does:

```markdown
- Copies all `auth` and `dashboard` JS/CSS files into your project's `public/` directory:
```

```bash
public/
├── auth/
│   ├── js/
│   └── css/
│
└── dashboard/
├── js/
└── css/
```

- 🛣️ Clones all route files into your project's `src/routes/` directory:

- 📁 Clones component files into your project's `src/components/` directory:

```bash
src/components/
├── auth/
│   ├── Confirm.smq
│   ├── ForgotPassword.smq
│   ├── Login.smq
│   ├── ResetPassword.smq
│   └── SignUp.smq
│
└── dashboard/
    └── ThemeToggle.smq
```

With that set up, you **don't have to write any CSS or JavaScript** to get a working authentication UI.

## Auth UI Routes

Semantq uses a file-based routing system, so these routes are automatically available and picked at build - meaning you do not need to create the routes you just need to access them and use them in your app:

* `/auth/signup`
* `/auth/confirm`
* `/auth/login`
* `/auth/forgot`
* `/auth/reset`
* `/auth/dashboard`

You can link to them directly in your HTML like this:

```html
<a href="auth/signup">Create Account</a>
<a href="auth/login">Login</a>
```

## UI Configuration

After installation, make sure the config file at:

```
/public/auth/js/config.js
```

...has the correct settings for your backend.

### Basic Configuration: `config.js`

```js
const AppConfig = {
  ENV: (typeof window !== 'undefined' && window.location.hostname.includes('localhost'))
    ? 'development'
    : 'production',

  BASE_URLS: {
    development: 'http://localhost:3003/@semantq/auth',
    production: 'https://example.com'
  },

  DASHBOARD: 'dashboard',

  get BASE_URL() {
    return this.BASE_URLS[this.ENV] || this.BASE_URLS.development;
  }
};

export default AppConfig;
```

#### Notes:

* Update `BASE_URLS.development` to match your backend server's port.
* By default, all `@semantq/auth` routes are accessible under:
  `http://your-server/@semantq/auth` - so all you need to update is this part `http://your-server/`
* You can change the `DASHBOARD` route if needed but it works perfectly in the default setting.

## 🚀 SaaS Application Configuration

If you are building a **multi-tenant SaaS application** with role-based access levels, use this enhanced `config.js`. Just delete the other `auth.js` and rename this file to `auth.js`:

```js
/**
 * config.js
 * Application runtime configuration object for SaaS applications.
 * Supports multi-level dashboard routing and strict authorization boundaries.
 */

// http://localhost:3003/@semantq/auth

const AppConfig = {
    ENV: (typeof window !== 'undefined' && window.location.hostname.includes('localhost'))
      ? 'development'
      : 'production',
      
    BASE_URLS: {
      development: 'http://localhost:3003/@semantq/auth',
      production: 'https://api.your-saas-app.com/@semantq/auth'
    },

    // BOUNDARY DEFINITION
    // Only levels that require a separate physical directory are defined here.
    STRICT_DASHBOARDS: {
        770: '/system-admin',   // Highest privilege level
        60: '/org-admin'        // Organization admin level
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
```

### SaaS Configuration Explained

| Property | Purpose |
|----------|---------|
| `STRICT_DASHBOARDS` | Maps access levels to dedicated dashboard routes (e.g., level 770 users go to `/system-admin`) |
| `DEFAULT_DASHBOARD` | Fallback dashboard for all other access levels |
| `getDashboardPath(level)` | Dynamically returns the correct dashboard path based on user's access level |
| `AUTHORIZATION_MAP` | Auto-generated security rules that enforce route access based on user levels |
| `ALLOWED_REF_LEVELS` | Whitelist of access levels permitted for certain operations |

### Understanding Access Levels & Directory Structure

> **⚠️ Important Default Settings Note:**

The `STRICT_DASHBOARDS` configuration above shows **default settings** that ship with the module:

```js
STRICT_DASHBOARDS: {
    770: '/system-admin',   // Highest privilege level
    60: '/org-admin'        // Organization admin level
}
```

**You are free to change these access levels** to match your application's permission model. However, you must ensure that:

1. **Access levels match your database** - The numeric access level values (770, 60, etc.) must correspond exactly to the `access_level` values assigned to users in your database when accounts are created.

2. **Dashboard directories exist in `src/`** - The module ships with `system-admin` and `org-admin` directories pre-created in your `src/` folder. If you change the directory names in `STRICT_DASHBOARDS`, you must ensure the corresponding directories exist in your `src/` path:

```
src/
├── system-admin/     ← Must match '/system-admin' in STRICT_DASHBOARDS
├── org-admin/        ← Must match '/org-admin' in STRICT_DASHBOARDS
├── auth/
└── dashboard/
```

**Example customization:**

```js
// If your app uses different access levels:
STRICT_DASHBOARDS: {
    999: '/super-admin',    // Changed from 770 to 999
    100: '/team-lead',      // Changed from 60 to 100
    50: '/manager'          // Added new level
}
```

Then ensure these directories exist in your `src/` folder:
- `src/super-admin/`
- `src/team-lead/`
- `src/manager/`

### Using SaaS Access Levels

This configuration enables you to:

- **Segment users** by access level (770 = system admin, 60 = org admin, 1+ = regular users)
- **Serve different dashboards** automatically based on user privileges
- **Enforce authorization** at the route level without hardcoding paths
- **Scale permissions** as your SaaS product grows

Example usage in your app:

```js
// After login, redirect based on user's access level
const userAccessLevel = user.access_level;
const dashboardPath = AppConfig.getDashboardPath(userAccessLevel);
window.location.href = dashboardPath;
```

## Developer Notes

This UI is intended to save you time and fast-track your CRUD app setup. However, **you are free to develop your own auth UI** or use your own backend auth strategy if needed.

## Further Guides

* Semantq Server Installation & Setup
  [https://github.com/Gugulethu-Nyoni/semantqQL](https://github.com/Gugulethu-Nyoni/semantqQL)

* Semantq Auth Package Installation
  GitHub: [https://github.com/Gugulethu-Nyoni/semantq_auth](https://github.com/Gugulethu-Nyoni/semantq_auth)
  NPM: [https://www.npmjs.com/package/@semantq/auth](https://www.npmjs.com/package/@semantq/auth)

## Maintainer

**Gugulethu Nyoni**  
For contributions, issues, or enhancements — feel free to fork or open a pull request.