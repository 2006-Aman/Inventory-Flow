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