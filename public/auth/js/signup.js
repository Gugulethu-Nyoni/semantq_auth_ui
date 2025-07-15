import { showFieldError, clearFieldErrors, showAlert } from './ui-feedback.js';
import AppConfig from './config.js';

console.log("Target URL", `${AppConfig.BASE_URL}/signup`);

document.querySelector('.password-toggle').addEventListener('click', function () {
    const passwordInput = document.querySelector('#signup-password');
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
});

const signupForm = document.getElementById('signupForm');

const validateForm = (form) => {
    const inputs = form.querySelectorAll('input[required]');
    let isValid = true;

    clearFieldErrors(form);

    inputs.forEach(input => {
        if (!input.value.trim()) {
            showFieldError(input, 'This field is required');
            isValid = false;
        } else if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
            showFieldError(input, 'Please enter a valid email');
            isValid = false;
        } else if (input.type === 'password' && input.value.length < 8) {
            showFieldError(input, 'Password must be at least 8 characters');
            isValid = false;
        }
    });

    const passwordInput = form.querySelector('#signup-password');
    const confirmPasswordInput = form.querySelector('#signup-confirm-password');
    if (passwordInput && confirmPasswordInput && passwordInput.value !== confirmPasswordInput.value) {
        showFieldError(confirmPasswordInput, 'Passwords do not match');
        isValid = false;
    }

    return isValid;
};

if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!validateForm(signupForm)) {
            showAlert(signupForm, 'Please correct the errors in the form.', 'error', {
                container: document.getElementById('signup-feedback'),
                dismissAfter: 5000
            });
            return;
        }

        const formData = new FormData(signupForm);
        const payload = Object.fromEntries(formData.entries());

        if (!navigator.onLine) {
            showAlert(signupForm, 'You are offline. Please check your internet connection.', 'error', {
                container: document.getElementById('signup-feedback'),
                dismissAfter: 5000
            });
            return;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), AppConfig.FETCH_TIMEOUT || 10000);

            console.groupCollapsed(`[SIGNUP] Sending request to ${AppConfig.BASE_URL}/signup`);
            console.log('Payload:', payload);

            const res = await fetch(`${AppConfig.BASE_URL}/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal,
                credentials: 'include'
            });

            clearTimeout(timeoutId);

            const contentType = res.headers.get('Content-Type');
            let data;
            if (contentType && contentType.includes('application/json')) {
                data = await res.json();
            } else {
                data = { message: 'Unexpected response format', raw: await res.text() };
            }

            console.log('Response status:', res.status);
            console.log('Response data:', data);
            console.groupEnd();

            if (!res.ok) {
                if (data?.errors && typeof data.errors === 'object') {
                    Object.entries(data.errors).forEach(([field, msg]) => {
                        const input = signupForm.querySelector(`[name="${field}"]`);
                        if (input) showFieldError(input, msg);
                    });
                }
                throw new Error(data.message || 'Signup failed. Please check your input.');
            }

            showAlert(signupForm, 'Signup successful! Please check your email to confirm your account.', 'success', {
                container: document.getElementById('signup-feedback'),
                dismissAfter: null
            });

            signupForm.classList.add('hidden');

        } catch (err) {
            console.groupCollapsed('[SIGNUP ERROR]');
            console.error('Signup error:', err);
            console.groupEnd();

            let errorMessage = 'An unexpected error occurred. Please try again later.';

            if (err.name === 'AbortError') {
                errorMessage = 'Server took too long to respond. Please try again.';
            } else if (err instanceof TypeError && err.message === 'Failed to fetch') {
                errorMessage = 'Cannot reach the server. Please check your internet connection.';
            } else {
                errorMessage = err.message || errorMessage;
            }

            showAlert(signupForm, errorMessage, 'error', {
                container: document.getElementById('signup-feedback'),
                dismissAfter: 5000
            });
        }
    });
}
