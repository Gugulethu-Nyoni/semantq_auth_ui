
# 🔐 Installing Semantq Auth UI for Your Semantq Full Stack (CRUD) Projects

**`@semantq/auth`** is a scoped, full-stack authentication package supporting MySQL and Supabase adapters. It includes functionality for:

- Email-based account creation
- Email confirmation
- Login and logout
- Password recovery

**`semantq_auth_ui`** is a plug-and-play user interface layer built for Semantq-based full-stack projects. It works **on top of `@semantq/auth`** and simplifies the process of getting your frontend authentication UI up and running.


## Prerequisites

Before installing the **Auth UI**, make sure you’ve installed the Semantq server and core auth module.

### 1. Install the Semantq Server

```bash
npm install:server
````

### 2. Install the Core Auth Package 

You install the @semantq/auth as a semantq_server node package not a project root module: 

```bash
cd semantq_server
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
- Copies all `auth` and `dashboard` JS/CSS files into your project’s `public/` directory:

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

- 🛣️ Clones all route files into your project’s `src/routes/` directory:


With that set up, you **don’t have to write any CSS or JavaScript** to get a working authentication UI.


## Auth UI Routes

Semantq uses a file-based routing system, so these routes are automatically available and pick at build - meaning you do not need to create the routes you just need to access them and use them in your app:

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

### Example: `config.js`

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

* Update `BASE_URLS.development` to match your backend server’s port.
* By default, all `@semantq/auth` routes are accessible under:
  `http://your-server/@semantq/auth` - so all you need to update is this part `http://your-server/`
* You can change the `DASHBOARD` route if needed but works perfectly in the default setting. 

## Developer Notes

This UI is intended to save you time and fast-track your CRUD app setup. However, **you are free to develop your own auth UI** or use your own backend auth strategy if needed.


## Further Guides

* Semantq Server Installation & Setup
  [https://github.com/Gugulethu-Nyoni/semantq\_server](https://github.com/Gugulethu-Nyoni/semantq_server)

* Semantq Auth Package Installation
  GitHub: [https://github.com/Gugulethu-Nyoni/semantq\_auth](https://github.com/Gugulethu-Nyoni/semantq_auth)
  NPM: [https://www.npmjs.com/package/@semantq/auth](https://www.npmjs.com/package/@semantq/auth)


## Maintainer

**Gugulethu Nyoni**
For contributions, issues, or enhancements — feel free to fork or open a pull request.
