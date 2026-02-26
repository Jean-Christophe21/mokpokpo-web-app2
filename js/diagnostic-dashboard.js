// Dashboard Diagnostic Tool
// Ajoutez ce code dans la console pour diagnostiquer les problèmes

console.log('=== DIAGNOSTIC DASHBOARD MOKPOKPO ===\n');

// 1. Vérification du Token
console.log('1. TOKEN:');
const token = localStorage.getItem('token');
if (token) {
    console.log('? Token présent:', token.substring(0, 20) + '...');
} else {
    console.log('? Aucun token trouvé - Veuillez vous connecter');
}
console.log('');

// 2. Vérification des données utilisateur
console.log('2. UTILISATEUR:');
const currentUser = localStorage.getItem('currentUser');
if (currentUser) {
    try {
        const user = JSON.parse(currentUser);
        console.log('? Données utilisateur:');
        console.log('   - Prénom:', user.prenom || 'Non défini');
        console.log('   - Nom:', user.nom || 'Non défini');
        console.log('   - Email:', user.email || 'Non défini');
        console.log('   - Rôle:', user.role || 'Non défini');
    } catch (e) {
        console.log('? Erreur de parsing des données utilisateur:', e);
    }
} else {
    console.log('? Aucune donnée utilisateur en cache');
}
console.log('');

// 3. Vérification des éléments DOM
console.log('3. ÉLÉMENTS DOM:');
const elements = {
    'dashboardUserName': document.getElementById('dashboardUserName'),
    'dashboardUserEmail': document.getElementById('dashboardUserEmail'),
    'userNameDisplay': document.getElementById('userNameDisplay'),
    'overview-section': document.getElementById('overview-section'),
    'cart-section': document.getElementById('cart-section'),
    'orders-section': document.getElementById('orders-section'),
    'profile-section': document.getElementById('profile-section'),
    'recentOrdersList': document.getElementById('recentOrdersList'),
    'cartItemsList': document.getElementById('cartItemsList'),
    'ordersHistoryList': document.getElementById('ordersHistoryList')
};

let allElementsPresent = true;
for (const [name, element] of Object.entries(elements)) {
    if (element) {
        console.log('?', name);
    } else {
        console.log('?', name, '- MANQUANT');
        allElementsPresent = false;
    }
}
console.log('');

// 4. Vérification des liens de navigation
console.log('4. NAVIGATION:');
const navLinks = document.querySelectorAll('[data-section]');
console.log(`   Liens trouvés: ${navLinks.length}`);
navLinks.forEach((link, index) => {
    const section = link.getAttribute('data-section');
    console.log(`   ${index + 1}. ${section} ${link.classList.contains('active') ? '(ACTIF)' : ''}`);
});
console.log('');

// 5. Vérification du panier
console.log('5. PANIER:');
const cart = localStorage.getItem('cart');
if (cart) {
    try {
        const cartData = JSON.parse(cart);
        const totalItems = cartData.reduce((sum, item) => sum + item.quantity, 0);
        console.log(`? ${cartData.length} produit(s) - ${totalItems} article(s) total`);
        cartData.forEach((item, index) => {
            console.log(`   ${index + 1}. ${item.name} x${item.quantity} - ${item.price} FCFA`);
        });
    } catch (e) {
        console.log('? Erreur de parsing du panier:', e);
    }
} else {
    console.log('?? Panier vide');
}
console.log('');

// 6. Vérification des commandes
console.log('6. COMMANDES:');
const orders = localStorage.getItem('orders');
if (orders) {
    try {
        const ordersData = JSON.parse(orders);
        console.log(`? ${ordersData.length} commande(s)`);
        ordersData.forEach((order, index) => {
            console.log(`   ${index + 1}. #${order.id} - ${order.status} - ${order.total} FCFA`);
        });
    } catch (e) {
        console.log('? Erreur de parsing des commandes:', e);
    }
} else {
    console.log('?? Aucune commande');
}
console.log('');

// 7. Test de l'API
console.log('7. TEST API:');
if (token) {
    console.log('   Tentative de connexion à l\'API...');
    fetch('https://bd-mokpokokpo.onrender.com/auth/me', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        } else {
            throw new Error(`Status: ${response.status}`);
        }
    })
    .then(data => {
        console.log('? API accessible - Utilisateur:', data.email);
    })
    .catch(error => {
        console.log('? Erreur API:', error.message);
    });
} else {
    console.log('?? Impossible de tester l\'API sans token');
}
console.log('');

// 8. Vérification de l'encodage
console.log('8. ENCODAGE:');
const textElements = document.querySelectorAll('body *');
let encodingIssues = 0;
textElements.forEach(el => {
    const text = el.textContent || '';
    if (text.includes('?')) {
        encodingIssues++;
        console.log('? Problème d\'encodage dans:', el.tagName, '-', text.substring(0, 50));
    }
});
if (encodingIssues === 0) {
    console.log('? Aucun problème d\'encodage détecté');
} else {
    console.log(`? ${encodingIssues} élément(s) avec problème d\'encodage`);
}
console.log('');

// 9. Résumé
console.log('=== RÉSUMÉ ===');
const issues = [];
if (!token) issues.push('Token manquant');
if (!currentUser) issues.push('Données utilisateur manquantes');
if (!allElementsPresent) issues.push('Éléments DOM manquants');
if (encodingIssues > 0) issues.push('Problèmes d\'encodage');

if (issues.length === 0) {
    console.log('? Tout semble fonctionnel !');
} else {
    console.log('? Problèmes détectés:');
    issues.forEach(issue => console.log(`   - ${issue}`));
}

console.log('\n=== FIN DU DIAGNOSTIC ===');

// Export des données pour analyse
window.dashboardDiagnostic = {
    token: !!token,
    user: currentUser ? JSON.parse(currentUser) : null,
    cart: cart ? JSON.parse(cart) : [],
    orders: orders ? JSON.parse(orders) : [],
    elements: elements,
    encodingIssues: encodingIssues
};

console.log('\n?? Données exportées dans: window.dashboardDiagnostic');
