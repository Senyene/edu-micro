class AuthManager {
    constructor() {
        this.apiUrl = 'http://localhost:3000/api';
        this.tokenKey = 'edumicro_token';
        this.userKey = 'edumicro_user';
        this.checkAuth();
    }

    checkAuth() {
        const token = localStorage.getItem(this.tokenKey);
        if (token) {
            this.validateToken(token);
        } else {
            this.redirectIfProtected();
        }
    }

    validateToken(token) {
        try {
            const payload = token.split('.')[1];
            const decodedPayload = JSON.parse(atob(payload));
            const expirationTime = decodedPayload.exp * 1000;
            if (Date.now() >= expirationTime) {
                this.logout();
                return false;
            }
            this.updateUIForLoggedInUser(decodedPayload);
            return true;
        } catch (error) {
            this.logout();
            return false;
        }
    }

    async register(userData) {
        try {
            this.toggleLoading(true);
            const response = await fetch(`${this.apiUrl}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Registration failed');
            this.setSession(data.token, data.user);
            window.location.href = 'profile.html';
            return data;
        } catch (error) {
            this.showError(error.message);
            throw error;
        } finally {
            this.toggleLoading(false);
        }
    }

    async login(email, password) {
        try {
            this.toggleLoading(true);
            const response = await fetch(`${this.apiUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Login failed');
            this.setSession(data.token, data.user);
            window.location.href = 'dashboard.html';
            return data;
        } catch (error) {
            this.showError(error.message);
            throw error;
        } finally {
            this.toggleLoading(false);
        }
    }

    setSession(token, user) {
        localStorage.setItem(this.tokenKey, token);
        localStorage.setItem(this.userKey, JSON.stringify(user));
        this.updateUIForLoggedInUser(user);
    }

    logout() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
        this.updateUIForLoggedOutUser();
        window.location.href = 'login.html';
    }

    getCurrentUser() {
        const userData = localStorage.getItem(this.userKey);
        return userData ? JSON.parse(userData) : null;
    }

    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    async apiRequest(endpoint, options = {}) {
        const token = this.getToken();
        if (!token) throw new Error('No authentication token found');
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        };
        const response = await fetch(`${this.apiUrl}${endpoint}`, { ...options, headers });
        if (response.status === 401) {
            this.logout();
            throw new Error('Session expired. Please login again.');
        }
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        return data;
    }

    updateUIForLoggedInUser(user) {
        const loginBtn = document.querySelector('.login-btn');
        const userMenu = document.querySelector('.user-menu');
        const userName = document.querySelector('.user-name');
        if (loginBtn) {
            loginBtn.textContent = 'Dashboard';
            loginBtn.href = 'dashboard.html';
        }
        if (userName) userName.textContent = user.name || user.email;
        if (userMenu) userMenu.style.display = 'block';
    }

    updateUIForLoggedOutUser() {
        const loginBtn = document.querySelector('.login-btn');
        const userMenu = document.querySelector('.user-menu');
        if (loginBtn) {
            loginBtn.textContent = 'Login';
            loginBtn.href = 'login.html';
        }
        if (userMenu) userMenu.style.display = 'none';
    }

    redirectIfProtected() {
        const protectedPages = ['dashboard.html', 'profile.html'];
        const currentPage = window.location.pathname.split('/').pop();
        if (protectedPages.includes(currentPage)) {
            window.location.href = 'login.html';
        }
    }

    toggleLoading(isLoading) {
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) {
            if (isLoading) {
                submitBtn.dataset.originalText = submitBtn.textContent;
                submitBtn.textContent = 'Loading...';
                submitBtn.disabled = true;
            } else {
                submitBtn.textContent = submitBtn.dataset.originalText || 'Submit';
                submitBtn.disabled = false;
            }
        }
    }

    showError(message) {
        let errorDiv = document.querySelector('.error-message');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            const form = document.querySelector('form');
            if (form) form.parentNode.insertBefore(errorDiv, form);
        }
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => { errorDiv.style.display = 'none'; }, 5000);
    }
}

let authManager;

document.addEventListener('DOMContentLoaded', () => {
    authManager = new AuthManager();
    
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            if (!email || !password) {
                authManager.showError('Please fill in all fields');
                return;
            }
            try {
                await authManager.login(email, password);
            } catch (error) {
                console.log('Login attempt failed');
            }
        });
    }
    
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                password: document.getElementById('password').value,
                confirmPassword: document.getElementById('confirmPassword').value
            };
            if (userData.password !== userData.confirmPassword) {
                authManager.showError('Passwords do not match');
                return;
            }
            if (userData.password.length < 8) {
                authManager.showError('Password must be at least 8 characters');
                return;
            }
            try {
                await authManager.register(userData);
            } catch (error) {
                console.log('Registration failed');
            }
        });
    }
});