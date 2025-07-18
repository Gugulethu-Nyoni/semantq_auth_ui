//login.js
import AppConfig from './config.js';
import { login, redirectToDashboard, getDashboardPath } from './auth.js';

// DOM Elements
const form = document.getElementById('login-form');
const statusDiv = document.getElementById('auth-status');
const submitBtn = form?.querySelector('button[type="submit"]');

if (!form || !submitBtn) {
  console.error('Login form elements not found');
} else {
  // UI Utilities
  function showStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.className = isError ? 'error' : 'success';
    statusDiv.classList.remove('hidden');
  }

  function setLoadingState(isLoading) {
    submitBtn.disabled = isLoading;
    form.classList.toggle('loading', isLoading);
  }

  // Form Submission Handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setLoadingState(true);
    showStatus('Authenticating...');

    const email = form.email.value.trim();
    const password = form.password.value;

    if (!email || !password) {
      showStatus('Please enter both email and password.', true);
      setLoadingState(false);
      return;
    }

    try {
      const { success, message } = await login(email, password);
      
      if (success) {
        showStatus('Login successful! Redirecting...');
        setTimeout(redirectToDashboard, 1000);
      } else {
        showStatus(message || 'Authentication failed', true);
        setLoadingState(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      showStatus('An unexpected error occurred', true);
      setLoadingState(false);
    }
  });

  // Auto-focus email field on load
  form.email.focus();
}