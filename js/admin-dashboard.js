// ===================================
// CONFIGURATION API
// ===================================
const API_BASE_URL = 'https://bd-mokpokokpo.onrender.com';

// ===================================
// AUTHENTICATION & UTILS
// ===================================
function getAuthHeaders() {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

function checkAuth() {
const token = sessionStorage.getItem('token') || localStorage.getItem('token');
const currentUserStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
    
if (!token || !currentUserStr) {
    window.location.href = 'admin-login.html';
    return false;
}
    
try {
    const currentUser = JSON.parse(currentUserStr);
    if (currentUser.role !== 'ADMIN') {
        window.location.href = 'admin-login.html';
        return false;
    }
    return true;
    } catch (error) {
        console.error('Error parsing user data:', error);
        window.location.href = 'admin-login.html';
        return false;
    }
}

// ===================================
// INITIALIZATION
// ===================================
document.addEventListener('DOMContentLoaded', function() {
    if (!checkAuth()) return;
    
    // Load dashboard data
    loadDashboardStats();
    loadRecentActivity();
    
    // Setup navigation
    setupNavigation();
    
    // Update user display
    updateUserDisplay();
});

function setupNavigation() {
    const navLinks = document.querySelectorAll('[data-section]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            showSection(section);
            
            // Update active state
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function showSection(sectionName) {
    const sections = document.querySelectorAll('.dashboard-section');
    sections.forEach(section => {
        section.classList.add('d-none');
    });
    
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.remove('d-none');
        
        // Load section data
        switch(sectionName) {
            case 'users':
                loadUsers();
                break;
            case 'products':
                loadProducts();
                break;
            case 'stocks':
                loadStocks();
                break;
            case 'orders':
                loadOrders();
                break;
            case 'alerts':
                loadAlerts();
                break;
            case 'predictions':
                loadSalesPredictions();
                loadHistoricalData();
                break;
        }
    }
}

function updateUserDisplay() {
    const currentUserStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
    let displayName = 'Admin';
    
    if (currentUserStr) {
        try {
            const currentUser = JSON.parse(currentUserStr);
            displayName = currentUser.prenom || currentUser.email?.split('@')[0] || 'Admin';
        } catch (error) {
            console.error('Error parsing user data:', error);
        }
    }
    
    const displayElement = document.getElementById('userNameDisplay');
    if (displayElement) {
        displayElement.textContent = displayName;
    }
}

function logout() {
    // Clear both storages
    sessionStorage.clear();
    localStorage.clear();
    window.location.href = 'admin-login.html';
}

// ===================================
// DASHBOARD STATISTICS
// ===================================
async function loadDashboardStats() {
    try {
        // Load all stats in parallel
        const [users, products, orders, ventes] = await Promise.all([
            fetch(`${API_BASE_URL}/utilisateurs/`, { headers: getAuthHeaders() }).then(r => r.json()),
            fetch(`${API_BASE_URL}/produits/`, { headers: getAuthHeaders() }).then(r => r.json()),
            fetch(`${API_BASE_URL}/commandes/`, { headers: getAuthHeaders() }).then(r => r.json()),
            fetch(`${API_BASE_URL}/ventes/`, { headers: getAuthHeaders() }).then(r => r.json())
        ]);
        
        // Update stats
        document.getElementById('totalUsers').textContent = users.length || 0;
        document.getElementById('totalProducts').textContent = products.length || 0;
        document.getElementById('totalOrders').textContent = orders.length || 0;
        document.getElementById('ordersBadge').textContent = orders.filter(o => o.statut === 'EN_ATTENTE').length;
        
        // Calculate total revenue
        const totalRevenue = ventes.reduce((sum, v) => sum + (v.chiffre_affaires || 0), 0);
        document.getElementById('totalRevenue').textContent = totalRevenue.toLocaleString('fr-BJ');
        
        // Load alerts count
        const alerts = await fetch(`${API_BASE_URL}/alertes-stock/`, { headers: getAuthHeaders() }).then(r => r.json());
        document.getElementById('alertsBadge').textContent = alerts.length || 0;
        document.getElementById('totalAlerts').textContent = alerts.length || 0;
        
    } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
        showNotification('Erreur lors du chargement des statistiques', 'danger');
    }
}

// ===================================
// RECENT ACTIVITY
// ===================================
async function loadRecentActivity() {
    const container = document.getElementById('recentActivity');
    
    try {
        const orders = await fetch(`${API_BASE_URL}/commandes/`, { headers: getAuthHeaders() }).then(r => r.json());
        
        if (orders.length === 0) {
            container.innerHTML = '<p class="text-center text-muted py-4">Aucune activité récente</p>';
            return;
        }
        
        // Get last 5 orders
        const recentOrders = orders.slice(-5).reverse();
        
        let html = '<div class="list-group list-group-flush">';
        for (const order of recentOrders) {
            const date = new Date(order.date_commande).toLocaleDateString('fr-FR');
            const statusBadge = getStatusBadge(order.statut);
            
            html += `
                <div class="list-group-item border-0 px-0">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>Commande #${order.id_commande}</strong>
                            ${statusBadge}
                            <p class="text-muted small mb-0">${date}</p>
                        </div>
                        <span class="text-primary fw-bold">${order.montant_total || 0} FCFA</span>
                    </div>
                </div>
            `;
        }
        html += '</div>';
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Erreur:', error);
        container.innerHTML = '<p class="text-center text-muted py-4">Erreur de chargement</p>';
    }
}

// ===================================
// USERS MANAGEMENT
// ===================================
async function loadUsers() {
    const container = document.getElementById('usersList');
    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';
    
    try {
        const users = await fetch(`${API_BASE_URL}/utilisateurs/`, { headers: getAuthHeaders() }).then(r => r.json());
        
        if (users.length === 0) {
            container.innerHTML = '<p class="text-center text-muted py-4">Aucun utilisateur trouvé</p>';
            return;
        }
        
        let html = '<div class="table-responsive"><table class="table table-hover"><thead class="table-light"><tr><th>ID</th><th>Nom</th><th>Email</th><th>Réle</th><th>Actions</th></tr></thead><tbody>';
        
        users.forEach(user => {
            const roleBadge = getRoleBadge(user.role);
            html += `
                <tr>
                    <td>${user.id_utilisateur}</td>
                    <td>${user.prenom} ${user.nom}</td>
                    <td>${user.email}</td>
                    <td>${roleBadge}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="viewUser(${user.id_utilisateur})">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Erreur:', error);
        container.innerHTML = '<p class="text-center text-danger py-4">Erreur de chargement</p>';
    }
}

function viewUser(userId) {
    showNotification(`Détails de l'utilisateur #${userId} (fonctionnalité é implémenter)`, 'info');
}

// ===================================
// PRODUCTS MANAGEMENT
// ===================================
async function loadProducts() {
    const container = document.getElementById('productsList');
    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/produits/`, { headers: getAuthHeaders() });
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const products = await response.json();
        
        if (products.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-muted mb-3">
                        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
                        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
                    </svg>
                    <p class="text-muted">Aucun produit dans le catalogue</p>
                    <button class="btn btn-primary mt-2" onclick="showAddProductModal()">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Ajouter le premier produit
                    </button>
                </div>
            `;
            return;
        }
        
        let html = '<div class="row g-4">';
        
        products.forEach(product => {
            // Catégorie couleurs
            const typeColors = {
                'Aromatique': 'success',
                'Médicinale': 'info',
                'Superaliment': 'warning',
                'Épice': 'danger'
            };
            const badgeColor = typeColors[product.type_produit] || 'secondary';
            
            html += `
                <div class="col-md-6 col-lg-4">
                    <div class="card h-100 border-0 shadow-sm product-card">
                        ${product.url_image ? `
                            <div style="height: 200px; overflow: hidden; border-radius: 0.5rem 0.5rem 0 0;">
                                <img src="${product.url_image}" 
                                     alt="${product.nom_produit}" 
                                     class="w-100 h-100 object-fit-cover"
                                     onerror="this.parentElement.innerHTML='<div class=\\'d-flex align-items-center justify-content-center h-100 bg-light\\'><svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'48\\' height=\\'48\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'1.5\\'><path d=\\'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10 Z\\'/><path d=\\'M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12\\'/></svg></div>'">
                            </div>
                        ` : `
                            <div class="d-flex align-items-center justify-content-center bg-light" style="height: 200px; border-radius: 0.5rem 0.5rem 0 0;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-muted">
                                    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10 Z"/>
                                    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
                                </svg>
                            </div>
                        `}
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h5 class="fw-bold mb-0">${product.nom_produit}</h5>
                                <span class="badge bg-${badgeColor}">${product.type_produit || 'Autre'}</span>
                            </div>
                            <p class="text-muted small mb-3" style="min-height: 40px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                                ${product.description || 'Aucune description disponible'}
                            </p>
                            ${product.usages ? `
                                <div class="mb-3">
                                    <small class="text-muted d-block mb-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <line x1="12" y1="16" x2="12" y2="12"></line>
                                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                        </svg>
                                        Usages:
                                    </small>
                                    <small class="text-muted">${product.usages}</small>
                                </div>
                            ` : ''}
                            <div class="d-flex justify-content-between align-items-center mt-auto pt-3 border-top">
                                <div>
                                    <small class="text-muted d-block">Prix unitaire</small>
                                    <span class="h4 text-primary fw-bold mb-0">${Number(product.prix_unitaire).toLocaleString('fr-FR')} FCFA</span>
                                </div>
                                <div class="btn-group btn-group-sm">
                                    <button class="btn btn-outline-primary" onclick="editProduct(${product.id_produit})" title="Modifier">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                        </svg>
                                    </button>
                                    <button class="btn btn-outline-danger" onclick="deleteProduct(${product.id_produit}, '${product.nom_produit.replace(/'/g, "\\'")}')" title="Supprimer">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Erreur lors du chargement des produits:', error);
        container.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <strong>Erreur de chargement:</strong> ${error.message}
            </div>
            <div class="text-center">
                <button class="btn btn-primary" onclick="loadProducts()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                    </svg>
                    Réessayer
                </button>
            </div>
        `;
    }
}

function showAddProductModal() {
    showNotification('Ajout de produit (modal é implémenter)', 'info');
}

function editProduct(productId) {
    showNotification(`édition du produit #${productId}`, 'info');
}

async function deleteProduct(productId, productName = '') {
    const confirmMessage = productName 
        ? `Êtes-vous sûr de vouloir supprimer le produit "${productName}" ?\n\nCette action est irréversible.`
        : 'Êtes-vous sûr de vouloir supprimer ce produit ?\n\nCette action est irréversible.';
    
    if (!confirm(confirmMessage)) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/produits/${productId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            showNotification(`Produit ${productName ? '"' + productName + '"' : '#' + productId} supprimé avec succès`, 'success');
            loadProducts();
        } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Erreur lors de la suppression');
        }
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        showNotification('Erreur: ' + error.message, 'danger');
    }
}

// ===================================
// STOCKS MANAGEMENT
// ===================================
async function loadStocks() {
    const container = document.getElementById('stocksList');
    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';
    
    try {
        const stocks = await fetch(`${API_BASE_URL}/stocks/`, { headers: getAuthHeaders() }).then(r => r.json());
        
        if (stocks.length === 0) {
            container.innerHTML = '<p class="text-center text-muted py-4">Aucun stock trouvé</p>';
            return;
        }
        
        // Get products info
        const products = await fetch(`${API_BASE_URL}/produits/`, { headers: getAuthHeaders() }).then(r => r.json());
        const productMap = {};
        products.forEach(p => productMap[p.id_produit] = p);
        
        let html = '<div class="list-group list-group-flush">';
        
        stocks.forEach(stock => {
            const product = productMap[stock.id_produit] || {};
            const percentage = stock.seuil_minimal > 0 ? (stock.quantite_disponible / stock.seuil_minimal * 100) : 100;
            const stockStatus = getStockStatus(stock.quantite_disponible, stock.seuil_minimal);
            
            html += `
                <div class="list-group-item stock-card ${stockStatus.class}">
                    <div class="d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center gap-3">
                            <div class="stock-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                </svg>
                            </div>
                            <div>
                                <h6 class="fw-bold mb-1">${product.nom_produit || 'Produit inconnu'}</h6>
                                <div class="d-flex gap-3 text-sm">
                                    <span class="text-muted">Stock: <strong>${stock.quantite_disponible}</strong></span>
                                    <span class="text-muted">Seuil: <strong>${stock.seuil_minimal}</strong></span>
                                </div>
                            </div>
                        </div>
                        <div class="text-end">
                            ${stockStatus.badge}
                            <p class="text-muted small mb-0">${Math.round(percentage)}%</p>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Erreur:', error);
        container.innerHTML = '<p class="text-center text-danger py-4">Erreur de chargement</p>';
    }
}

function getStockStatus(quantity, threshold) {
    if (quantity <= threshold * 0.5) {
        return {
            class: 'entry',
            badge: '<span class="badge bg-danger">Critique</span>'
        };
    } else if (quantity <= threshold) {
        return {
            class: 'exit',
            badge: '<span class="badge bg-warning text-dark">Faible</span>'
        };
    } else {
        return {
            class: '',
            badge: '<span class="badge bg-success">Normal</span>'
        };
    }
}

// ===================================
// ORDERS MANAGEMENT
// ===================================
async function loadOrders() {
    const container = document.getElementById('ordersList');
    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';
    
    try {
        const orders = await fetch(`${API_BASE_URL}/commandes/`, { headers: getAuthHeaders() }).then(r => r.json());
        
        if (orders.length === 0) {
            container.innerHTML = '<p class="text-center text-muted py-4">Aucune commande trouvée</p>';
            return;
        }
        
        let html = '<div class="list-group list-group-flush">';
        
        orders.reverse().forEach(order => {
            const date = new Date(order.date_commande).toLocaleDateString('fr-FR');
            const statusBadge = getStatusBadge(order.statut);
            
            html += `
                <div class="list-group-item order-card">
                    <div class="d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center gap-3">
                            <div class="order-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                                </svg>
                            </div>
                            <div>
                                <div class="d-flex align-items-center gap-2 mb-1">
                                    <h6 class="fw-bold mb-0">Commande #${order.id_commande}</h6>
                                    ${statusBadge}
                                </div>
                                <p class="text-muted small mb-0">${date}</p>
                            </div>
                        </div>
                        <div class="text-end">
                            <p class="h5 text-primary fw-bold mb-1">${order.montant_total || 0} FCFA</p>
                            <button class="btn btn-sm btn-outline-primary" onclick="viewOrder(${order.id_commande})">Détails</button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Erreur:', error);
        container.innerHTML = '<p class="text-center text-danger py-4">Erreur de chargement</p>';
    }
}

function viewOrder(orderId) {
    showNotification(`Détails de la commande #${orderId}`, 'info');
}

// ===================================
// ALERTS MANAGEMENT
// ===================================
async function loadAlerts() {
    const container = document.getElementById('alertsList');
    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';
    
    try {
        const alerts = await fetch(`${API_BASE_URL}/alertes-stock/`, { headers: getAuthHeaders() }).then(r => r.json());
        
        if (alerts.length === 0) {
            container.innerHTML = '<p class="text-center text-muted py-4">Aucune alerte active</p>';
            return;
        }
        
        // Get products info
        const products = await fetch(`${API_BASE_URL}/produits/`, { headers: getAuthHeaders() }).then(r => r.json());
        const productMap = {};
        products.forEach(p => productMap[p.id_produit] = p);
        
        let html = '<div class="list-group list-group-flush">';
        
        alerts.forEach(alert => {
            const product = productMap[alert.id_produit] || {};
            const date = new Date(alert.date_alerte).toLocaleDateString('fr-FR');
            
            html += `
                <div class="list-group-item border-start border-danger border-4">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <div class="d-flex align-items-center gap-2 mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-danger">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                    <line x1="12" y1="9" x2="12" y2="13"></line>
                                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                </svg>
                                <h6 class="fw-bold mb-0">${product.nom_produit || 'Produit inconnu'}</h6>
                            </div>
                            <p class="text-muted mb-2">${alert.message}</p>
                            <div class="d-flex gap-3 text-sm">
                                <span class="text-muted">Seuil: <strong>${alert.seuil_declencheur}</strong></span>
                                <span class="text-muted">Date: ${date}</span>
                            </div>
                        </div>
                        <span class="badge ${alert.statut === 'TRAITEE' ? 'bg-success' : 'bg-danger'}">${alert.statut}</span>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Erreur:', error);
        container.innerHTML = '<p class="text-center text-danger py-4">Erreur de chargement</p>';
    }
}

// ===================================
// UTILITY FUNCTIONS
// ===================================
function getStatusBadge(status) {
    const badges = {
        'EN_ATTENTE': '<span class="badge bg-warning text-dark">En attente</span>',
        'ACCEPTEE': '<span class="badge bg-info">Acceptée</span>',
        'EN_PREPARATION': '<span class="badge bg-primary">En préparation</span>',
        'EXPEDIEE': '<span class="badge bg-primary">Expédiée</span>',
        'LIVREE': '<span class="badge bg-success">Livrée</span>',
        'ANNULEE': '<span class="badge bg-danger">Annulée</span>',
        'REFUSEE': '<span class="badge bg-danger">Refusée</span>'
    };
    return badges[status] || '<span class="badge bg-secondary">' + status + '</span>';
}

function getRoleBadge(role) {
    const badges = {
        'ADMIN': '<span class="badge bg-danger">Admin</span>',
        'GEST_STOCK': '<span class="badge bg-warning text-dark">Gest. Stock</span>',
        'GEST_COMMERCIAL': '<span class="badge bg-info">Gest. Comm.</span>',
        'CLIENT': '<span class="badge bg-success">Client</span>'
    };
    return badges[role] || '<span class="badge bg-secondary">' + role + '</span>';
}

function showNotification(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
    alertDiv.style.zIndex = '9999';
    alertDiv.style.minWidth = '300px';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// ===================================
// PREDICTIONS - ADMIN HAS ACCESS TO ALL
// ===================================

// Load Sales Predictions
async function loadSalesPredictions() {
    const container = document.getElementById('salesPredictionsList');
    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="text-muted mt-2">Chargement des prédictions de ventes...</p></div>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/predictions/sales`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type');
        let data;
        
        // L'API retourne du texte selon la documentation
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            // Si c'est du texte brut (string)
            data = await response.text();
        }
        
        // Parse and display sales predictions beautifully
        container.innerHTML = renderSalesPredictions(data);
        
    } catch (error) {
        console.error('Error loading sales predictions:', error);
        container.innerHTML = `
            <div class="alert alert-danger mb-4">
                <div class="d-flex align-items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-3 flex-shrink-0">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <div>
                        <strong>Erreur de chargement des prédictions</strong>
                        <p class="mb-0 mt-1">${error.message}</p>
                        <small class="text-muted">Vérifiez que le service de prédictions est disponible et que vous êtes authentifié.</small>
                    </div>
                </div>
            </div>
            <div class="text-center py-3">
                <button class="btn btn-primary" onclick="loadSalesPredictions()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                    </svg>
                    Réessayer
                </button>
            </div>
        `;
    }
}

// Render Sales Predictions with beautiful UI
function renderSalesPredictions(data) {
    // Si c'est une string, on essaie de l'afficher joliment
    if (typeof data === 'string') {
        // Essayer de parser en JSON d'abord
        try {
            const parsedData = JSON.parse(data);
            return renderSalesPredictions(parsedData); // Récursif avec les données parsées
        } catch (e) {
            // Si ce n'est pas du JSON, c'est probablement du texte généré par l'IA
            return renderTextPrediction(data);
        }
    }
    
    // Si c'est un objet avec la structure attendue
    if (data && typeof data === 'object') {
        const forecast = data.forecast_7_days || data.prevision_7_jours || 0;
        const trends = data.trends || data.tendances || 'Aucune tendance disponible';
        const recommendations = data.recommendations || data.recommandations || [];
        const analysisText = data.analysis_text || data.analyse || data.texte || 'Aucune analyse disponible';
        
        return `
            <div class="alert alert-info mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <strong>Prédictions IA</strong> - Analyse prédictive basée sur l'historique des ventes et les tendances du marché
            </div>
            
            <!-- Forecast Card -->
            <div class="card border-0 shadow-lg mb-4" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                <div class="card-body text-white p-4">
                    <div class="row align-items-center">
                        <div class="col-md-8">
                            <div class="d-flex align-items-center mb-3">
                                <div class="me-3" style="width: 64px; height: 64px; background: rgba(255,255,255,0.2); border-radius: 16px; display: flex; align-items: center; justify-content: center;">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                                        <polyline points="17 6 23 6 23 12"></polyline>
                                    </svg>
                                </div>
                                <div>
                                    <h6 class="mb-1 opacity-75">Prévision pour les 7 Prochains Jours</h6>
                                    <h2 class="fw-bold mb-0">${Number(forecast).toLocaleString('fr-FR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} FCFA</h2>
                                </div>
                            </div>
                            <p class="mb-0 opacity-90">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                Chiffre d'affaires estimé basé sur les tendances actuelles
                            </p>
                        </div>
                        <div class="col-md-4 text-center">
                            <div style="width: 120px; height: 120px; margin: 0 auto; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                                <div style="font-size: 2.5rem;">📈</div>
                                <small class="opacity-75 mt-2">7 Jours</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Trends Analysis -->
            <div class="card border-0 shadow-sm mb-4">
                <div class="card-header bg-white border-0 py-3">
                    <h6 class="fw-bold mb-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                        </svg>
                        Analyse des Tendances
                    </h6>
                </div>
                <div class="card-body">
                    <div class="alert alert-light border-start border-4 border-primary">
                        <p class="mb-0" style="line-height: 1.8; white-space: pre-wrap;">${trends}</p>
                    </div>
                </div>
            </div>
            
            <!-- Recommendations -->
            ${Array.isArray(recommendations) && recommendations.length > 0 ? `
                <div class="card border-0 shadow-sm mb-4">
                    <div class="card-header bg-white border-0 py-3">
                        <h6 class="fw-bold mb-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                                <path d="M2 17l10 5 10-5M2 12l10 5 10-5"></path>
                            </svg>
                            Recommandations Stratégiques
                        </h6>
                    </div>
                    <div class="card-body">
                        <div class="list-group list-group-flush">
                            ${recommendations.map((rec, index) => `
                                <div class="list-group-item border-0 px-0">
                                    <div class="d-flex align-items-start">
                                        <div class="me-3" style="width: 40px; height: 40px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                            <span class="text-white fw-bold">${index + 1}</span>
                                        </div>
                                        <div class="flex-grow-1">
                                            <p class="mb-0" style="line-height: 1.7;">${rec}</p>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <!-- Analysis Details -->
            <div class="card border-0 shadow-sm">
                <div class="card-header bg-white border-0 py-3">
                    <h6 class="fw-bold mb-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                        Rapport d'Analyse Détaillé
                    </h6>
                </div>
                <div class="card-body">
                    <div class="alert alert-light border-start border-4 border-info">
                        <p class="mb-0" style="line-height: 1.8; white-space: pre-wrap;">${analysisText}</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Format par défaut si rien d'autre ne fonctionne
    return renderTextPrediction(JSON.stringify(data, null, 2));
}

// Fonction pour afficher une prédiction sous forme de texte
function renderTextPrediction(text) {
    // Nettoyer le texte
    text = text.trim();
    
    // Extraire les sections si possible
    const sections = extractSections(text);
    
    return `
        <div class="alert alert-info mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <strong>Prédictions de Ventes IA</strong> - Analyse prédictive générée par intelligence artificielle
        </div>
        
        <div class="card border-0 shadow-sm mb-4">
            <div class="card-body">
                <div class="prediction-text-content" style="line-height: 1.8; white-space: pre-wrap; font-size: 1.05rem;">
                    ${formatPredictionText(text, sections)}
                </div>
            </div>
        </div>
        
        <div class="alert alert-light border-start border-4 border-primary">
            <small class="text-muted">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                Cette analyse a été générée automatiquement en combinant le modèle ML RandomForest et l'IA Gemini pour des recommandations intelligentes.
            </small>
        </div>
    `;
}

// Extraire les sections d'un texte
function extractSections(text) {
    const sections = {
        forecast: null,
        trends: null,
        recommendations: [],
        analysis: text
    };
    
    // Rechercher des motifs courants dans le texte
    const forecastMatch = text.match(/prévision[s]?\s*:?\s*([0-9,.\s]+)\s*(FCFA|CFA|F|francs?)/i);
    if (forecastMatch) {
        sections.forecast = forecastMatch[1].trim();
    }
    
    // Rechercher les tendances
    const trendsMatch = text.match(/tendance[s]?\s*:?\s*([^\n.]+)/i);
    if (trendsMatch) {
        sections.trends = trendsMatch[1].trim();
    }
    
    // Rechercher les recommandations (lignes commençant par - ou numéros)
    const lines = text.split('\n');
    lines.forEach(line => {
        if (line.match(/^[\s]*[-•*]\s*(.+)/) || line.match(/^[\s]*\d+[.)]\s*(.+)/)) {
            sections.recommendations.push(line.trim());
        }
    });
    
    return sections;
}

// Formatter le texte de prédiction
function formatPredictionText(text, sections) {
    let formatted = text;
    
    // Mettre en gras les mots-clés importants
    const keywords = ['prévision', 'recommandation', 'tendance', 'analyse', 'FCFA', 'augmentation', 'diminution', 'stable'];
    keywords.forEach(keyword => {
        const regex = new RegExp(`\\b(${keyword}[s]?)\\b`, 'gi');
        formatted = formatted.replace(regex, '<strong>$1</strong>');
    });
    
    // Ajouter des icônes pour les listes
    formatted = formatted.replace(/^[\s]*[-•*]\s*/gm, '&nbsp;&nbsp;📌 ');
    formatted = formatted.replace(/^[\s]*(\d+)[.)]\s*/gm, '&nbsp;&nbsp;<span class="badge bg-primary rounded-circle" style="width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center;">$1</span> ');
    
    return formatted;
}

// Load Historical Data
async function loadHistoricalData() {
    const container = document.getElementById('historicalDataList');
    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="text-muted mt-2">Chargement des données historiques...</p></div>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/predictions/historical-data`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type');
        let data;
        
        // Gérer différents types de réponses
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }
        
        // Parse and display historical data beautifully
        container.innerHTML = renderHistoricalData(data);
        
    } catch (error) {
        console.error('Error loading historical data:', error);
        container.innerHTML = `
            <div class="alert alert-danger mb-4">
                <div class="d-flex align-items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-3 flex-shrink-0">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <div>
                        <strong>Erreur de chargement des données historiques</strong>
                        <p class="mb-0 mt-1">${error.message}</p>
                        <small class="text-muted">Vérifiez que le service est disponible et que vous êtes authentifié.</small>
                    </div>
                </div>
            </div>
            <div class="text-center py-3">
                <button class="btn btn-primary" onclick="loadHistoricalData()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                    </svg>
                    Réessayer
                </button>
            </div>
        `;
    }
}

// Render Historical Data with beautiful UI
function renderHistoricalData(data) {
    // If data is a string, try to parse it
    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch (e) {
            return `<div class="alert alert-warning">Format de donnees non reconnu</div>`;
        }
    }
    
    // Check if it's an array of historical data
    if (Array.isArray(data)) {
        // Calculate statistics
        const totalDays = data.length;
        const totalCA = data.reduce((sum, item) => sum + (item.ca || 0), 0);
        const avgCA = totalCA / totalDays;
        const maxCA = Math.max(...data.map(item => item.ca || 0));
        const minCA = Math.min(...data.map(item => item.ca || 0));
        
        // Find best and worst days
        const bestDay = data.find(item => item.ca === maxCA);
        const worstDay = data.find(item => item.ca === minCA);
        
        return `
            <div class="alert alert-info mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <strong>Donnees Historiques</strong> - Analyse des performances passees pour optimiser le stock
            </div>
            
            <!-- Statistics Cards -->
            <div class="row g-3 mb-4">
                <div class="col-md-3">
                    <div class="card border-0 shadow-sm h-100" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        <div class="card-body text-white text-center">
                            <div class="mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                </svg>
                            </div>
                            <h3 class="fw-bold mb-0">${totalDays}</h3>
                            <small class="opacity-75">Jours Analyses</small>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-3">
                    <div class="card border-0 shadow-sm h-100" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                        <div class="card-body text-white text-center">
                            <div class="mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="12" y1="1" x2="12" y2="23"></line>
                                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                </svg>
                            </div>
                            <h3 class="fw-bold mb-0">${totalCA.toLocaleString('fr-FR')}</h3>
                            <small class="opacity-75">CA Total (FCFA)</small>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-3">
                    <div class="card border-0 shadow-sm h-100" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                        <div class="card-body text-white text-center">
                            <div class="mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                                    <polyline points="17 6 23 6 23 12"></polyline>
                                </svg>
                            </div>
                            <h3 class="fw-bold mb-0">${avgCA.toFixed(0).toLocaleString('fr-FR')}</h3>
                            <small class="opacity-75">CA Moyen/Jour</small>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-3">
                    <div class="card border-0 shadow-sm h-100" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
                        <div class="card-body text-white text-center">
                            <div class="mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                                </svg>
                            </div>
                            <h3 class="fw-bold mb-0">${((maxCA - minCA) / avgCA * 100).toFixed(0)}%</h3>
                            <small class="opacity-75">Volatilite</small>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Best and Worst Days -->
            <div class="row g-3 mb-4">
                <div class="col-md-6">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-body">
                            <div class="d-flex align-items-center mb-3">
                                <div class="me-3" style="width: 48px; height: 48px; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                </div>
                                <div>
                                    <h6 class="fw-bold mb-0">Meilleur Jour</h6>
                                    <small class="text-muted">Performance maximale</small>
                                </div>
                            </div>
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <p class="text-muted small mb-1">Date</p>
                                    <p class="fw-bold mb-0">${new Date(bestDay.date).toLocaleDateString('fr-FR', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
                                </div>
                                <div class="text-end">
                                    <p class="text-muted small mb-1">Chiffre d'Affaires</p>
                                    <h4 class="text-success fw-bold mb-0">${maxCA.toLocaleString('fr-FR')} FCFA</h4>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-body">
                            <div class="d-flex align-items-center mb-3">
                                <div class="me-3" style="width: 48px; height: 48px; background: linear-gradient(135deg, #ee0979 0%, #ff6a00 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                                    </svg>
                                </div>
                                <div>
                                    <h6 class="fw-bold mb-0">Jour le Plus Faible</h6>
                                    <small class="text-muted">Opportunite d'amelioration</small>
                                </div>
                            </div>
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <p class="text-muted small mb-1">Date</p>
                                    <p class="fw-bold mb-0">${new Date(worstDay.date).toLocaleDateString('fr-FR', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
                                </div>
                                <div class="text-end">
                                    <p class="text-muted small mb-1">Chiffre d'Affaires</p>
                                    <h4 class="text-warning fw-bold mb-0">${minCA.toLocaleString('fr-FR')} FCFA</h4>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Historical Data Timeline -->
            <div class="card border-0 shadow-sm">
                <div class="card-header bg-white border-0 py-3">
                    <h6 class="fw-bold mb-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                            <line x1="18" y1="20" x2="18" y2="10"></line>
                            <line x1="12" y1="20" x2="12" y2="4"></line>
                            <line x1="6" y1="20" x2="6" y2="14"></line>
                        </svg>
                        Historique Detaille
                    </h6>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle">
                            <thead class="table-light">
                                <tr>
                                    <th>Date</th>
                                    <th>Chiffre d'Affaires</th>
                                    <th>Performance</th>
                                    <th>Visualisation</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.map(item => {
                                    const percentage = (item.ca / maxCA) * 100;
                                    const performanceClass = item.ca >= avgCA ? 'success' : item.ca >= avgCA * 0.5 ? 'warning' : 'danger';
                                    const performanceText = item.ca >= avgCA ? 'Au-dessus' : item.ca >= avgCA * 0.5 ? 'Moyen' : 'En-dessous';
                                    
                                    return `
                                        <tr>
                                            <td>
                                                <div class="d-flex align-items-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2 text-muted">
                                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                                        <line x1="16" y1="2" x2="16" y2="6"></line>
                                                        <line x1="8" y1="2" x2="8" y2="6"></line>
                                                    </svg>
                                                    <strong>${new Date(item.date).toLocaleDateString('fr-FR', {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'})}</strong>
                                                </div>
                                            </td>
                                            <td>
                                                <span class="badge bg-primary px-3 py-2">${item.ca.toLocaleString('fr-FR')} FCFA</span>
                                            </td>
                                            <td>
                                                <span class="badge bg-${performanceClass}">${performanceText}</span>
                                            </td>
                                            <td>
                                                <div class="progress" style="height: 25px;">
                                                    <div class="progress-bar bg-${performanceClass}" role="progressbar" style="width: ${percentage}%" aria-valuenow="${item.ca}" aria-valuemin="0" aria-valuemax="${maxCA}">
                                                        ${percentage.toFixed(0)}%
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }
    
    // If it's not an array, display as formatted text
    return `
        <div class="alert alert-info mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <strong>Donnees Historiques</strong> - Historique complet des ventes et des stocks
        </div>
        <div class="card border-0 shadow-sm">
            <div class="card-body">
                <pre class="mb-0" style="white-space: pre-wrap; word-wrap: break-word;">${JSON.stringify(data, null, 2)}</pre>
            </div>
        </div>
    `;
}
