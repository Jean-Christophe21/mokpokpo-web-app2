// Authentication Module
const API_URL = 'https://bd-mokpokokpo.onrender.com';

// Role-based redirect mapping
const ROLE_REDIRECTS = {
    'ADMIN': 'admin.html',
    'GEST_STOCK': 'stock-dashboard.html',
    'GEST_COMMERCIAL': 'commercial-dashboard.html'
};

// Roles that require session storage (temporary) instead of localStorage (persistent)
const TEMPORARY_SESSION_ROLES = ['ADMIN', 'GEST_STOCK', 'GEST_COMMERCIAL'];

// Pages accessible by each role (strict access control)
const ROLE_PAGES = {
    'ADMIN': [
        'admin.html',
        'admin-login.html',
        'index.html'
    ],
    'GEST_STOCK': [
        'stock.html',
        'stock-dashboard.html',
        'stock-login.html',
        'index.html'
    ],
    'GEST_COMMERCIAL': [
        'commercial.html',
        'commercial-dashboard.html',
        'commercial-login.html',
        'index.html'
    ]
};

// Get storage type based on role
function getStorageType(role) {
    return TEMPORARY_SESSION_ROLES.includes(role) ? sessionStorage : localStorage;
}

// Get token from appropriate storage
function getToken() {
    return sessionStorage.getItem('token') || localStorage.getItem('token');
}

// Get current user from appropriate storage
function getCurrentUser() {
    const sessionUser = sessionStorage.getItem('currentUser');
    const localUser = localStorage.getItem('currentUser');
    
    if (sessionUser) {
        return JSON.parse(sessionUser);
    }
    if (localUser) {
        return JSON.parse(localUser);
    }
    return null;
}

// Save auth data to appropriate storage based on role
function saveAuthData(token, user) {
    const storage = getStorageType(user.role);
    storage.setItem('token', token);
    storage.setItem('currentUser', JSON.stringify(user));
    
    // Clear from other storage to avoid conflicts
    if (storage === sessionStorage) {
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
    } else {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('currentUser');
    }
}

// Clear all auth data
function clearAuthData() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
}

// Check if current page is allowed for user role
function isPageAllowedForRole(role, currentPage) {
    // Get current page filename
    const page = currentPage || window.location.pathname.split('/').pop() || 'index.html';
    
    // Check if page is in allowed pages for this role
    const allowedPages = ROLE_PAGES[role] || [];
    return allowedPages.includes(page);
}

// Decode JWT token to get user info
function decodeJWT(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error decoding JWT:', error);
        return null;
    }
}

// Generic login handler
async function handleRoleLogin(form, expectedRole = null) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');
        const errorMessage = document.getElementById('errorMessage');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Reset error and loading state
        if (errorDiv) errorDiv.classList.add('d-none');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Connexion en cours...';
        }

        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                
                // Decode JWT to get user info
                const decodedToken = decodeJWT(data.access_token);
                
                if (!decodedToken) {
                    throw new Error('Impossible de décoder le token JWT');
                }
                
                // Extract user info from token - check multiple possible field names
                const rawRole = decodedToken.role || decodedToken.user_role || decodedToken.type_utilisateur || decodedToken.type;
                
                // Normalize role to uppercase to handle case variations
                const normalizedRole = rawRole ? rawRole.toString().toUpperCase().trim() : null;
                
                const user = {
                    id: decodedToken.sub || decodedToken.user_id || decodedToken.id || decodedToken.id_utilisateur,
                    email: decodedToken.email || decodedToken.mail || email,
                    role: normalizedRole,
                    nom: decodedToken.nom || decodedToken.name || decodedToken.last_name || decodedToken.lastname,
                    prenom: decodedToken.prenom || decodedToken.first_name || decodedToken.firstname || decodedToken.given_name
                };
                
                // Validate that role exists
                if (!user.role) {
                    console.error('❌ NO ROLE FOUND IN TOKEN! Token payload:', decodedToken);
                    throw new Error('Le token JWT ne contient pas d\'information de rôle. Vérifiez la configuration du backend.');
                }
                
                // Check if role matches expected role (if specified)
                if (expectedRole && user.role !== expectedRole) {
                    if (errorDiv && errorMessage) {
                        errorMessage.textContent = `Accès refusé. Cette page est réservée aux ${getRoleName(expectedRole)}.`;
                        errorDiv.classList.remove('d-none');
                    }
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Se connecter';
                    }
                    return;
                }
                
                // Save to appropriate storage based on role
                saveAuthData(data.access_token, user);
                
                // Mark that we just logged in (to handle timing issues)
                sessionStorage.setItem('justLoggedIn', 'true');
                
                // Success animation
                if (submitBtn) {
                    submitBtn.className = submitBtn.className.replace(/btn-primary/g, 'btn-success').replace(/btn-danger/g, 'btn-success');
                    submitBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2"><polyline points="20 6 9 17 4 12"></polyline></svg>Connexion réussie!';
                }
                
                // Wait for UI animation then redirect
                setTimeout(() => {
                    const redirectUrl = ROLE_REDIRECTS[user.role] || 'index.html';
                    window.location.href = redirectUrl;
                }, 1500);
            } else {
                const data = await response.json().catch(() => ({ detail: 'Erreur inconnue' }));
                console.error('Login failed:', response.status, data);
                
                if (errorDiv && errorMessage) {
                    let errorText = '';
                    
                    if (response.status === 404) {
                        errorText = 'Service de connexion introuvable. Vérifiez que le backend est démarré.';
                    } else if (response.status === 401) {
                        errorText = 'Email ou mot de passe incorrect';
                    } else if (response.status === 422) {
                        errorText = 'Format de données invalide';
                    } else {
                        errorText = data.detail || 'Identifiant ou mot de passe incorrect';
                    }
                    
                    errorMessage.textContent = errorText;
                    errorDiv.classList.remove('d-none');
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            if (errorDiv && errorMessage) {
                let errorText = '';
                
                if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                    errorText = 'Impossible de contacter le serveur. Vérifiez que le backend est démarré sur https://bd-mokpokokpo.onrender.com';
                } else if (error.name === 'TypeError') {
                    errorText = 'Erreur de connexion au serveur. Le backend peut être en cours de démarrage (cold start). Veuillez patienter 30 secondes et réessayer.';
                } else {
                    errorText = 'Erreur de connexion: ' + error.message;
                }
                
                errorMessage.textContent = errorText;
                errorDiv.classList.remove('d-none');
            }
        } finally {
            if (submitBtn && !submitBtn.className.includes('btn-success')) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Se connecter';
            }
        }
    });
}

// Get role display name
function getRoleName(role) {
    const roleNames = {
        'ADMIN': 'administrateurs',
        'GEST_STOCK': 'gestionnaires de stock',
        'GEST_COMMERCIAL': 'commerciaux'
    };
    return roleNames[role] || 'utilisateurs';
}

// Initialize admin login
function initAdminLogin() {
    const form = document.getElementById('adminLoginForm');
    if (form) {
        handleRoleLogin(form, 'ADMIN');
    }
}

// Initialize stock manager login
function initStockLogin() {
    const form = document.getElementById('stockLoginForm');
    if (form) {
        handleRoleLogin(form, 'GEST_STOCK');
    }
}

// Initialize commercial login
function initCommercialLogin() {
    const form = document.getElementById('commercialLoginForm');
    if (form) {
        handleRoleLogin(form, 'GEST_COMMERCIAL');
    }
}

// Check if user is authenticated and has correct role for current page
function checkPageAccess(requiredRole) {
    const token = getToken();
    const currentUser = getCurrentUser();
    
    // Get current page
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    if (!token || !currentUser) {
        // Special handling: if we just logged in, wait a bit before redirecting
        // This prevents race conditions where storage isn't ready yet
        const isJustLoggedIn = sessionStorage.getItem('justLoggedIn') === 'true';
        if (isJustLoggedIn) {
            sessionStorage.removeItem('justLoggedIn');
            // Try again after a short delay
            setTimeout(() => {
                const retryToken = getToken();
                const retryUser = getCurrentUser();
                if (retryToken && retryUser) {
                    // Reload the page to try again
                    window.location.reload();
                } else {
                    // Still no data, proceed with redirect to login
                    redirectToLogin(requiredRole, currentPage);
                }
            }, 500);
            return false;
        }
        
        redirectToLogin(requiredRole, currentPage);
        return false;
    }
    
    
    // Check if user has the required role
    if (requiredRole && currentUser.role !== requiredRole) {
        console.error(`❌ Role mismatch in checkPageAccess! Required: ${requiredRole}, Got: ${currentUser.role}`);
        // Wrong role for this page, redirect to their correct dashboard
        alert(`Accès refusé. Vous n'avez pas les permissions nécessaires pour accéder à cette page.`);
        window.location.href = ROLE_REDIRECTS[currentUser.role] || 'index.html';
        return false;
    }
    
    // Additional check: verify if current page is in allowed pages for user role
    if (!isPageAllowedForRole(currentUser.role, currentPage)) {
        console.error(`❌ Page not allowed for role ${currentUser.role}: ${currentPage}`);
        alert(`Accès refusé. Cette page n'est pas accessible avec votre rôle.`);
        window.location.href = ROLE_REDIRECTS[currentUser.role] || 'index.html';
        return false;
    }
    
    
    return true;
}

// Helper function to redirect to appropriate login page
function redirectToLogin(requiredRole, currentPage) {
    const loginPages = {
        'ADMIN': 'admin-login.html',
        'GEST_STOCK': 'stock-login.html',
        'GEST_COMMERCIAL': 'commercial-login.html'
    };
    
    // Don't redirect if already on a login page or index
    if (!currentPage.includes('login.html') && currentPage !== 'index.html' && currentPage !== 'register.html') {
        window.location.href = loginPages[requiredRole] || 'index.html';
    }
}

// Verify access for any page (can be called without required role)
function verifyAccess() {
    const currentUser = getCurrentUser();
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // Allow public pages and login pages
    const publicPages = ['index.html', 'admin-login.html', 'stock-login.html', 'commercial-login.html'];
    if (publicPages.includes(currentPage)) {
        return true;
    }
    
    // If user is logged in, check if they can access this page
    if (currentUser) {
        if (!isPageAllowedForRole(currentUser.role, currentPage)) {
            alert(`Accès refusé. Cette page n'est pas accessible avec votre rôle.`);
            window.location.href = ROLE_REDIRECTS[currentUser.role] || 'index.html';
            return false;
        }
    }
    
    return true;
}

// Logout function
function logout() {
    clearAuthData();
    window.location.href = 'index.html';
}

// Prevent back button access after logout for sensitive roles
window.addEventListener('pageshow', function(event) {
    const currentUser = getCurrentUser();
    
    // If user has a sensitive role and page was loaded from cache
    if (currentUser && TEMPORARY_SESSION_ROLES.includes(currentUser.role) && event.persisted) {
        // Force reload to check authentication
        window.location.reload();
    }
});
