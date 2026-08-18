// ==========================================
// LOCAL STORAGE CONTROLLER
// ==========================================

const STORAGE_KEYS = {
    products: "inventory_products",
    sales: "inventory_sales",
    categories: "inventory_categories",
    users: "inventory_users"
};

// ==========================================
// GENERIC STORAGE FUNCTIONS
// ==========================================

function saveToLocalStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function getFromLocalStorage(key, fallback = []) {
    const storedData = localStorage.getItem(key);
    if (!storedData) return fallback;
    try {
        const parsed = JSON.parse(storedData);
        return Array.isArray(parsed) ? parsed : fallback;
    } catch (error) {
        console.error(`LocalStorage error for ${key}:`, error);
        return fallback;
    }
}

// ==========================================
// PRODUCTS
// ==========================================

function saveProducts(products) {
    saveToLocalStorage(STORAGE_KEYS.products, products);
}

function getLocalProducts() {
    return getFromLocalStorage(STORAGE_KEYS.products, []);
}

// ==========================================
// SALES
// ==========================================

function saveSales(sales) {
    saveToLocalStorage(STORAGE_KEYS.sales, sales);
}

function getLocalSales() {
    return getFromLocalStorage(STORAGE_KEYS.sales, []);
}

// ==========================================
// CATEGORIES
// ==========================================

function saveCategories(categories) {
    saveToLocalStorage(STORAGE_KEYS.categories, categories);
}

function getLocalCategories() {
    return getFromLocalStorage(STORAGE_KEYS.categories, []);
}

// ==========================================
// USERS
// ==========================================

function saveUsers(users) {
    saveToLocalStorage(STORAGE_KEYS.users, users);
}

function getLocalUsers() {
    return getFromLocalStorage(STORAGE_KEYS.users, []);
}

// ==========================================
// USER AUTHENTICATION & PROFILE STATE
// ==========================================

const DEFAULT_USER = {
    id: "usr_admin_01",
    firstName: "Aman",
    lastName: "Sharma",
    email: "admin@inventoryflow.com",
    phone: "+91 98765 43210",
    organization: "InventoryIQ Systems",
    role: "Lead Operations Manager",
    designation: "System Administrator",
    avatar: "A",
    createdAt: new Date().toISOString()
};

function getCurrentUser() {
    const raw = localStorage.getItem("inventory_current_user");
    if (!raw) {
        localStorage.setItem("inventory_current_user", JSON.stringify(DEFAULT_USER));
        return DEFAULT_USER;
    }
    try {
        return JSON.parse(raw);
    } catch (e) {
        return DEFAULT_USER;
    }
}

function saveCurrentUser(userObj) {
    localStorage.setItem("inventory_current_user", JSON.stringify(userObj));
    updateGlobalUserUI(userObj);
}

function updateGlobalUserUI(userObj) {
    const user = userObj || getCurrentUser();
    const fullName = `${user.firstName || 'Aman'} ${user.lastName || 'Sharma'}`.trim();
    const initial = (user.firstName || 'A')[0].toUpperCase();

    // Update topbar & profile elements across DOM
    document.querySelectorAll('.user-name').forEach(el => el.textContent = user.firstName || 'Aman');
    document.querySelectorAll('.avatar-circle').forEach(el => el.textContent = initial);
    document.querySelectorAll('.user-dropdown-header strong').forEach(el => el.textContent = fullName);
    document.querySelectorAll('.user-dropdown-header span').forEach(el => el.textContent = user.email || 'admin@inventoryflow.com');
    document.querySelectorAll('.greeting-subtitle').forEach(el => el.textContent = `GOOD MORNING • ${(user.firstName || 'AMAN').toUpperCase()}`);
}

function logoutUser() {
    localStorage.removeItem("inventory_current_user");
    window.location.href = "./login.html";
}

// Auto sync UI on load
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => updateGlobalUserUI());
    } else {
        updateGlobalUserUI();
    }
}