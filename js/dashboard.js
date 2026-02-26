// Dashboard Logic for Mokpokpo

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
        console.warn('No token found, redirecting to login');
        alert('Vous devez vous connecter pour accéder à cette page.');
        window.location.href = '../Site/login.html';
        return;
    }

    console.log('Token found:', token.substring(0, 20) + '...');

    // Initialize dashboard
    loadUserInfo();
    loadDashboardStats();
    loadCart();
    loadOrders();
    initSectionNavigation();
    updateAllCartCounts();
});

// Section Navigation
function initSectionNavigation() {
    const navLinks = document.querySelectorAll('[data-section]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            console.log('Navigation clicked:', link.getAttribute('data-section'));
            
            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked link
            link.classList.add('active');
            
            // Hide all sections
            document.querySelectorAll('.dashboard-section').forEach(section => {
                section.classList.add('d-none');
            });
            
            // Show selected section
            const sectionId = link.getAttribute('data-section');
            const sectionElement = document.getElementById(`${sectionId}-section`);
            
            if (sectionElement) {
                sectionElement.classList.remove('d-none');
                
                // Scroll to top of section
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
                
                // Reload specific section data
                if (sectionId === 'cart') {
                    loadCart();
                } else if (sectionId === 'orders') {
                    loadOrders();
                } else if (sectionId === 'overview') {
                    loadDashboardStats();
                }
            } else {
                console.error(`Section ${sectionId}-section not found`);
            }
        });
    });
    
    // Handle hash navigation on page load
    const hash = window.location.hash.substring(1);
    if (hash) {
        const link = document.querySelector(`[data-section="${hash}"]`);
        if (link) {
            link.click();
        }
    }
}

// Load User Info
async function loadUserInfo() {
    try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        
        if (!token) {
            console.error('No token available');
            window.location.href = 'login.html';
            return;
        }
        
        console.log('Loading user info with token...');
        
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const user = await response.json();
            console.log('User info loaded:', user.email);
            
            // Update user display with proper encoding
            const dashboardUserName = document.getElementById('dashboardUserName');
            const dashboardUserEmail = document.getElementById('dashboardUserEmail');
            const userNameDisplay = document.getElementById('userNameDisplay');
            
            if (dashboardUserName) {
                dashboardUserName.textContent = `${user.prenom || ''} ${user.nom || ''}`;
            }
            
            if (dashboardUserEmail) {
                dashboardUserEmail.textContent = user.email || '';
            }
            
            if (userNameDisplay) {
                userNameDisplay.textContent = user.prenom || 'Mon Compte';
            }
            
            // Update profile form
            const profileFirstName = document.getElementById('profileFirstName');
            const profileLastName = document.getElementById('profileLastName');
            const profileEmail = document.getElementById('profileEmail');
            const profileRole = document.getElementById('profileRole');
            
            if (profileFirstName) profileFirstName.value = user.prenom || '';
            if (profileLastName) profileLastName.value = user.nom || '';
            if (profileEmail) profileEmail.value = user.email || '';
            if (profileRole) profileRole.value = user.role || '';
            
            // Store user data
            localStorage.setItem('currentUser', JSON.stringify(user));
        } else {
            console.error('Failed to load user info, status:', response.status);
            
            if (response.status === 401) {
                // Token expired or invalid
                alert('Votre session a expiré. Veuillez vous reconnecter.');
                localStorage.removeItem('token');
                localStorage.removeItem('currentUser');
                window.location.href = 'login.html';
            }
        }
    } catch (error) {
        console.error('Error loading user info:', error);
        // Try to load from localStorage as fallback
        const cachedUser = localStorage.getItem('currentUser');
        if (cachedUser) {
            try {
                const user = JSON.parse(cachedUser);
                const dashboardUserName = document.getElementById('dashboardUserName');
                const dashboardUserEmail = document.getElementById('dashboardUserEmail');
                const userNameDisplay = document.getElementById('userNameDisplay');
                
                if (dashboardUserName) dashboardUserName.textContent = `${user.prenom || ''} ${user.nom || ''}`;
                if (dashboardUserEmail) dashboardUserEmail.textContent = user.email || '';
                if (userNameDisplay) userNameDisplay.textContent = user.prenom || 'Mon Compte';
            } catch (e) {
                console.error('Error parsing cached user:', e);
            }
        }
    }
}

// Load Dashboard Stats
function loadDashboardStats() {
    // Load cart count
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    document.getElementById('cartItemsCount').textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    // Load orders from localStorage (in real app, fetch from API)
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    document.getElementById('totalOrders').textContent = orders.length;
    
    // Calculate total spent
    const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
    document.getElementById('totalSpent').textContent = totalSpent.toLocaleString();
    
    // Load recent orders
    loadRecentOrders(orders);
}

// Load Recent Orders
function loadRecentOrders(orders) {
    const recentOrdersList = document.getElementById('recentOrdersList');
    
    if (!recentOrdersList) {
        console.error('recentOrdersList element not found');
        return;
    }
    
    if (!orders || orders.length === 0) {
        recentOrdersList.innerHTML = `
            <div class="text-center py-5">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-muted mb-3">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                </svg>
                <p class="text-muted mb-0">Aucune commande pour le moment</p>
            </div>
        `;
        return;
    }
    
    const recentOrders = orders.slice(-3).reverse();
    
    recentOrdersList.innerHTML = recentOrders.map(order => `
        <div class="border rounded-3 p-3 mb-3">
            <div class="d-flex justify-content-between align-items-start mb-2">
                <div>
                    <h6 class="fw-bold mb-1">Commande #${order.id}</h6>
                    <p class="text-muted small mb-0">${new Date(order.date).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}</p>
                </div>
                <span class="badge bg-${getStatusColor(order.status)}">${order.status}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center">
                <span class="text-muted">${order.items.length} article(s)</span>
                <span class="fw-bold text-success">${order.total.toLocaleString('fr-FR')} FCFA</span>
            </div>
        </div>
    `).join('');
}

// Get Status Color
function getStatusColor(status) {
    const colors = {
        'En attente': 'warning',
        'Confirmée': 'info',
        'En cours': 'primary',
        'Livrée': 'success',
        'Annulée': 'danger'
    };
    return colors[status] || 'secondary';
}

// Load Cart
function loadCart() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const cartItemsList = document.getElementById('cartItemsList');
    const cartSummary = document.getElementById('cartSummary');
    const sidebarCartCount = document.getElementById('sidebarCartCount');
    
    // Update sidebar count
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    sidebarCartCount.textContent = totalItems;
    
    if (cart.length === 0) {
        cartItemsList.innerHTML = '<p class="text-muted text-center py-4">Votre panier est vide</p>';
        cartSummary.classList.add('d-none');
        return;
    }
    
    // Display cart items
    cartItemsList.innerHTML = cart.map(item => `
        <div class="cart-item border rounded-3 p-3 mb-3">
            <div class="row align-items-center">
                <div class="col-md-6">
                    <div class="d-flex align-items-center gap-3">
                        <img src="${item.image}" alt="${item.name}" class="rounded" style="width: 80px; height: 80px; object-fit: cover;">
                        <div>
                            <h6 class="fw-bold mb-1">${item.name}</h6>
                            <p class="text-muted small mb-0">${item.price.toLocaleString()} FCFA / unité</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="input-group input-group-sm">
                        <button class="btn btn-outline-secondary" onclick="updateCartQuantity(${item.id}, ${item.quantity - 1})">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </button>
                        <input type="number" class="form-control text-center" value="${item.quantity}" min="1" readonly>
                        <button class="btn btn-outline-secondary" onclick="updateCartQuantity(${item.id}, ${item.quantity + 1})">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="col-md-2 text-end">
                    <p class="fw-bold text-success mb-0">${(item.price * item.quantity).toLocaleString()} FCFA</p>
                </div>
                <div class="col-md-1 text-end">
                    <button class="btn btn-outline-danger btn-sm" onclick="removeFromCart(${item.id})">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    // Calculate total
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('cartTotal').textContent = total.toLocaleString();
    
    cartSummary.classList.remove('d-none');
}

// Update Cart Quantity
function updateCartQuantity(productId, newQuantity) {
    if (newQuantity < 1) return;
    
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const itemIndex = cart.findIndex(item => item.id === productId);
    
    if (itemIndex !== -1) {
        cart[itemIndex].quantity = newQuantity;
        localStorage.setItem('cart', JSON.stringify(cart));
        loadCart();
        loadDashboardStats();
        updateAllCartCounts();
    }
}

// Remove from Cart
function removeFromCart(productId) {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    
    loadCart();
    loadDashboardStats();
    updateAllCartCounts();
    
    // Show notification
    showNotification('Produit retiré du panier', 'info');
}

// Clear Cart
function clearCart() {
    if (confirm('Êtes-vous sûr de vouloir vider votre panier ?')) {
        localStorage.setItem('cart', JSON.stringify([]));
        loadCart();
        loadDashboardStats();
        updateAllCartCounts();
        showNotification('Panier vidé', 'info');
    }
}

// Proceed to Checkout
function proceedToCheckout() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    if (cart.length === 0) {
        showNotification('Votre panier est vide', 'warning');
        return;
    }
    
    // Create order
    const order = {
        id: Date.now(),
        date: new Date().toISOString(),
        status: 'En attente',
        items: cart,
        total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    };
    
    // Save order
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    orders.push(order);
    localStorage.setItem('orders', JSON.stringify(orders));
    
    // Clear cart
    localStorage.setItem('cart', JSON.stringify([]));
    
    // Show success
    showNotification('Commande passée avec succès !', 'success');
    
    // Reload dashboard
    loadDashboardStats();
    loadCart();
    loadOrders();
    updateAllCartCounts();
    
    // Switch to orders section
    document.querySelector('[data-section="orders"]').click();
}

// Load Orders
function loadOrders() {
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    const ordersHistoryList = document.getElementById('ordersHistoryList');
    
    if (orders.length === 0) {
        ordersHistoryList.innerHTML = '<p class="text-muted text-center py-4">Aucune commande</p>';
        return;
    }
    
    ordersHistoryList.innerHTML = orders.reverse().map(order => `
        <div class="card border-0 shadow-sm mb-3">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div>
                        <h5 class="fw-bold mb-1">Commande #${order.id}</h5>
                    <p class="text-muted small mb-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            ${new Date(order.date).toLocaleDateString('fr-FR', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            }).replace(/?/g, 'é')}
                        </p>
                    </div>
                    <span class="badge bg-${getStatusColor(order.status)} px-3 py-2">${order.status}</span>
                </div>
                
                <div class="order-items mb-3">
                    ${order.items.map(item => `
                        <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
                            <div class="d-flex align-items-center gap-2">
                                <img src="${item.image}" alt="${item.name}" class="rounded" style="width: 50px; height: 50px; object-fit: cover;">
                                <div>
                                    <p class="fw-semibold mb-0">${item.name}</p>
                                    <p class="text-muted small mb-0">Quantité: ${item.quantity}</p>
                                </div>
                            </div>
                            <span class="fw-bold">${(item.price * item.quantity).toLocaleString()} FCFA</span>
                        </div>
                    `).join('')}
                </div>
                
                <div class="d-flex justify-content-between align-items-center pt-3 border-top">
                    <span class="fw-bold">Total</span>
                    <span class="h5 fw-bold text-success mb-0">${order.total.toLocaleString()} FCFA</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Update All Cart Counts
function updateAllCartCounts() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    // Update all cart badges
    document.querySelectorAll('.cart-badge').forEach(badge => {
        badge.textContent = count;
        badge.style.display = count === 0 ? 'none' : 'flex';
    });
}

// Show Notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} position-fixed top-0 start-50 translate-middle-x mt-3 shadow-lg animate__animated animate__fadeInDown`;
    notification.style.zIndex = '9999';
    
    const icons = {
        success: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>',
        info: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>',
        warning: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
        danger: '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>'
    };
    
    notification.innerHTML = `
        <div class="d-flex align-items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                ${icons[type] || icons.info}
            </svg>
            ${message}
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds with fade out animation
    setTimeout(() => {
        notification.classList.add('animate__fadeOutUp');
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}
