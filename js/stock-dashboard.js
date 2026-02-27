// Stock Dashboard Logic for Mokpokpo

const API_URL = 'https://bd-mokpokokpo.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
// Check authentication
const token = localStorage.getItem('token');
if (!token) {
    alert('Vous devez vous connecter pour accéder à cette page.');
    window.location.href = 'stock-login.html';
    return;
}

    // Check if user is stock manager
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (currentUser.role !== 'GEST_STOCK') {
        alert('Accès réservé aux gestionnaires de stock.');
        window.location.href = 'index.html';
        return;
    }

    // Initialize dashboard
    loadUserInfo();
    initSectionNavigation();
    loadDashboardStats();
    loadProductsForHarvest();
    initHarvestForm();
    
    // Auto-refresh every 30 seconds
    setInterval(() => {
        loadDashboardStats();
        
        // Refresh current section
        const activeSection = document.querySelector('.list-group-item-action.active');
        if (activeSection) {
            const sectionId = activeSection.getAttribute('data-section');
            if (sectionId === 'stocks') loadStocks();
            else if (sectionId === 'alerts') loadAlerts();
        }
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
                if (sectionId === 'stocks') {
                    loadStocks();
                } else if (sectionId === 'movements') {
                    loadMovements();
                } else if (sectionId === 'alerts') {
                    loadAlerts();
                } else if (sectionId === 'predictions') {
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
        // Load stocks
        const stocksResponse = await fetch(`${API_URL}/stocks/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (stocksResponse.ok) {
            const stocks = await stocksResponse.json();
            
            // Count stocked products
            const stockedProducts = stocks.filter(s => s.quantite_stock > 0);
            animateValue('totalStockedProducts', 0, stockedProducts.length, 800);
            
            // Count alerts (products with low stock)
            const alerts = stocks.filter(s => s.seuil_alerte && s.quantite_stock <= s.seuil_alerte);
            animateValue('totalAlerts', 0, alerts.length, 800);
            document.getElementById('alertsBadge').textContent = alerts.length;
            
            // Add pulse animation to alerts badge if there are alerts
            const alertsBadge = document.getElementById('alertsBadge');
            if (alerts.length > 0) {
                alertsBadge.classList.add('badge-pulse');
            } else {
                alertsBadge.classList.remove('badge-pulse');
            }
        }

        // Calculate monthly stock movements from commandes and ventes
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        // Get sales (sorties)
        const ventesResponse = await fetch(`${API_URL}/ventes/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (ventesResponse.ok) {
            const ventes = await ventesResponse.json();
            const monthlyExits = ventes.filter(v => {
                const vDate = new Date(v.date_vente);
                return vDate.getMonth() === currentMonth && vDate.getFullYear() === currentYear;
            }).reduce((sum, v) => sum + (v.quantite_vendue || 0), 0);
            
            animateValue('monthlyExits', 0, monthlyExits, 800);
        }
        
        // Estimate entries based on current stock levels
        // In a real app, you'd have a dedicated endpoint for this
        const totalStock = stocks.reduce((sum, s) => sum + s.quantite_stock, 0);
        animateValue('monthlyEntries', 0, Math.floor(totalStock * 0.15), 800); // Estimated
        
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showNotification('Erreur lors du chargement des statistiques', 'danger');
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
        element.textContent = Math.floor(current);
    }, 16);
}

// Load Stocks
async function loadStocks() {
    const token = localStorage.getItem('token');
    const stocksList = document.getElementById('stocksList');
    
    stocksList.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="text-muted mt-2">Chargement des stocks...</p></div>';
    
    try {
        const [stocksResponse, productsResponse] = await Promise.all([
            fetch(`${API_URL}/stocks/`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_URL}/produits/`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        
        if (!stocksResponse.ok) throw new Error('Erreur lors du chargement');
        
        const stocks = await stocksResponse.json();
        const products = productsResponse.ok ? await productsResponse.json() : [];
        
        if (stocks.length === 0) {
            stocksList.innerHTML = `
                <div class="text-center py-5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="text-muted mb-3">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    </svg>
                    <p class="text-muted">Aucun stock trouvé</p>
                </div>
            `;
            return;
        }
        
        // Sort stocks: alerts first, then FEFO (First Expired First Out), then by quantity
        stocks.sort((a, b) => {
            const aIsAlert = a.seuil_alerte && a.quantite_stock <= a.seuil_alerte;
            const bIsAlert = b.seuil_alerte && b.quantite_stock <= b.seuil_alerte;
            
            // Priority 1: Low Stock Alerts
            if (aIsAlert && !bIsAlert) return -1;
            if (!aIsAlert && bIsAlert) return 1;

            // Priority 2: Expiration Date (FEFO)
            if (a.date_expiration && b.date_expiration) {
                return new Date(a.date_expiration) - new Date(b.date_expiration);
            }
            if (a.date_expiration) return -1;
            if (b.date_expiration) return 1;

            // Priority 3: Quantity (descending)
            return b.quantite_stock - a.quantite_stock;
        });
        
        stocksList.innerHTML = stocks.map(stock => {
            const product = products.find(p => p.id_produit === stock.id_produit);
            const productName = product ? product.nom_produit : `Produit #${stock.id_produit}`;
            const productScientific = product ? product.nom_scientifique : '';
            
            // Calculate expiration status
            let expirationBadge = '';
            let isExpired = false;
            let expirationText = 'N/A';
            
            if (stock.date_expiration) {
                const expirationDate = new Date(stock.date_expiration);
                const today = new Date();
                const diffTime = expirationDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                expirationText = expirationDate.toLocaleDateString();
                
                if (diffDays <= 0) {
                    isExpired = true;
                    expirationBadge = '<span class="badge bg-dark ms-2">Expiré (Vente Bloquàe)</span>';
                } else if (diffDays <= 30) {
                    expirationBadge = `<span class="badge bg-danger ms-2">Expire dans ${diffDays}j</span>`;
                } else if (diffDays <= 60) {
                    expirationBadge = `<span class="badge bg-warning text-dark ms-2">Expire dans ${diffDays}j</span>`;
                } else if (diffDays <= 90) {
                    expirationBadge = `<span class="badge bg-warning text-dark bg-opacity-50 ms-2">Expire dans ${diffDays}j</span>`;
                }
            }

            // Calculate stock level percentage
            const maxStock = stock.seuil_alerte * 3 || 100;
            const stockPercentage = Math.min((stock.quantite_stock / maxStock) * 100, 100);
            
            let statusColor = 'success';
            let statusIcon = '?';
            let statusText = 'Stock Normal';
            let cardBorder = '';
            
            if (isExpired) {
                statusColor = 'dark'; // Expired override
                statusIcon = '?';
                statusText = 'Lot Expiré';
                cardBorder = 'border-dark bg-light text-muted';
            } else if (stock.quantite_stock === 0) {
                statusColor = 'danger';
                statusIcon = '?';
                statusText = 'Rupture de Stock';
                cardBorder = 'border-danger';
            } else if (stock.seuil_alerte && stock.quantite_stock <= stock.seuil_alerte) {
                statusColor = 'danger';
                statusIcon = '??';
                statusText = 'Stock Critique';
                cardBorder = 'border-warning';
            } else if (stock.seuil_alerte && stock.quantite_stock <= stock.seuil_alerte * 1.5) {
                statusColor = 'warning';
                statusIcon = '?';
                statusText = 'Stock Faible';
            }
            
            return `
                <div class="card mb-3 border stock-card ${cardBorder}">
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-7">
                                <div class="d-flex align-items-start gap-3">
                                    <div class="stock-icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                        </svg>
                                    </div>
                                    <div class="flex-grow-1">
                                        <div class="d-flex justify-content-between align-items-start mb-2">
                                            <div>
                                                <h5 class="fw-bold mb-0">?? ${productName} ${expirationBadge}</h5>
                                                ${productScientific ? `<p class="text-muted fst-italic small mb-0">${productScientific}</p>` : ''}
                                                <p class="text-muted small mb-0">ID Stock: ${stock.id_stock} | Exp: ${expirationText}</p>
                                            </div>
                                        </div>
                                        <div class="mt-3">
                                            <div class="d-flex justify-content-between align-items-center mb-1">
                                                <small class="text-muted">Niveau de stock</small>
                                                <small class="fw-semibold text-${statusColor}">${Math.round(stockPercentage)}%</small>
                                            </div>
                                            <div class="progress" style="height: 10px;">
                                                <div class="progress-bar bg-${statusColor}" role="progressbar" 
                                                     style="width: ${stockPercentage}%; transition: width 0.6s ease;" 
                                                     aria-valuenow="${stock.quantite_stock}" 
                                                     aria-valuemin="0" 
                                                     aria-valuemax="${maxStock}"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-5">
                                <div class="row g-3 h-100">
                                    <div class="col-6">
                                        <div class="text-center p-3 bg-light rounded">
                                            <h3 class="fw-bold text-primary mb-1">${stock.quantite_stock}</h3>
                                            <p class="text-muted small mb-0">En Stock</p>
                                        </div>
                                    </div>
                                    <div class="col-6">
                                        <div class="text-center p-3 bg-light rounded">
                                            <h3 class="fw-bold text-secondary mb-1">${stock.seuil_alerte || 'N/A'}</h3>
                                            <p class="text-muted small mb-0">Seuil Alerte</p>
                                        </div>
                                    </div>
                                    <div class="col-12">
                                        <div class="d-flex align-items-center justify-content-between p-2 bg-${statusColor} bg-opacity-10 rounded">
                                            <span>${statusIcon} <strong>${statusText}</strong></span>
                                            ${statusColor !== 'success' ? `
                                                <button class="btn btn-sm btn-${statusColor}" onclick="goToRestock(${stock.id_produit})">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                                    </svg>
                                                    Réapprovisionner
                                                </button>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading stocks:', error);
        stocksList.innerHTML = `
            <div class="alert alert-danger">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                Erreur lors du chargement des stocks
            </div>
        `;
    }
}

// Go to restock section with product pre-selected
function goToRestock(productId) {
    document.querySelector('[data-section="harvest"]').click();
    setTimeout(() => {
        document.getElementById('harvestProduct').value = productId;
        document.getElementById('movementType').value = 'ENTREE';
        document.getElementById('harvestQuantity').focus();
    }, 300);
}

// Load Products for Harvest Form
async function loadProductsForHarvest() {
    const token = localStorage.getItem('token');
    const select = document.getElementById('harvestProduct');
    
    try {
        const response = await fetch(`${API_URL}/produits`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const products = await response.json();
            
            select.innerHTML = '<option value="">Sélectionner un produit...</option>' + 
                products.map(p => `<option value="${p.id_produit}">${p.nom_produit}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Initialize Harvest Form
function initHarvestForm() {
    const form = document.getElementById('harvestForm');
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const token = localStorage.getItem('token');
        const productId = parseInt(document.getElementById('harvestProduct').value);
        const quantity = parseInt(document.getElementById('harvestQuantity').value);
        const movementType = document.getElementById('movementType').value);
        
        if (!productId || !quantity) {
            showNotification('Veuillez remplir tous les champs', 'warning');
            return;
        }
        
        if (quantity < 1) {
            showNotification('La quantité doit àtre supérieure à 0', 'warning');
            return;
        }
        
        // Show loading state\n        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Enregistrement...';
        
        try {
            // Get or create stock for this product
            const stocksResponse = await fetch(`${API_URL}/stocks/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!stocksResponse.ok) throw new Error('Erreur lors de la vérification du stock');
            
            const stocks = await stocksResponse.json();
            let stock = stocks.find(s => s.id_produit === productId);
            
            if (!stock) {
                // Create new stock entry
                const createResponse = await fetch(`${API_URL}/stocks/`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        id_produit: productId,
                        quantite_stock: movementType === 'ENTREE' ? quantity : 0,
                        seuil_alerte: 10,
                        date_derniere_maj: new Date().toISOString()
                    })
                });
                
                if (!createResponse.ok) {
                    const error = await createResponse.text();
                    throw new Error('Erreur lors de la création du stock: ' + error);
                }
                
                stock = await createResponse.json();
                showNotification(`? Stock créé avec succàs: ${quantity} unitàs ajoutées`, 'success');
            } else {
                // Update existing stock
                const newQuantity = movementType === 'ENTREE' 
                    ? stock.quantite_stock + quantity 
                    : Math.max(0, stock.quantite_stock - quantity);
                
                if (movementType === 'SORTIE' && quantity > stock.quantite_stock) {
                    showNotification('?? quantité insuffisante en stock', 'warning');
                    return;
                }
                
                const updateResponse = await fetch(`${API_URL}/stocks/${stock.id_stock}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        ...stock,
                        quantite_stock: newQuantity,
                        date_derniere_maj: new Date().toISOString()
                    })
                });
                
                if (!updateResponse.ok) {
                    const error = await updateResponse.text();
                    throw new Error('Erreur lors de la mise à jour du stock: ' + error);
                }
                
                const movementTypeText = movementType === 'ENTREE' ? 'ajoutées' : 'retirées';
                const newStockText = newQuantity === 0 ? ' ?? Stock épuisé!' : ` (Stock: ${newQuantity})`;
                showNotification(`? ${quantity} unitàs ${movementTypeText}${newStockText}`, 'success');
            }
            
            // Reset form and reload data
            form.reset();
            loadDashboardStats();
            
            // Show success animation
            form.classList.add('animate__animated', 'animate__pulse');
            setTimeout(() => {
                form.classList.remove('animate__animated', 'animate__pulse');
            }, 1000);
            
        } catch (error) {
            console.error('Error recording movement:', error);
            showNotification('? Erreur lors de l\'enregistrement: ' + error.message, 'danger');
        } finally {
            // Restore button state
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    });
}

// Load Movements (Mock implementation - requires movement history endpoint)
function loadMovements() {
    const movementsList = document.getElementById('movementsList');
    
    movementsList.innerHTML = `
        <div class="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            L'historique détaillé des mouvements sera disponible prochainement.
        </div>
        <div class="text-center py-5">
            <p class="text-muted">Utilisez la section "Enregistrer Récolte" pour ajouter de nouveaux mouvements de stock.</p>
        </div>
    `;
}

// Load Alerts
async function loadAlerts() {
    const token = localStorage.getItem('token');
    const alertsList = document.getElementById('alertsList');
    
    alertsList.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';
    
    try {
        // Get stocks with low levels
        const stocksResponse = await fetch(`${API_URL}/stocks/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!stocksResponse.ok) throw new Error('Erreur lors du chargement');
        
        const stocks = await stocksResponse.json();
        const lowStocks = stocks.filter(s => s.seuil_alerte && s.quantite_stock <= s.seuil_alerte);
        
        // Get products details
        const productsResponse = await fetch(`${API_URL}/produits`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const products = productsResponse.ok ? await productsResponse.json() : [];
        
        if (lowStocks.length === 0) {
            alertsList.innerHTML = `
                <div class="alert alert-success">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Aucune alerte de stock bas. Tous les stocks sont à des niveaux normaux !
                </div>
            `;
            return;
        }
        
        alertsList.innerHTML = lowStocks.map(stock => {
            const product = products.find(p => p.id_produit === stock.id_produit);
            const productName = product ? product.nom_produit : `Produit #${stock.id_produit}`;
            
            const urgency = stock.quantite_stock === 0 ? 'danger' : 
                           stock.quantite_stock < stock.seuil_alerte / 2 ? 'danger' : 'warning';
            
            return `
                <div class="alert alert-${urgency} d-flex align-items-center mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-3">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <div class="flex-grow-1">
                        <h6 class="mb-1 fw-bold">${productName}</h6>
                        <p class="mb-0">
                            Stock actuel: <strong>${stock.quantite_stock}</strong> unitàs
                            ${stock.quantite_stock === 0 ? ' - <strong>RUPTURE DE STOCK</strong>' : ''}
                        </p>
                        <p class="mb-0 small">Seuil d'alerte: ${stock.seuil_alerte} unitàs</p>
                    </div>
                    <button class="btn btn-outline-${urgency === 'danger' ? 'danger' : 'warning'} btn-sm" 
                            onclick="document.querySelector('[data-section=harvest]').click()">
                        Réapprovisionner
                    </button>
                </div>
            `;
        }).join('');
        
        // Also create or update alerts in database
        for (const stock of lowStocks) {
            try {
                const product = products.find(p => p.id_produit === stock.id_produit);
                await fetch(`${API_URL}/alertes-stock/`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        id_produit: stock.id_produit,
                        seuil: stock.seuil_alerte,
                        message: `Stock bas pour ${product ? product.nom_produit : 'produit #' + stock.id_produit}`
                    })
                });
            } catch (error) {
                console.error('Error creating alert:', error);
            }
        }
        
    } catch (error) {
        console.error('Error loading alerts:', error);
        alertsList.innerHTML = '<div class="alert alert-danger">Erreur lors du chargement des alertes</div>';
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
// PREDICTIONS - STOCK MANAGER CAN SEE HISTORICAL DATA
// ===================================

// Load Historical Data
async function loadHistoricalData() {
    const token = localStorage.getItem('token');
    const container = document.getElementById('historicalDataList');
    
    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="text-muted mt-2">Chargement des donnees historiques...</p></div>';
    
    try {
        const response = await fetch(`${API_URL}/predictions/historical-data`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Erreur lors du chargement des donnees historiques');
        }
        
        const data = await response.json();
        
        // Parse and display historical data beautifully
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
                    Reessayer
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
                                    <h6 class="mb-0 fw-bold">Meilleur Jour</h6>
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
                                    <h6 class="mb-0 fw-bold">Jour le Plus Faible</h6>
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

// Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    window.location.href = 'stock-login.html';
}
