// Commercial Dashboard Logic for Mokpokpo

const API_URL = 'https://bd-mokpokokpo.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
// Check authentication
const token = localStorage.getItem('token');
if (!token) {
    alert('Vous devez vous connecter pour accéder à cette page.');
    window.location.href = 'commercial-login.html';
    return;
}

    // Check if user is commercial manager
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (currentUser.role !== 'GEST COMMERCIAL') {
        alert('Accès réservé aux gestionnaires commerciaux.');
        window.location.href = 'index.html';
        return;
    }

    // Initialize dashboard
    loadUserInfo();
    initSectionNavigation();
    loadDashboardStats();
    loadRecentActivity();
    
    // Auto-refresh every 30 seconds
    setInterval(() => {
        loadDashboardStats();
        loadRecentActivity();
    }, 30000);
});

// Section Navigation
function initSectionNavigation() {
    const navLinks = document.querySelectorAll('[data-section]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
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
                
                // Scroll to top
                window.scrollTo({ top: 0, behavior: 'smooth' });
                
                // Load section data
                if (sectionId === 'products') {
                    loadProducts();
                } else if (sectionId === 'orders') {
                    loadOrders();
                } else if (sectionId === 'reservations') {
                    loadReservations();
                } else if (sectionId === 'sales') {
                    // Set default dates
                    const today = new Date().toISOString().split('T')[0];
                    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
                    document.getElementById('startDate').value = firstDay;
                    document.getElementById('endDate').value = today;
                } else if (sectionId === 'predictions') {
                    loadSalesPredictions();
                    loadHistoricalData();
                }
            }
        });
    });
}

// Load User Info
function loadUserInfo() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const userNameDisplay = document.getElementById('userNameDisplay');
    
    if (userNameDisplay && currentUser.prenom) {
        userNameDisplay.textContent = currentUser.prenom;
    }
}

// Load Dashboard Stats
async function loadDashboardStats() {
    const token = localStorage.getItem('token');
    
    try {
        // Fetch all necessary data in parallel
        const [ordersResponse, stocksResponse] = await Promise.all([
            fetch(`${API_URL}/commandes/`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_URL}/stocks/`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (ordersResponse.ok) {
            const orders = await ordersResponse.json();
            
            // 1. Pending Orders (Commandes en attente)
            const pendingOrders = orders.filter(o => o.statut === 'EN_ATTENTE');
            animateValue('pendingOrdersCount', 0, pendingOrders.length, 800);
            
            // Update sidebar badge
            const pendingBadge = document.getElementById('pendingOrdersBadge');
            if (pendingBadge) {
                pendingBadge.textContent = pendingOrders.length;
                if (pendingOrders.length > 0) pendingBadge.classList.add('badge-pulse');
                else pendingBadge.classList.remove('badge-pulse');
            }

            // 2. In Delivery (We assume 'VALIDEE' means currently being processed/delivered)
            const inDeliveryOrders = orders.filter(o => o.statut === 'VALIDEE');
            animateValue('inDeliveryCount', 0, inDeliveryOrders.length, 800);

            // 3. Delivered Today (Livrées aujourd'hui)
            // Note: Ideally we would check a 'date_livraison' field.
            // Here we check if status is 'LIVREE' and updated/created today (approximation)
            const today = new Date().toISOString().split('T')[0];
            const deliveredToday = orders.filter(o => {
                // If we tracked update date, we'd use that. For now, check if LIVREE.
                // In a real app, you'd filter by the specific delivery timestamp.
                return o.statut === 'LIVREE' && o.date_commande.startsWith(today); 
            });
            animateValue('deliveredTodayCount', 0, deliveredToday.length, 800);
        }

        if (stocksResponse.ok) {
            const stocks = await stocksResponse.json();
            
            // 4. Critical Stock (Produits critiques)
            // Stock is critical if quantity <= alert threshold OR if expired/expiring soon (J-30)
            const criticalStocks = stocks.filter(s => {
                const isLowStock = s.seuil_alerte && s.quantite_stock <= s.seuil_alerte;
                
                let isExpiringCrucial = false;
                if (s.date_expiration) {
                    const alert = calculateExpirationAlert(s.date_expiration);
                    if (alert.alertLevel >= 3) isExpiringCrucial = true; // Red Alert or Expired
                }

                return isLowStock || isExpiringCrucial;
            });

            animateValue('criticalStockCount', 0, criticalStocks.length, 800);
        }

    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        // Don't show critical error notification for stats to avoid spamming the user
    }
}

// Animate number counting
function animateValue(id, start, end, duration) {
    const element = document.getElementById(id);
    if (!element) return;
    
    const range = end - start;
    const increment = range / (duration / 16); // 60 FPS
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current).toLocaleString('fr-FR');
    }, 16);
}

// Load Recent Activity
async function loadRecentActivity() {
    const token = localStorage.getItem('token');
    const activityContainer = document.getElementById('recentActivity');
    
    try {
        // Get recent orders
        const ordersResponse = await fetch(`${API_URL}/commandes/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        // Get recent reservations
        const reservationsResponse = await fetch(`${API_URL}/reservations/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        // Get recent sales
        const salesResponse = await fetch(`${API_URL}/ventes/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        let activities = [];
        
        if (ordersResponse.ok) {
            const orders = await ordersResponse.json();
            activities.push(...orders.slice(0, 5).map(o => ({
                type: 'order',
                icon: '??',
                color: '#10b981',
                title: `Commande #${o.id_commande}`,
                description: `${o.statut} - ${o.montant_total.toLocaleString('fr-FR')} FCFA`,
                date: new Date(o.date_commande),
                status: o.statut
            })));
        }
        
        if (reservationsResponse.ok) {
            const reservations = await reservationsResponse.json();
            activities.push(...reservations.slice(0, 5).map(r => ({
                type: 'reservation',
                icon: '??',
                color: '#a855f7',
                title: `Réservation #${r.id_reservation}`,
                description: `${r.statut} - quantité: ${r.quantite_reservee}`,
                date: new Date(r.date_reservation),
                status: r.statut
            })));
        }
        
        if (salesResponse.ok) {
            const sales = await salesResponse.json();
            activities.push(...sales.slice(0, 5).map(s => ({
                type: 'sale',
                icon: '??',
                color: '#3b82f6',
                title: `Vente #${s.id_vente}`,
                description: `${s.montant_total.toLocaleString('fr-FR')} FCFA`,
                date: new Date(s.date_vente),
                status: 'COMPLETEE'
            })));
        }
        
        // Sort by date
        activities.sort((a, b) => b.date - a.date);
        activities = activities.slice(0, 10);
        
        if (activities.length === 0) {
            activityContainer.innerHTML = `
                <div class="text-center py-5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="text-muted mb-3">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <p class="text-muted mb-0">Aucune activité récente</p>
                </div>
            `;
            return;
        }
        
        activityContainer.innerHTML = activities.map(activity => {
            const statusBadge = {
                'EN_ATTENTE': 'bg-warning',
                'VALIDEE': 'bg-success',
                'CONFIRMEE': 'bg-success',
                'ANNULEE': 'bg-danger',
                'LIVREE': 'bg-info',
                'COMPLETEE': 'bg-success'
            }[activity.status] || 'bg-secondary';
            
            return `
                <div class="activity-item d-flex align-items-start gap-3 p-3 border-bottom">
                    <div class="activity-icon" style="background: ${activity.color}20; color: ${activity.color};">
                        <span style="font-size: 24px;">${activity.icon}</span>
                    </div>
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h6 class="mb-1 fw-semibold">${activity.title}</h6>
                                <p class="mb-1 text-muted small">${activity.description}</p>
                                <p class="mb-0 text-muted" style="font-size: 0.75rem;">
                                    ${formatRelativeTime(activity.date)}
                                </p>
                            </div>
                            <span class="badge ${statusBadge}">${activity.status}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading recent activity:', error);
        activityContainer.innerHTML = `
            <div class="alert alert-danger mb-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                Erreur lors du chargement de l'activité récente
            </div>
        `;
    }
}

// Format relative time
function formatRelativeTime(date) {
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) return 'à l\'instant';
    if (minutes < 60) return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
    if (hours < 24) return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
    if (days < 7) return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Load Products for Price Management
async function loadProducts() {
    const token = localStorage.getItem('token');
    const productsList = document.getElementById('productsList');
    
    productsList.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="text-muted mt-2">Chargement des produits...</p></div>';
    
    try {
        const response = await fetch(`${API_URL}/produits/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const products = await response.json();
            
            if (products.length === 0) {
                productsList.innerHTML = `
                    <div class="text-center py-5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="text-muted mb-3">
                            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                            <line x1="7" y1="7" x2="7.01" y2="7"></line>
                        </svg>
                        <p class="text-muted">Aucun produit trouvé</p>
                    </div>
                `;
                return;
            }
            
            productsList.innerHTML = `
                <div class="table-responsive">
                    <table class="table table-hover align-middle">
                        <thead class="table-light">
                            <tr>
                                <th>Produit</th>
                                <th>Nom Scientifique</th>
                                <th class="text-center">Prix Actuel</th>
                                <th class="text-center">Nouveau Prix</th>
                                <th class="text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${products.map(product => `
                                <tr class="product-row" data-product-id="${product.id_produit}">
                                    <td>
                                        <div class="d-flex align-items-center gap-2">
                                            <div class="product-avatar">??</div>
                                            <div>
                                                <h6 class="mb-0 fw-semibold">${product.nom_produit}</h6>
                                                <small class="text-muted">ID: ${product.id_produit}</small>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span class="text-muted fst-italic">${product.nom_scientifique || 'Non spécifié'}</span>
                                    </td>
                                    <td class="text-center">
                                        <span class="badge bg-success px-3 py-2 fs-6">${product.prix_unitaire.toLocaleString('fr-FR')} FCFA</span>
                                    </td>
                                    <td class="text-center">
                                        <input type="number" 
                                               class="form-control form-control-sm text-center" 
                                               id="price-${product.id_produit}" 
                                               value="${product.prix_unitaire}" 
                                               min="0" 
                                               step="1"
                                               style="max-width: 150px; margin: 0 auto;">
                                    </td>
                                    <td class="text-center">
                                        <button class="btn btn-primary btn-sm" onclick="updateProductPrice(${product.id_produit})">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                                <polyline points="7 3 7 8 15 8"></polyline>
                                            </svg>
                                            Mettre à jour
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            
        } else {
            throw new Error('Erreur lors du chargement des produits');
        }
    } catch (error) {
        console.error('Error loading products:', error);
        productsList.innerHTML = `
            <div class="alert alert-danger">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                Erreur lors du chargement des produits
            </div>
        `;
    }
}

// Update Product Price
async function updateProductPrice(productId) {
    const token = localStorage.getItem('token');
    const priceInput = document.getElementById(`price-${productId}`);
    const newPrice = parseFloat(priceInput.value);
    
    if (isNaN(newPrice) || newPrice < 0) {
        showNotification('Prix invalide', 'danger');
        return;
    }
    
    // Show loading state
    const row = document.querySelector(`[data-product-id="${productId}"]`);
    const button = row.querySelector('button');
    const originalButtonText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Mise à jour...';
    
    try {
        // Get current product data
        const getResponse = await fetch(`${API_URL}/produits/${productId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!getResponse.ok) throw new Error('Produit non trouvé');
        
        const product = await getResponse.json();
        
        // Update with new price
        const updateResponse = await fetch(`${API_URL}/produits/${productId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...product,
                prix_unitaire: newPrice
            })
        });
        
        if (updateResponse.ok) {
            showNotification(`Prix mis à jour: ${newPrice.toLocaleString('fr-FR')} FCFA`, 'success');
            
            // Update the current price badge
            const badge = row.querySelector('.badge');
            badge.textContent = `${newPrice.toLocaleString('fr-FR')} FCFA`;
            
            // Add success animation
            row.classList.add('table-success');
            setTimeout(() => row.classList.remove('table-success'), 2000);
            
            // Reload products to refresh data
            setTimeout(() => loadProducts(), 2000);
        } else {
            throw new Error('Erreur lors de la mise à jour');
        }
        
    } catch (error) {
        console.error('Error updating price:', error);
        showNotification('Erreur lors de la mise à jour du prix', 'danger');
    } finally {
        // Restore button state
        button.disabled = false;
        button.innerHTML = originalButtonText;
    }
}

// Load Orders
async function loadOrders() {
    const token = localStorage.getItem('token');
    const ordersList = document.getElementById('ordersList');
    
    ordersList.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="text-muted mt-2">Chargement des commandes...</p></div>';
    
    try {
        const [ordersResponse, lignesResponse] = await Promise.all([
            fetch(`${API_URL}/commandes/`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_URL}/ligne-commandes/`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        
        if (ordersResponse.ok) {
            const orders = await ordersResponse.json();
            const lignes = lignesResponse.ok ? await lignesResponse.json() : [];
            
            if (orders.length === 0) {
                ordersList.innerHTML = `
                    <div class="text-center py-5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="text-muted mb-3">
                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                        </svg>
                        <p class="text-muted">Aucune commande trouvée</p>
                    </div>
                `;
                return;
            }
            
            // Sort orders: pending first, then by date
            orders.sort((a, b) => {
                if (a.statut === 'EN_ATTENTE' && b.statut !== 'EN_ATTENTE') return -1;
                if (a.statut !== 'EN_ATTENTE' && b.statut === 'EN_ATTENTE') return 1;
                return new Date(b.date_commande) - new Date(a.date_commande);
            });
            
            ordersList.innerHTML = orders.map(order => {
                const statusBadge = {
                    'EN_ATTENTE': 'bg-warning text-dark',
                    'VALIDEE': 'bg-success',
                    'ANNULEE': 'bg-danger',
                    'LIVREE': 'bg-info'
                }[order.statut] || 'bg-secondary';
                
                const statusText = {
                    'EN_ATTENTE': 'En attente',
                    'VALIDEE': 'validée',
                    'ANNULEE': 'Annulàe',
                    'LIVREE': 'Livràe'
                }[order.statut] || order.statut;
                
                const orderLines = lignes.filter(l => l.id_commande === order.id_commande);
                const itemsCount = orderLines.reduce((sum, l) => sum + (l.quantite || 0), 0);
                
                return `
                    <div class="card mb-3 border order-card ${order.statut === 'EN_ATTENTE' ? 'border-warning' : ''}">
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-8">
                                    <div class="d-flex align-items-start gap-3">
                                        <div class="order-icon">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                                            </svg>
                                        </div>
                                        <div class="flex-grow-1">
                                            <div class="d-flex justify-content-between align-items-start mb-2">
                                                <h5 class="fw-bold mb-0">Commande #${order.id_commande}</h5>
                                                <span class="badge ${statusBadge} px-3 py-2">${statusText}</span>
                                            </div>
                                            <div class="row g-2 mt-2">
                                                <div class="col-md-6">
                                                    <small class="text-muted d-block">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                                                            <circle cx="12" cy="12" r="10"></circle>
                                                            <polyline points="12 6 12 12 16 14"></polyline>
                                                        </svg>
                                                        ${new Date(order.date_commande).toLocaleDateString('fr-FR', {
                                                            day: 'numeric',
                                                            month: 'long',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </small>
                                                </div>
                                                <div class="col-md-6">
                                                    <small class="text-muted d-block">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                                            <circle cx="12" cy="7" r="4"></circle>
                                                        </svg>
                                                        Client #${order.id_utilisateur}
                                                    </small>
                                                </div>
                                            </div>
                                            ${orderLines.length > 0 ? `
                                                <div class="mt-2">
                                                    <small class="text-muted">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                                                            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                                                        </svg>
                                                        ${orderLines.length} article(s) - ${itemsCount} unità(s)
                                                    </small>
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4 text-end d-flex flex-column justify-content-between">
                                    <div>
                                        <h3 class="text-success mb-1">${order.montant_total.toLocaleString('fr-FR')} FCFA</h3>
                                        <small class="text-muted">Montant total</small>
                                    </div>
                                    ${order.statut === 'EN_ATTENTE' ? `
                                        <div class="d-flex gap-2 mt-3 justify-content-end">
                                            <button class="btn btn-outline-primary btn-sm" onclick="viewOrderDetails(${order.id_commande})">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                                                    <circle cx="12" cy="12" r="3"></circle>
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                </svg>
                                            </button>
                                            <button class="btn btn-success btn-sm flex-fill" onclick="updateOrderStatus(${order.id_commande}, 'VALIDEE')">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                </svg>
                                                Accepter
                                            </button>
                                            <button class="btn btn-danger btn-sm flex-fill" onclick="updateOrderStatus(${order.id_commande}, 'ANNULEE')">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                                </svg>
                                                Refuser
                                            </button>
                                        </div>
                                    ` : `
                                        <div class="d-flex gap-2 mt-3 justify-content-end">
                                            <button class="btn btn-outline-primary btn-sm w-100" onclick="viewOrderDetails(${order.id_commande})">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                                                    <circle cx="12" cy="12" r="3"></circle>
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                </svg>
                                                Voir les détails
                                            </button>
                                        </div>
                                    `}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
        } else {
            throw new Error('Erreur lors du chargement des commandes');
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        ordersList.innerHTML = `
            <div class="alert alert-danger">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                Erreur lors du chargement des commandes
            </div>
        `;
    }
}

// Update Order Status
async function updateOrderStatus(orderId, newStatus) {
    const token = localStorage.getItem('token');
    
    if (!confirm(`àtes-vous sàr de vouloir ${newStatus === 'VALIDEE' ? 'accepter' : 'refuser'} cette commande ?`)) {
        return;
    }
    
    try {
        // Get current order
        const getResponse = await fetch(`${API_URL}/commandes/${orderId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!getResponse.ok) throw new Error('Commande non trouvée');
        
        const order = await getResponse.json();
        
        // === GESTION FEFO : DàDUCTION DES STOCKS ===
        if (newStatus === 'VALIDEE') {
            // 1. Ràcupàrer les lignes de commande et les stocks
            const [linesResponse, stocksResponse] = await Promise.all([
                fetch(`${API_URL}/ligne-commandes/`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/stocks/`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (!linesResponse.ok || !stocksResponse.ok) {
                throw new Error('Erreur lors de la ràcupàration des données de stock');
            }

            const allLines = await linesResponse.json();
            const orderLines = allLines.filter(l => l.id_commande === order.id_commande);
            const allStocks = await stocksResponse.json();

            // 2. Vàrifier et dàduire pour chaque produit
            for (const line of orderLines) {
                const productStocks = allStocks.filter(s => s.id_produit === line.id_produit);
                
                // Utilisation de la fonction FEFO implàmentàe plus bas
                const stocksToDeduct = selectStocksForSaleFEFO(productStocks, line.quantite);
                
                // Vàrifier si la quantité trouvée est suffisante
                const totalFound = stocksToDeduct.reduce((acc, s) => acc + s.quantite, 0);
                if (totalFound < line.quantite) {
                    throw new Error(`Stock insuffisant (ou expirà) pour le produit #${line.id_produit}. Demandà: ${line.quantite}, Dispo: ${totalFound}`);
                }

                // Appliquer les dàductions
                for (const deduction of stocksToDeduct) {
                    // Trouver le stock d'origine pour avor les autres propriàtàs
                    const originalStock = allStocks.find(s => s.id_stock === deduction.id_stock);
                    
                    const newQuantity = originalStock.quantite_stock - deduction.quantite;
                    
                    // Mise à jour du stock via API
                    const updateStockResponse = await fetch(`${API_URL}/stocks/${deduction.id_stock}`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            ...originalStock,
                            quantite_stock: newQuantity
                        })
                    });

                    if (!updateStockResponse.ok) {
                        throw new Error(`Erreur lors de la mise à jour du stock #${deduction.id_stock}`);
                    }
                }
            }
        } else if (newStatus === 'ANNULEE' && order.statut === 'VALIDEE') {
            const [linesRes, stocksRes] = await Promise.all([
                fetch(`${API_URL}/ligne-commandes/`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/stocks/`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            if (linesRes.ok && stocksRes.ok) {
                const allLines = await linesRes.json();
                const orderLines = allLines.filter(l => l.id_commande === parseInt(orderId));
                const allStocks = await stocksRes.json();
                for (const line of orderLines) {
                    const productStocks = allStocks.filter(s => s.id_produit === line.id_produit)
                        .sort((a, b) => new Date(b.date_expiration) - new Date(a.date_expiration));
                    if (productStocks.length > 0) {
                        const target = productStocks[0];
                        await fetch(`${API_URL}/stocks/${target.id_stock}`, {
                            method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ...target, quantite_stock: target.quantite_stock + line.quantite })
                        });
                    }
                }
            }
        }
        // ===========================================

        // Update status
        const updateResponse = await fetch(`${API_URL}/commandes/${orderId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...order,
                statut: newStatus
            })
        });
        
        if (updateResponse.ok) {
            showNotification(`Commande ${newStatus === 'VALIDEE' ? 'acceptàe' : 'refusàe'}`, 'success');
            loadOrders();
            loadDashboardStats();
        } else {
            throw new Error('Erreur lors de la mise à jour');
        }
        
    } catch (error) {
        console.error('Error updating order:', error);
        showNotification('Erreur lors de la mise à jour de la commande', 'danger');
    }
}

// View Order Details
async function viewOrderDetails(orderId) {
    const token = localStorage.getItem('token');
    const modalContent = document.getElementById('orderDetailsContent');
    const modalTitle = document.getElementById('orderDetailsTitle');
    
    // Show modal with loading state
    const modal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
    modalContent.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';
    modalTitle.textContent = `Commande #${orderId}`;
    modal.show();

    try {
        const [orderRes, linesRes, productsRes] = await Promise.all([
            fetch(`${API_URL}/commandes/${orderId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_URL}/ligne-commandes/`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_URL}/produits/`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (!orderRes.ok || !linesRes.ok || !productsRes.ok) throw new Error('Erreur de chargement');

        const order = await orderRes.json();
        const allLines = await linesRes.json();
        const products = await productsRes.json();
        
        const orderLines = allLines.filter(l => l.id_commande === parseInt(orderId));

        let html = `
            <div class="row mb-4">
                <div class="col-md-6">
                    <p class="text-muted mb-1">Date</p>
                    <p class="fw-bold">${new Date(order.date_commande).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}</p>
                </div>
                <div class="col-md-6 text-end">
                    <p class="text-muted mb-1">Statut</p>
                    <span class="badge ${order.statut === 'VALIDEE' ? 'bg-success' : (order.statut === 'EN_ATTENTE' ? 'bg-warning text-dark' : 'bg-secondary')}">
                        ${order.statut}
                    </span>
                </div>
            </div>
            
            <h6 class="fw-bold mb-3">Produits commandàs</h6>
            <div class="table-responsive">
                <table class="table align-middle">
                    <thead class="table-light">
                        <tr>
                            <th>Produit</th>
                            <th class="text-center">quantité</th>
                            <th class="text-end">Prix Unitaire</th>
                            <th class="text-end">Total</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        let totalAmount = 0;

        html += orderLines.map(line => {
            const product = products.find(p => p.id_produit === line.id_produit);
            const lineTotal = (line.prix_unitaire || 0) * line.quantite;
            totalAmount += lineTotal;

            return `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="bg-light rounded p-2 me-3">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-secondary">
                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                </svg>
                            </div>
                            <div>
                                <h6 class="mb-0 text-sm">${product ? product.nom_produit : 'Produit inconnu'}</h6>
                                <small class="text-muted">Ref: ${line.id_produit}</small>
                            </div>
                        </div>
                    </td>
                    <td class="text-center fw-bold">${line.quantite}</td>
                    <td class="text-end text-muted">${(line.prix_unitaire || 0).toLocaleString()} FCFA</td>
                    <td class="text-end fw-bold">${lineTotal.toLocaleString()} FCFA</td>
                </tr>
            `;
        }).join('');

        html += `
                    </tbody>
                    <tfoot class="table-light">
                        <tr>
                            <td colspan="3" class="text-end fw-bold">Total Gànàral</td>
                            <td class="text-end fw-bold text-success fs-5">${totalAmount.toLocaleString()} FCFA</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
        
        // Add action buttons if pending
        if (order.statut === 'EN_ATTENTE') {
            html += `
                <div class="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                    <button class="btn btn-danger" onclick="updateOrderStatus(${order.id_commande}, 'ANNULEE'); bootstrap.Modal.getInstance(document.getElementById('orderDetailsModal')).hide();">
                        Refuser la commande
                    </button>
                    <button class="btn btn-success px-4" onclick="updateOrderStatus(${order.id_commande}, 'VALIDEE'); bootstrap.Modal.getInstance(document.getElementById('orderDetailsModal')).hide();">
                        Valider la commande
                    </button>
                </div>
            `;
        }

        modalContent.innerHTML = html;

    } catch (error) {
        console.error('Error loading order details:', error);
        modalContent.innerHTML = '<div class="alert alert-danger">Erreur lors du chargement des détails de la commande.</div>';
    }
}

// Load Reservations
async function loadReservations() {
    const token = localStorage.getItem('token');
    const reservationsList = document.getElementById('reservationsList');
    
    reservationsList.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';
    
    try {
        const response = await fetch(`${API_URL}/reservations/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const reservations = await response.json();
            
            if (reservations.length === 0) {
                reservationsList.innerHTML = '<div class="text-center py-5"><p class="text-muted">Aucune Réservation trouvée</p></div>';
                return;
            }
            
            reservationsList.innerHTML = reservations.map(reservation => {
                const statusBadge = {
                    'EN_ATTENTE': 'bg-warning',
                    'CONFIRMEE': 'bg-success',
                    'ANNULEE': 'bg-danger',
                    'TERMINEE': 'bg-info'
                }[reservation.statut] || 'bg-secondary';
                
                const statusText = {
                    'EN_ATTENTE': 'En attente',
                    'CONFIRMEE': 'Confirmàe',
                    'ANNULEE': 'Annulàe',
                    'TERMINEE': 'Terminàe'
                }[reservation.statut] || reservation.statut;
                
                return `
                    <div class="card mb-3 border">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <div>
                                    <h6 class="fw-bold mb-1">Réservation #${reservation.id_reservation}</h6>
                                    <p class="text-muted small mb-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                            <line x1="16" y1="2" x2="16" y2="6"></line>
                                            <line x1="8" y1="2" x2="8" y2="6"></line>
                                        </svg>
                                        ${new Date(reservation.date_reservation).toLocaleDateString('fr-FR', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </p>
                                </div>
                                <span class="badge ${statusBadge} px-3 py-2">${statusText}</span>
                            </div>
                            
                            <div class="mb-3">
                                <p class="fw-bold mb-2">Client: <span class="text-muted fw-normal">Client #${reservation.id_client}</span></p>
                                <p class="fw-bold mb-2">Produit: <span class="text-muted fw-normal">Produit #${reservation.id_produit}</span></p>
                                <p class="fw-bold mb-0">quantité: <span class="text-primary">${reservation.quantite_reservee}</span></p>
                            </div>
                            
                            ${reservation.statut === 'EN_ATTENTE' ? `
                                <div class="d-flex gap-2">
                                    <button class="btn btn-success btn-sm" onclick="updateReservationStatus(${reservation.id_reservation}, 'CONFIRMEE')">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                        Accepter
                                    </button>
                                    <button class="btn btn-danger btn-sm" onclick="updateReservationStatus(${reservation.id_reservation}, 'ANNULEE')">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                        Refuser
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');
            
        } else {
            throw new Error('Erreur lors du chargement des Réservations');
        }
    } catch (error) {
        console.error('Error loading reservations:', error);
        reservationsList.innerHTML = '<div class="alert alert-danger">Erreur lors du chargement des Réservations</div>';
    }
}

// Update Reservation Status
async function updateReservationStatus(reservationId, newStatus) {
    const token = localStorage.getItem('token');
    
    if (!confirm(`àtes-vous sàr de vouloir ${newStatus === 'CONFIRMEE' ? 'accepter' : 'refuser'} cette Réservation ?`)) {
        return;
    }
    
    try {
        // Get current reservation
        const getResponse = await fetch(`${API_URL}/reservations/${reservationId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!getResponse.ok) throw new Error('Réservation non trouvée');
        
        const reservation = await getResponse.json();
        
        // Update status
        const updateResponse = await fetch(`${API_URL}/reservations/${reservationId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...reservation,
                statut: newStatus
            })
        });
        
        if (updateResponse.ok) {
            showNotification(`Réservation ${newStatus === 'CONFIRMEE' ? 'acceptàe' : 'refusàe'}`, 'success');
            loadReservations();
            loadDashboardStats();
        } else {
            throw new Error('Erreur lors de la mise à jour');
        }
        
    } catch (error) {
        console.error('Error updating reservation:', error);
        showNotification('Erreur lors de la mise à jour de la Réservation', 'danger');
    }
}

// Load Sales Statistics
async function loadSalesStats() {
    const token = localStorage.getItem('token');
    const salesStatsList = document.getElementById('salesStatsList');
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) {
        showNotification('Veuillez Sélectionner les dates', 'warning');
        return;
    }
    
    salesStatsList.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';
    
    try {
        const response = await fetch(`${API_URL}/ventes/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const ventes = await response.json();
            
            // Filter by date range
            const filteredVentes = ventes.filter(v => {
                const vDate = new Date(v.date_vente);
                return vDate >= new Date(startDate) && vDate <= new Date(endDate);
            });
            
            if (filteredVentes.length === 0) {
                salesStatsList.innerHTML = '<div class="text-center py-5"><p class="text-muted">Aucune vente pour cette pàriode</p></div>';
                return;
            }
            
            // Calculate stats
            const totalSales = filteredVentes.reduce((sum, v) => sum + v.montant_total, 0);
            const totalQuantity = filteredVentes.reduce((sum, v) => sum + v.quantite_vendue, 0);
            
            salesStatsList.innerHTML = `
                <div class="row g-4 mb-4">
                    <div class="col-md-4">
                        <div class="card border-0 shadow-sm">
                            <div class="card-body text-center">
                                <h3 class="text-primary mb-0">${filteredVentes.length}</h3>
                                <p class="text-muted mb-0">Ventes</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card border-0 shadow-sm">
                            <div class="card-body text-center">
                                <h3 class="text-success mb-0">${totalSales.toLocaleString('fr-FR')} FCFA</h3>
                                <p class="text-muted mb-0">Chiffre d'affaires</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card border-0 shadow-sm">
                            <div class="card-body text-center">
                                <h3 class="text-info mb-0">${totalQuantity}</h3>
                                <p class="text-muted mb-0">Unitàs vendues</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>ID Vente</th>
                                <th>Date</th>
                                <th>quantité</th>
                                <th>Montant Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredVentes.map(vente => `
                                <tr>
                                    <td>#${vente.id_vente}</td>
                                    <td>${new Date(vente.date_vente).toLocaleDateString('fr-FR')}</td>
                                    <td>${vente.quantite_vendue}</td>
                                    <td class="text-success fw-bold">${vente.montant_total.toLocaleString('fr-FR')} FCFA</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            
        } else {
            throw new Error('Erreur lors du chargement des statistiques');
        }
    } catch (error) {
        console.error('Error loading sales stats:', error);
        salesStatsList.innerHTML = '<div class="alert alert-danger">Erreur lors du chargement des statistiques</div>';
    }
}

// Show Notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} position-fixed top-0 start-50 translate-middle-x mt-3 shadow-lg animate__animated animate__fadeInDown`;
    notification.style.zIndex = '9999';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('animate__fadeOutUp');
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// ===================================
// PREDICTIONS - COMMERCIAL CAN SEE SALES PREDICTIONS
// ===================================

// Load Sales Predictions
async function loadSalesPredictions() {
    const token = localStorage.getItem('token');
    const container = document.getElementById('salesPredictionsList');
    
    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="text-muted mt-2">Chargement des predictions de ventes...</p></div>';
    
    try {
        const response = await fetch(`${API_URL}/predictions/sales`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Erreur lors du chargement des predictions');
        }
        
        const data = await response.json();
        
        // Parse and display sales predictions beautifully
        container.innerHTML = renderSalesPredictions(data);
        
    } catch (error) {
        console.error('Error loading sales predictions:', error);
        container.innerHTML = `
            <div class="alert alert-danger">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <strong>Erreur :</strong> ${error.message}
            </div>
            <div class="text-center py-3">
                <button class="btn btn-primary" onclick="loadSalesPredictions()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                    </svg>
                    Reessayer
                </button>
            </div>
        `;
    }
}

// Render Sales Predictions with beautiful UI
function renderSalesPredictions(data) {
    // If data is a string, try to parse it
    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch (e) {
            return `<div class="alert alert-warning">Format de donnees non reconnu</div>`;
        }
    }
    
    // Check if it has the expected structure
    if (data && typeof data === 'object') {
        const forecast = data.forecast_7_days || 0;
        const trends = data.trends || 'Aucune tendance disponible';
        const recommendations = data.recommendations || [];
        const analysisText = data.analysis_text || 'Aucune analyse disponible';
        
        return `
            <div class="alert alert-info mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <strong>Predictions IA</strong> - Analyse predictive basee sur l'historique des ventes et les tendances du marche
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
                                    <h6 class="mb-1 opacity-75">Prevision pour les 7 Prochains Jours</h6>
                                    <h2 class="fw-bold mb-0">${forecast.toLocaleString('fr-FR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} FCFA</h2>
                                </div>
                            </div>
                            <p class="mb-0 opacity-90">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                Chiffre d'affaires estime base sur les tendances actuelles
                            </p>
                        </div>
                        <div class="col-md-4 text-center">
                            <div style="width: 120px; height: 120px; margin: 0 auto; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                                <div style="font-size: 2.5rem;">??</div>
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
                        <p class="mb-0" style="line-height: 1.8;">${trends}</p>
                    </div>
                </div>
            </div>
            
            <!-- Recommendations -->
            ${recommendations.length > 0 ? `
                <div class="card border-0 shadow-sm mb-4">
                    <div class="card-header bg-white border-0 py-3">
                        <h6 class="fw-bold mb-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                                <path d="M2 17l10 5 10-5M2 12l10 5 10-5"></path>
                            </svg>
                            Recommandations Strategiques
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
                        Rapport d'Analyse Detaille
                    </h6>
                </div>
                <div class="card-body">
                    <div class="alert alert-light border-start border-4 border-info">
                        <p class="mb-0" style="line-height: 1.8;">${analysisText}</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    // If it's not the expected format, display as formatted text
    return `
        <div class="alert alert-info mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <strong>Predictions de Ventes</strong> - Analyse predictive generee par IA
        </div>
        <div class="card border-0 shadow-sm">
            <div class="card-body">
                <pre class="mb-0" style="white-space: pre-wrap; word-wrap: break-word;">${JSON.stringify(data, null, 2)}</pre>
            </div>
        </div>
    `;
}

// Load Historical Data
async function loadHistoricalData() {
    const token = localStorage.getItem('token');
    const container = document.getElementById('historicalDataList');
    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="text-muted mt-2">Chargement des données historiques...</p></div>';
    
    try {
        const response = await fetch(`${API_URL}/predictions/historical-data`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Erreur lors du chargement des données historiques');
        }
        
        const data = await response.json();
        
        // Parse and display historical data
        container.innerHTML = renderHistoricalData(data);
        
    } catch (error) {
        console.error('Error loading historical data:', error);
        container.innerHTML = `
            <div class="alert alert-danger">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <strong>Erreur :</strong> ${error.message}
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
    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch (e) {
            return `<div class="alert alert-warning">Format de données non reconnu</div>`;
        }
    }
    
    if (Array.isArray(data)) {
        const totalDays = data.length;
        const totalCA = data.reduce((sum, item) => sum + (item.ca || 0), 0);
        const avgCA = totalDays > 0 ? totalCA / totalDays : 0;
        const maxCA = data.length > 0 ? Math.max(...data.map(item => item.ca || 0)) : 0;
        const minCA = data.length > 0 ? Math.min(...data.map(item => item.ca || 0)) : 0;
        
        const bestDay = data.find(item => item.ca === maxCA) || {};
        const worstDay = data.find(item => item.ca === minCA) || {};
        
        return `
            <div class="alert alert-info mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <strong>données Historiques</strong> - Analyse des performances passées pour optimiser le stock
            </div>
            
            <div class="row g-3 mb-4">
                <div class="col-md-3">
                    <div class="card border-0 shadow-sm h-100" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        <div class="card-body text-white text-center">
                            <h3 class="fw-bold mb-0">${totalDays}</h3>
                            <small class="opacity-75">Jours Analysàs</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card border-0 shadow-sm h-100" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                        <div class="card-body text-white text-center">
                            <h3 class="fw-bold mb-0">${totalCA.toLocaleString('fr-FR')}</h3>
                            <small class="opacity-75">CA Total (FCFA)</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card border-0 shadow-sm h-100" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                        <div class="card-body text-white text-center">
                            <h3 class="fw-bold mb-0">${avgCA.toFixed(0).toLocaleString('fr-FR')}</h3>
                            <small class="opacity-75">CA Moyen/Jour</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card border-0 shadow-sm h-100" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
                        <div class="card-body text-white text-center">
                            <h3 class="fw-bold mb-0">${avgCA > 0 ? ((maxCA - minCA) / avgCA * 100).toFixed(0) : 0}%</h3>
                            <small class="opacity-75">Volatilité</small>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row g-3 mb-4">
                <div class="col-md-6">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-body">
                            <h6 class="fw-bold mb-3">Meilleur Jour</h6>
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <p class="text-muted small mb-1">Date</p>
                                    <p class="fw-bold mb-0">${bestDay.date ? new Date(bestDay.date).toLocaleDateString('fr-FR', {day: 'numeric', month: 'long', year: 'numeric'}) : '-'}</p>
                                </div>
                                <div class="text-end">
                                    <p class="text-muted small mb-1">Chiffre d'Affaires</p>
                                    <h4 class="text-success fw-bold mb-0">${maxCA.toLocaleString('fr-FR')} FCFA</h4>
                                </div>
                            </div                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-body">
                            <h6 class="fw-bold mb-3">Jour le Plus Faible</h6>
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <p class="text-muted small mb-1">Date</p>
                                    <p class="fw-bold mb-0">${worstDay.date ? new Date(worstDay.date).toLocaleDateString('fr-FR', {day: 'numeric', month: 'long', year: 'numeric'}) : '-'}</p>
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

            <div class="card border-0 shadow-sm">
                <div class="card-header bg-white border-0 py-3">
                    <h6 class="fw-bold mb-0">Historique détaillé</h6>
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
                                    const percentage = maxCA > 0 ? (item.ca / maxCA) * 100 : 0;
                                    const performanceClass = item.ca >= avgCA ? 'success' : item.ca >= avgCA * 0.5 ? 'warning' : 'danger';
                                    const performanceText = item.ca >= avgCA ? 'Au-dessus' : item.ca >= avgCA * 0.5 ? 'Moyen' : 'En-dessous';
                                    
                                    return `
                                        <tr>
                                            <td><strong>${new Date(item.date).toLocaleDateString('fr-FR', {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'})}</strong></td>
                                            <td><span class="badge bg-primary px-3 py-2">${item.ca.toLocaleString('fr-FR')} FCFA</span></td>
                                            <td><span class="badge bg-${performanceClass}">${performanceText}</span></td>
                                            <td>
                                                <div class="progress" style="height: 25px;">
                                                    <div class="progress-bar bg-${performanceClass}" role="progressbar" style="width: ${percentage}%">
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
    
    return `
        <div class="alert alert-info mb-4">données Historiques - Historique complet des ventes</div>
        <div class="card border-0 shadow-sm">
            <div class="card-body">
                <pre class="mb-0">${JSON.stringify(data, null, 2)}</pre>
            </div>
        </div>
    `;
}

