// Mokpokpo Frontend Logic
// API_URL is defined in auth.js

document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    checkAuth();
    initScrollEffects();
    initNavbarAnimation();
    
    // Handle login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        handleLogin(loginForm);
    }
    
    // Handle register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        handleRegister(registerForm);
    }

    // Initialize product fetching if on products page
    if (document.getElementById('products-container')) {
        fetchProducts();
    }
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

function handleLogin(form) {
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
                console.log('Login successful, saving token');
                localStorage.setItem('token', data.access_token);
                
                // Fetch and save user info immediately
                try {
                    const userResponse = await fetch(`${API_URL}/auth/me`, {
                        headers: {
                            'Authorization': `Bearer ${data.access_token}`
                        }
                    });
                    
                    if (userResponse.ok) {
                        const user = await userResponse.json();
                        localStorage.setItem('currentUser', JSON.stringify(user));
                        console.log('User info saved:', user.email);
                    }
                } catch (error) {
                    console.error('Error fetching user info:', error);
                }
                
                // Success animation
                if (submitBtn) {
                    submitBtn.classList.remove('btn-primary');
                    submitBtn.classList.add('btn-success');
                    submitBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2"><polyline points="20 6 9 17 4 12"></polyline></svg>Connexion réussie!';
                }
                
                setTimeout(() => {
                    // Redirect based on user role
                    if (user.role === 'GEST_COMMERCIAL') {
                        window.location.href = 'commercial-dashboard.html';
                    } else if (user.role === 'GEST_STOCK') {
                        window.location.href = 'stock-dashboard.html';
                    } else {
                        window.location.href = 'dashboard.html';
                    }
                }, 1000);
            } else {
                const data = await response.json();
                if (errorDiv) {
                    const msg = errorMessage || errorDiv;
                    msg.textContent = data.detail || 'Identifiant ou mot de passe incorrect';
                    errorDiv.classList.remove('d-none');
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            if (errorDiv) {
                const msg = errorMessage || errorDiv;
                msg.textContent = 'Impossible de contacter le serveur. Vérifiez votre connexion.';
                errorDiv.classList.remove('d-none');
            }
        } finally {
            if (submitBtn && !submitBtn.classList.contains('btn-success')) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Se connecter';
            }
        }
    });
}

function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    const badges = document.querySelectorAll('.cart-badge');
    badges.forEach(badge => {
        badge.textContent = cartCount;
        badge.style.display = cartCount === 0 ? 'none' : 'flex';
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

function handleRegister(form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const typeSelect = document.getElementById('type');
        const type = typeSelect ? typeSelect.value : 'client';
        
        const errorDiv = document.getElementById('registerError');
        const submitBtn = form.querySelector('button[type="submit"]');

        const roleMapping = {
            'client': 'CLIENT',
            'commercial': 'GEST_COMMERCIAL',
            'stock': 'GEST_STOCK'
        };

        if (errorDiv) errorDiv.classList.add('d-none');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Inscription...';
        }

        const payload = {
            nom: lastName,
            prenom: firstName,
            email: email,
            mot_de_passe: password,
            role: roleMapping[type] || 'CLIENT'
        };

        try {
            const response = await fetch(`${API_URL}/utilisateurs/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                window.location.href = 'login.html';
            } else {
                const data = await response.json();
                if (errorDiv) {
                    errorDiv.textContent = data.detail || 'Erreur lors de l\'inscription';
                    errorDiv.classList.remove('d-none');
                }
            }
        } catch (error) {
            console.error('Registration error:', error);
            if (errorDiv) {
                errorDiv.textContent = 'Impossible de contacter le serveur.';
                errorDiv.classList.remove('d-none');
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'S\'inscrire';
            }
        }
    });
}

async function fetchProducts() {
    const container = document.getElementById('products-container');
    if (!container) return;

    try {
        const response = await fetch(`${API_URL}/produits`);
        if (response.ok) {
            const products = await response.json();
            
            // Store products globally for filtering
            window.allProducts = products;
            
            // Update products count
            const productsCount = document.getElementById('productsCount');
            if (productsCount) {
                productsCount.textContent = `${products.length} produit${products.length > 1 ? 's' : ''} trouvé${products.length > 1 ? 's' : ''}`;
            }
            
            if (products.length === 0) {
                container.innerHTML = '<div class="col-12 text-center py-5"><p class="text-muted">Aucun produit disponible pour le moment.</p></div>';
                return;
            }

            // Display all products initially
            displayFilteredProducts(products, products);

            // Initialize search and filter
            initProductFilters(products);
        } else {
            console.error('Failed to load products');
            container.innerHTML = '<div class="col-12 text-center py-5"><div class="alert alert-danger">Erreur lors du chargement du catalogue.</div></div>';
        }
    } catch (error) {
        console.error('Error fetching products:', error);
        container.innerHTML = '<div class="col-12 text-center py-5"><div class="alert alert-danger">Impossible de contacter le serveur.</div></div>';
    }
}

// Initialize product filters
function initProductFilters(products) {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');

    if (searchInput) {
        // Debounce search input for better performance
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                filterProducts(window.allProducts || products);
            }, 300);
        });
        
        // Add clear button functionality
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                filterProducts(window.allProducts || products);
            }
        });
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            filterProducts(window.allProducts || products);
            // Visual feedback
            categoryFilter.classList.add('border-success');
            setTimeout(() => categoryFilter.classList.remove('border-success'), 500);
        });
    }
}

// Filter products
function filterProducts(allProducts) {
    if (!allProducts || allProducts.length === 0) {
        console.warn('No products available to filter');
        return;
    }

    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    
    const searchTerm = searchInput?.value.toLowerCase().trim() || '';
    const category = categoryFilter?.value || '';

    // Show loading state
    const container = document.getElementById('products-container');
    if (container) {
        container.style.opacity = '0.5';
    }

    // Filter products
    let filtered = allProducts.filter(product => {
        // Search in multiple fields
        const matchSearch = !searchTerm || 
            product.nom_produit.toLowerCase().includes(searchTerm) ||
            (product.description || '').toLowerCase().includes(searchTerm) ||
            (product.nom_scientifique || '').toLowerCase().includes(searchTerm) ||
            (product.type_produit || '').toLowerCase().includes(searchTerm);
        
        // Filter by category
        const matchCategory = !category || product.type_produit === category;
        
        return matchSearch && matchCategory;
    });

    // Display filtered products with animation
    setTimeout(() => {
        displayFilteredProducts(filtered, allProducts);
        if (container) {
            container.style.opacity = '1';
        }
    }, 100);

    // Log filter results for debugging
    console.log(`Filtered: ${filtered.length} of ${allProducts.length} products`);
    if (searchTerm) console.log(`Search term: "${searchTerm}"`);
    if (category) console.log(`Category: ${category}`);
}

// Display filtered products
function displayFilteredProducts(products, allProducts) {
    const container = document.getElementById('products-container');
    const noResults = document.getElementById('noResults');
    const productsCount = document.getElementById('productsCount');

    if (products.length === 0) {
        container.innerHTML = '';
        if (noResults) noResults.classList.remove('d-none');
        if (productsCount) productsCount.textContent = '0 produit trouvé';
        return;
    }

    if (noResults) noResults.classList.add('d-none');
    if (productsCount) {
        productsCount.classList.add('updating');
        productsCount.textContent = `${products.length} produit${products.length > 1 ? 's' : ''} trouvé${products.length > 1 ? 's' : ''}`;
        setTimeout(() => productsCount.classList.remove('updating'), 600);
    }

    // Re-render products
    container.innerHTML = '';

    // Product images mapping
    const productImages = {
        'basilic': 'https://images.unsplash.com/photo-1628016851899-c0f3afae6c6b?w=400&h=300&fit=crop',
        'moringa': 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400&h=300&fit=crop',
        'aloe': 'https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=400&h=300&fit=crop',
        'citronnelle': 'https://images.unsplash.com/photo-1587334207976-baaa13012ee4?w=400&h=300&fit=crop',
        'gingembre': 'https://images.unsplash.com/photo-1599909533556-e7c7976f3b30?w=400&h=300&fit=crop',
        'menthe': 'https://images.unsplash.com/photo-1628016851899-c0f3afae6c6b?w=400&h=300&fit=crop',
        'default': 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400&h=300&fit=crop'
    };

    // Category colors
    const categoryColors = {
        'Plantes Médicinales': 'success',
        'Herbes Aromatiques': 'info',
        'Superaliments': 'warning',
        'Épices': 'danger'
    };

    products.forEach((product, index) => {
        // Find matching image
        let imageUrl = productImages.default;
        const productName = product.nom_produit.toLowerCase();
        for (const [key, url] of Object.entries(productImages)) {
            if (productName.includes(key)) {
                imageUrl = url;
                break;
            }
        }

        const category = product.type_produit || 'Autre';
        const badgeColor = categoryColors[category] || 'secondary';

        const cardHtml = `
        <div class="col-sm-6 col-lg-4 col-xl-3 fade-in" style="animation-delay: ${index * 0.05}s">
            <div class="card product-card-enhanced h-100 border-0 rounded-4">
                <div class="product-image-container rounded-top-4">
                    <img src="${imageUrl}" alt="${product.nom_produit}" loading="lazy">
                    <span class="product-badge badge bg-${badgeColor}">${category}</span>
                    <button class="product-favorite" onclick="toggleFavorite(this, ${product.id_produit})">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                        </svg>
                    </button>
                    <div class="quick-view-badge" onclick="quickView(${product.id_produit})">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        Vue rapide
                    </div>
                </div>
                <div class="product-info">
                    <h5 class="product-title">${product.nom_produit}</h5>
                    <p class="product-scientific mb-2">${product.nom_scientifique || 'Non spécifié'}</p>
                    <p class="product-description mb-3">${product.description || 'Aucune description disponible'}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <div class="product-price">${product.prix_unitaire} FCFA</div>
                            <div class="product-stock">Stock: ${product.quantite_stock || 0} unités</div>
                        </div>
                    </div>
                </div>
                <div class="product-actions">
                    <button class="btn btn-primary btn-add-to-cart w-100 rounded-3" onclick="addToCart(${product.id_produit})">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                            <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
                            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
                        </svg>
                        Ajouter au panier
                    </button>
                </div>
            </div>
        </div>
        `;
        container.insertAdjacentHTML('beforeend', cardHtml);
    });

    // Load favorites from localStorage
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    favorites.forEach(id => {
        const button = document.querySelector(`button[onclick="toggleFavorite(this, ${id})"]`);
        if (button) button.classList.add('active');
    });
}

// Toggle favorite
function toggleFavorite(button, productId) {
    button.classList.toggle('active');
    const isFavorite = button.classList.contains('active');
    
    // Save to localStorage
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    if (isFavorite) {
        favorites.push(productId);
    } else {
        const index = favorites.indexOf(productId);
        if (index > -1) favorites.splice(index, 1);
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

// Quick view
function quickView(productId) {
    // TODO: Implement quick view modal
    console.log('Quick view for product:', productId);
}

// Add to cart
function addToCart(productId) {
    // Get product from allProducts
    const product = window.allProducts?.find(p => p.id_produit === productId);
    
    if (!product) {
        console.error('Product not found');
        return;
    }
    
    // Get current cart
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    // Check if product already in cart
    const existingItemIndex = cart.findIndex(item => item.id === productId);
    
    if (existingItemIndex !== -1) {
        // Increment quantity
        cart[existingItemIndex].quantity += 1;
    } else {
        // Find product image
        const productImages = {
            'basilic': 'https://images.unsplash.com/photo-1628016851899-c0f3afae6c6b?w=400&h=300&fit=crop',
            'moringa': 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400&h=300&fit=crop',
            'aloe': 'https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=400&h=300&fit=crop',
            'citronnelle': 'https://images.unsplash.com/photo-1587334207976-baaa13012ee4?w=400&h=300&fit=crop',
            'gingembre': 'https://images.unsplash.com/photo-1599909533556-e7c7976f3b30?w=400&h=300&fit=crop',
            'menthe': 'https://images.unsplash.com/photo-1628016851899-c0f3afae6c6b?w=400&h=300&fit=crop',
            'default': 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400&h=300&fit=crop'
        };
        
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
            name: product.nom_produit,
            price: parseFloat(product.prix_unitaire),
            quantity: 1,
            image: imageUrl,
            stock: product.quantite_stock || 0
        });
    }
    
    // Save cart
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Show feedback
    const btn = event.target.closest('button');
    if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2"><polyline points="20 6 9 17 4 12"></polyline></svg>Ajouté!';
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
    
    console.log('Added to cart:', product.nom_produit);
}
