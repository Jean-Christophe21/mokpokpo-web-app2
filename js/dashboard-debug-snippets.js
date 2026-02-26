// EXEMPLES DE CODE POUR TESTER LE DASHBOARD
// Copiez-collez ces snippets dans la console du navigateur (F12)

// ===========================================
// 1. TESTER LE CHARGEMENT DES DONNÉES UTILISATEUR
// ===========================================

// Test 1.1: Vérifier si le token existe
console.log('Token:', localStorage.getItem('token') ? '? Présent' : '? Absent');

// Test 1.2: Voir les données utilisateur en cache
const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
console.log('Utilisateur:', {
    prenom: user.prenom || '? Non défini',
    nom: user.nom || '? Non défini',
    email: user.email || '? Non défini'
});

// Test 1.3: Forcer le rechargement des données utilisateur
if (typeof loadUserInfo === 'function') {
    loadUserInfo();
} else {
    console.log('? Fonction loadUserInfo non accessible');
}

// Test 1.4: Simuler des données utilisateur (pour test)
const mockUser = {
    prenom: 'Jean',
    nom: 'Dupont',
    email: 'jean.dupont@example.com',
    role: 'CLIENT'
};
localStorage.setItem('currentUser', JSON.stringify(mockUser));
console.log('? Données de test créées. Rechargez la page.');

// ===========================================
// 2. TESTER LA NAVIGATION
// ===========================================

// Test 2.1: Lister tous les onglets de navigation
const navLinks = document.querySelectorAll('[data-section]');
console.log(`Navigation: ${navLinks.length} onglet(s) trouvé(s)`);
navLinks.forEach((link, i) => {
    const section = link.getAttribute('data-section');
    console.log(`  ${i+1}. ${section} ${link.classList.contains('active') ? '(actif)' : ''}`);
});

// Test 2.2: Simuler un clic sur "Mon Panier"
const cartLink = document.querySelector('[data-section="cart"]');
if (cartLink) {
    console.log('? Clic sur "Mon Panier"');
    cartLink.click();
} else {
    console.log('? Lien "Mon Panier" non trouvé');
}

// Test 2.3: Naviguer vers une section spécifique
function goToSection(sectionName) {
    const link = document.querySelector(`[data-section="${sectionName}"]`);
    if (link) {
        link.click();
        console.log(`? Navigation vers: ${sectionName}`);
    } else {
        console.log(`? Section "${sectionName}" non trouvée`);
    }
}

// Exemples d'utilisation:
// goToSection('overview');
// goToSection('cart');
// goToSection('orders');
// goToSection('profile');

// Test 2.4: Vérifier que toutes les sections existent
const sections = ['overview', 'cart', 'orders', 'profile'];
console.log('Sections du dashboard:');
sections.forEach(section => {
    const element = document.getElementById(`${section}-section`);
    console.log(`  ${section}: ${element ? '? Trouvé' : '? Manquant'}`);
});

// ===========================================
// 3. TESTER LE PANIER
// ===========================================

// Test 3.1: Voir le contenu du panier
const cart = JSON.parse(localStorage.getItem('cart') || '[]');
console.log('Panier:');
if (cart.length === 0) {
    console.log('  ?? Vide');
} else {
    cart.forEach((item, i) => {
        console.log(`  ${i+1}. ${item.name} x${item.quantity} - ${item.price} FCFA`);
    });
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    console.log(`  Total: ${total.toLocaleString('fr-FR')} FCFA`);
}

// Test 3.2: Ajouter un produit de test au panier
function addTestProduct() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const testProduct = {
        id: Date.now(),
        name: 'Produit Test',
        price: 1500,
        quantity: 1,
        image: 'https://via.placeholder.com/150',
        stock: 10
    };
    cart.push(testProduct);
    localStorage.setItem('cart', JSON.stringify(cart));
    console.log('? Produit test ajouté au panier');
    // Recharger le panier
    if (typeof loadCart === 'function') {
        loadCart();
    }
    // Mettre à jour les compteurs
    if (typeof updateAllCartCounts === 'function') {
        updateAllCartCounts();
    }
}

// Test 3.3: Vider complètement le panier
function clearTestCart() {
    localStorage.setItem('cart', '[]');
    console.log('? Panier vidé');
    if (typeof loadCart === 'function') {
        loadCart();
    }
    if (typeof updateAllCartCounts === 'function') {
        updateAllCartCounts();
    }
}

// ===========================================
// 4. TESTER LES COMMANDES
// ===========================================

// Test 4.1: Voir l'historique des commandes
const orders = JSON.parse(localStorage.getItem('orders') || '[]');
console.log('Commandes:');
if (orders.length === 0) {
    console.log('  ?? Aucune commande');
} else {
    orders.forEach((order, i) => {
        console.log(`  ${i+1}. #${order.id} - ${order.status} - ${order.total} FCFA`);
    });
}

// Test 4.2: Créer une commande de test
function createTestOrder() {
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    const testOrder = {
        id: Date.now(),
        date: new Date().toISOString(),
        status: 'En attente',
        items: [
            {
                name: 'Produit Test 1',
                price: 1500,
                quantity: 2,
                image: 'https://via.placeholder.com/150'
            },
            {
                name: 'Produit Test 2',
                price: 2000,
                quantity: 1,
                image: 'https://via.placeholder.com/150'
            }
        ],
        total: 5000
    };
    orders.push(testOrder);
    localStorage.setItem('orders', JSON.stringify(orders));
    console.log('? Commande test créée');
    // Recharger les commandes
    if (typeof loadOrders === 'function') {
        loadOrders();
    }
    if (typeof loadDashboardStats === 'function') {
        loadDashboardStats();
    }
}

// Test 4.3: Supprimer toutes les commandes
function clearTestOrders() {
    localStorage.setItem('orders', '[]');
    console.log('? Commandes supprimées');
    if (typeof loadOrders === 'function') {
        loadOrders();
    }
    if (typeof loadDashboardStats === 'function') {
        loadDashboardStats();
    }
}

// ===========================================
// 5. TESTER L'ENCODAGE
// ===========================================

// Test 5.1: Rechercher les caractères problématiques
function checkEncoding() {
    const allText = document.body.textContent;
    const problematicChars = allText.match(/?/g);
    
    if (problematicChars) {
        console.log(`? ${problematicChars.length} caractère(s) "?" trouvé(s)`);
        
        // Trouver où ils se trouvent
        const elements = document.querySelectorAll('*');
        elements.forEach(el => {
            if (el.textContent.includes('?')) {
                console.log('   Dans:', el.tagName, '-', el.textContent.substring(0, 50));
            }
        });
    } else {
        console.log('? Aucun problème d\'encodage détecté');
    }
}
checkEncoding();

// Test 5.2: Vérifier l'encodage des caractères spéciaux
const testStrings = [
    'Dépensé',
    'Récentes',
    'passées',
    'réservés',
    'à',
    'è',
    'é',
    'ù'
];

console.log('Test des caractères spéciaux:');
testStrings.forEach(str => {
    const found = document.body.textContent.includes(str);
    console.log(`  ${str}: ${found ? '?' : '?'}`);
});

// ===========================================
// 6. TESTER L'API
// ===========================================

// Test 6.1: Vérifier la connexion à l'API
async function testAPI() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.log('? Aucun token - Impossible de tester l\'API');
        return;
    }
    
    console.log('Test de connexion à l\'API...');
    
    try {
        const response = await fetch('https://bd-mokpokokpo.onrender.com/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('? API accessible');
            console.log('Données reçues:', data);
        } else {
            console.log('? Erreur API:', response.status);
            if (response.status === 401) {
                console.log('   ? Token expiré ou invalide');
            }
        }
    } catch (error) {
        console.log('? Erreur réseau:', error.message);
    }
}

// Test 6.2: Récupérer les produits
async function testProductsAPI() {
    console.log('Test de récupération des produits...');
    
    try {
        const response = await fetch('https://bd-mokpokokpo.onrender.com/produits');
        
        if (response.ok) {
            const products = await response.json();
            console.log(`? ${products.length} produit(s) récupéré(s)`);
            console.log('Exemples:', products.slice(0, 3));
        } else {
            console.log('? Erreur API:', response.status);
        }
    } catch (error) {
        console.log('? Erreur réseau:', error.message);
    }
}

// ===========================================
// 7. RÉINITIALISATION COMPLÈTE
// ===========================================

// ATTENTION: Cette fonction efface toutes les données locales
function resetDashboard() {
    if (confirm('?? Ceci va supprimer toutes les données locales. Continuer ?')) {
        localStorage.clear();
        console.log('? Dashboard réinitialisé');
        console.log('?? Rechargez la page et reconnectez-vous');
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }
}

// ===========================================
// 8. FONCTIONS UTILES EXPOSÉES
// ===========================================

window.dashboardDebug = {
    // Navigation
    goToSection: goToSection,
    
    // Panier
    addTestProduct: addTestProduct,
    clearTestCart: clearTestCart,
    
    // Commandes
    createTestOrder: createTestOrder,
    clearTestOrders: clearTestOrders,
    
    // API
    testAPI: testAPI,
    testProductsAPI: testProductsAPI,
    
    // Encodage
    checkEncoding: checkEncoding,
    
    // Réinitialisation
    resetDashboard: resetDashboard
};

console.log('? Fonctions de debug disponibles dans: window.dashboardDebug');
console.log('');
console.log('Exemples d\'utilisation:');
console.log('  dashboardDebug.goToSection("cart")');
console.log('  dashboardDebug.addTestProduct()');
console.log('  dashboardDebug.createTestOrder()');
console.log('  dashboardDebug.testAPI()');
console.log('  dashboardDebug.checkEncoding()');
