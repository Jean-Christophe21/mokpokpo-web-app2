// SCRIPT DE TEST - Dashboards Gestionnaires Mokpokpo
// Copiez-collez ce code dans la console du navigateur (F12)

console.log('???????????????????????????????????????????????????????');
console.log('  TESTS DASHBOARDS GESTIONNAIRES - MOKPOKPO');
console.log('???????????????????????????????????????????????????????\n');

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const API_URL = 'https://bd-mokpokokpo.onrender.com';

function getToken() {
    return localStorage.getItem('token');
}

function getUser() {
    return JSON.parse(localStorage.getItem('currentUser') || '{}');
}

async function testAPI(method, endpoint, data = null) {
    const options = {
        method: method,
        headers: {
            'Authorization': `Bearer ${getToken()}`,
            'Content-Type': 'application/json'
        }
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(`${API_URL}${endpoint}`, options);
        return {
            ok: response.ok,
            status: response.status,
            data: response.ok ? await response.json() : null
        };
    } catch (error) {
        return {
            ok: false,
            status: 0,
            error: error.message
        };
    }
}

// ============================================================
// TEST 1: VÉRIFICATIONS DE BASE
// ============================================================

console.log('TEST 1: Vérifications de base\n');

const token = getToken();
const user = getUser();

console.log('Token:', token ? '? Présent' : '? Absent');
console.log('Utilisateur:', user.email || '? Non défini');
console.log('Rôle:', user.role || '? Non défini');
console.log('');

// ============================================================
// TEST 2: TESTER LES ENDPOINTS (GESTIONNAIRE COMMERCIAL)
// ============================================================

async function testCommercialEndpoints() {
    console.log('TEST 2: Endpoints Gestionnaire Commercial\n');
    
    // Test produits
    console.log('2.1 - GET /produits');
    let result = await testAPI('GET', '/produits');
    console.log(result.ok ? `? ${result.data.length} produits` : `? Erreur ${result.status}`);
    
    // Test commandes
    console.log('2.2 - GET /commandes/');
    result = await testAPI('GET', '/commandes/');
    console.log(result.ok ? `? ${result.data.length} commandes` : `? Erreur ${result.status}`);
    
    // Test réservations
    console.log('2.3 - GET /reservations/');
    result = await testAPI('GET', '/reservations/');
    console.log(result.ok ? `? ${result.data.length} réservations` : `? Erreur ${result.status}`);
    
    // Test ventes
    console.log('2.4 - GET /ventes/');
    result = await testAPI('GET', '/ventes/');
    console.log(result.ok ? `? ${result.data.length} ventes` : `? Erreur ${result.status}`);
    
    console.log('');
}

// ============================================================
// TEST 3: TESTER LES ENDPOINTS (GESTIONNAIRE STOCK)
// ============================================================

async function testStockEndpoints() {
    console.log('TEST 3: Endpoints Gestionnaire Stock\n');
    
    // Test stocks
    console.log('3.1 - GET /stocks/');
    let result = await testAPI('GET', '/stocks/');
    console.log(result.ok ? `? ${result.data.length} stocks` : `? Erreur ${result.status}`);
    
    // Test alertes
    console.log('3.2 - GET /alertes-stock/');
    result = await testAPI('GET', '/alertes-stock/');
    console.log(result.ok ? `? ${result.data.length} alertes` : `? Erreur ${result.status}`);
    
    console.log('');
}

// ============================================================
// TEST 4: CRÉER DES DONNÉES DE TEST
// ============================================================

async function createTestData() {
    console.log('TEST 4: Création de données de test\n');
    
    // Créer un stock de test
    console.log('4.1 - Créer un stock de test');
    const testStock = {
        id_produit: 1,
        quantite_stock: 50,
        seuil_alerte: 15
    };
    
    let result = await testAPI('POST', '/stocks/', testStock);
    console.log(result.ok ? `? Stock créé` : `? Erreur ${result.status}`);
    
    console.log('');
}

// ============================================================
// TEST 5: VÉRIFIER LES ÉLÉMENTS DOM
// ============================================================

function testDOMElements() {
    console.log('TEST 5: Éléments DOM\n');
    
    const elements = {
        'userNameDisplay': document.getElementById('userNameDisplay'),
        'sidebar links': document.querySelectorAll('[data-section]'),
        'dashboard sections': document.querySelectorAll('.dashboard-section')
    };
    
    for (const [name, element] of Object.entries(elements)) {
        if (element) {
            const count = element.length || 1;
            console.log(`? ${name}: ${count}`);
        } else {
            console.log(`? ${name}: Manquant`);
        }
    }
    
    console.log('');
}

// ============================================================
// TEST 6: SIMULER DES ACTIONS
// ============================================================

function testActions() {
    console.log('TEST 6: Simulation d\'actions\n');
    
    // Test navigation
    console.log('6.1 - Test de navigation');
    const navLinks = document.querySelectorAll('[data-section]');
    console.log(`? ${navLinks.length} liens de navigation trouvés`);
    
    // Test formulaires
    console.log('6.2 - Test des formulaires');
    const forms = document.querySelectorAll('form');
    console.log(`? ${forms.length} formulaire(s) trouvé(s)`);
    
    console.log('');
}

// ============================================================
// FONCTION PRINCIPALE
// ============================================================

async function runAllTests() {
    console.log('???????????????????????????????????????????????????????');
    console.log('  EXÉCUTION DE TOUS LES TESTS');
    console.log('???????????????????????????????????????????????????????\n');
    
    // Tests synchrones
    testDOMElements();
    testActions();
    
    // Tests asynchrones
    if (token) {
        if (user.role === 'GEST_COMMERCIAL') {
            await testCommercialEndpoints();
        } else if (user.role === 'GEST_STOCK') {
            await testStockEndpoints();
        }
    } else {
        console.log('?? Token absent - Tests API ignorés\n');
    }
    
    console.log('???????????????????????????????????????????????????????');
    console.log('  TESTS TERMINÉS');
    console.log('???????????????????????????????????????????????????????\n');
    
    // Résumé
    console.log('?? RÉSUMÉ:');
    console.log(`   Utilisateur: ${user.email || 'Non connecté'}`);
    console.log(`   Rôle: ${user.role || 'Aucun'}`);
    console.log(`   Page actuelle: ${window.location.pathname.split('/').pop()}`);
    console.log('');
}

// ============================================================
// FONCTIONS UTILES EXPOSÉES
// ============================================================

window.dashboardTest = {
    // Tests
    runAll: runAllTests,
    testCommercial: testCommercialEndpoints,
    testStock: testStockEndpoints,
    testDOM: testDOMElements,
    
    // Helpers
    getToken: getToken,
    getUser: getUser,
    testAPI: testAPI,
    
    // Données de test
    createTestData: createTestData,
    
    // Exemples d'utilisation
    examples: {
        'Tester un endpoint': 'dashboardTest.testAPI("GET", "/produits")',
        'Créer données test': 'dashboardTest.createTestData()',
        'Info utilisateur': 'dashboardTest.getUser()',
        'Tests complets': 'dashboardTest.runAll()'
    }
};

// ============================================================
// AUTO-EXÉCUTION
// ============================================================

console.log('? Script de test chargé\n');
console.log('?? Commandes disponibles:');
console.log('   dashboardTest.runAll()         - Exécuter tous les tests');
console.log('   dashboardTest.testCommercial() - Tests dashboard commercial');
console.log('   dashboardTest.testStock()      - Tests dashboard stock');
console.log('   dashboardTest.getUser()        - Info utilisateur');
console.log('');

// Exécuter automatiquement
console.log('?? Exécution automatique des tests...\n');
runAllTests();
