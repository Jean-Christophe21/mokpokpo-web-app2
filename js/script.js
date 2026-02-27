// Mokpokpo Frontend Logic
// API_URL is defined in auth.js

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initScrollEffects();
    initNavbarAnimation();
});

// Navbar scroll animation
function initNavbarAnimation() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// Scroll animations for elements
function initScrollEffects() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe feature cards and product cards
    document.querySelectorAll('.feature-card, .card-product, .stat-item').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
}

// Simple authentication check placeholder
function checkAuth() {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const currentUserSession = sessionStorage.getItem('currentUser');
    const currentUserLocal = localStorage.getItem('currentUser');
    const currentUser = currentUserSession ? JSON.parse(currentUserSession) : (currentUserLocal ? JSON.parse(currentUserLocal) : null);
    
    const authLinks = document.getElementById('auth-links');
    const userLinks = document.getElementById('user-links');
    
    if (authLinks && userLinks) {
        if (token && currentUser) {
            authLinks.classList.add('d-none');
            userLinks.classList.remove('d-none');
            
            // Load user name if available
            const userNameDisplay = document.getElementById('userNameDisplay');
            if (userNameDisplay) {
                userNameDisplay.textContent = currentUser.prenom || 'Mon Compte';
            }
        } else {
            authLinks.classList.remove('d-none');
            userLinks.classList.add('d-none');
        }
    }
}

// Add logout function
function logout() {
    // Clear all auth data
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    
    // Redirect to home
    window.location.href = 'index.html';
}
        
        let imageUrl = productImages.default;
        const productName = product.nom_produit.toLowerCase();
        for (const [key, url] of Object.entries(productImages)) {
            if (productName.includes(key)) {
                imageUrl = url;
                break;
            }
        }
        
        // Add new item
        cart.push({
            id: productId,
            name: product.nom_produit, // Use safe property access
            price: parseFloat(product.prix_unitaire),
            quantity: 1,
            image: imageUrl,
            stock: currentStock // Store max stock for cart validation
        });
    }
    
    // Save cart
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Show feedback
    const btn = event.target.closest('button');
    if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2"><polyline points="20 6 9 17 4 12"></polyline></svg>Ajoutà!';
        btn.classList.add('btn-success');
        btn.classList.remove('btn-primary');
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.classList.add('btn-primary');
            btn.classList.remove('btn-success');
        }, 2000);
    }
    
    // Update cart count
    updateCartCount();
}

