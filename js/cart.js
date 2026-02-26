// Cart Page Logic

document.addEventListener('DOMContentLoaded', () => {
    loadCartPage();
    updateCartCount();
});

function loadCartPage() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const cartContainer = document.querySelector('.col-lg-8 .card-body');
    const checkoutBtn = document.querySelector('.btn-dark');
    
    if (cart.length === 0) {
        // Show empty state (already in HTML)
        if (checkoutBtn) checkoutBtn.disabled = true;
        updateCartSummary(0);
        return;
    }
    
    // Build cart HTML
    let cartHTML = '<div class="cart-items">';
    
    cart.forEach(item => {
        cartHTML += `
            <div class="cart-item mb-3 pb-3 border-bottom">
                <div class="row align-items-center">
                    <div class="col-md-2">
                        <img src="${item.image}" alt="${item.name}" class="img-fluid rounded" style="width: 100%; height: 80px; object-fit: cover;">
                    </div>
                    <div class="col-md-4">
                        <h6 class="fw-bold mb-1">${item.name}</h6>
                        <p class="text-muted small mb-0">${item.price.toLocaleString()} FCFA / unité</p>
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
                        <button class="btn btn-outline-danger btn-sm" onclick="removeFromCartPage(${item.id})">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    cartHTML += '</div>';
    cartHTML += `
        <div class="mt-4">
            <button class="btn btn-outline-danger" onclick="clearCartPage()">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                Vider le panier
            </button>
        </div>
    `;
    
    cartContainer.innerHTML = cartHTML;
    
    // Update summary
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    updateCartSummary(total);
    
    // Enable checkout button
    if (checkoutBtn) {
        checkoutBtn.disabled = false;
        checkoutBtn.onclick = proceedToCheckoutFromCart;
    }
}

function updateCartSummary(total) {
    const subtotalElements = document.querySelectorAll('.card-body .d-flex:first-of-type span:last-child');
    const totalElements = document.querySelectorAll('.h5.text-success');
    
    if (subtotalElements.length > 0) {
        subtotalElements[0].textContent = `${total.toLocaleString()} FCFA`;
    }
    
    totalElements.forEach(el => {
        el.textContent = `${total.toLocaleString()} FCFA`;
    });
}

function updateCartQuantity(productId, newQuantity) {
    if (newQuantity < 1) return;
    
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const itemIndex = cart.findIndex(item => item.id === productId);
    
    if (itemIndex !== -1) {
        cart[itemIndex].quantity = newQuantity;
        localStorage.setItem('cart', JSON.stringify(cart));
        loadCartPage();
        updateCartCount();
    }
}

function removeFromCartPage(productId) {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    
    loadCartPage();
    updateCartCount();
    showCartNotification('Produit retiré du panier', 'info');
}

function clearCartPage() {
    if (confirm('Êtes-vous sûr de vouloir vider votre panier ?')) {
        localStorage.setItem('cart', JSON.stringify([]));
        loadCartPage();
        updateCartCount();
        showCartNotification('Panier vidé', 'info');
    }
}

function proceedToCheckoutFromCart() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        if (confirm('Vous devez être connecté pour passer une commande. Voulez-vous vous connecter maintenant ?')) {
            window.location.href = 'login.html';
        }
        return;
    }
    
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    if (cart.length === 0) {
        showCartNotification('Votre panier est vide', 'warning');
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
    showCartNotification('Commande passée avec succès !', 'success');
    
    // Redirect to dashboard after 2 seconds
    setTimeout(() => {
        window.location.href = 'dashboard.html#orders';
    }, 2000);
}

function showCartNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} position-fixed top-0 start-50 translate-middle-x mt-3 shadow-lg`;
    notification.style.zIndex = '9999';
    notification.innerHTML = `
        <div class="d-flex align-items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            ${message}
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}
