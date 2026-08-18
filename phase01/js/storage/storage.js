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
// USERS DATABASE & AUTHENTICATION
// ==========================================

const DEFAULT_USERS = [
    {
        id: "usr_admin_01",
        firstName: "Aman",
        lastName: "Sharma",
        email: "admin@inventoryflow.com",
        password: "admin123",
        phone: "+91 98765 43210",
        organization: "InventoryIQ Systems",
        role: "System Administrator",
        avatar: "A",
        createdAt: "2026-04-01 09:00"
    }
];

function getLocalUsers() {
    const users = getFromLocalStorage(STORAGE_KEYS.users, null);
    if (!users || !Array.isArray(users) || users.length === 0) {
        saveToLocalStorage(STORAGE_KEYS.users, DEFAULT_USERS);
        return DEFAULT_USERS;
    }
    return users;
}

function saveUsers(users) {
    saveToLocalStorage(STORAGE_KEYS.users, users);
}

function registerNewUser(newUserObj) {
    const users = getLocalUsers();
    
    // Check if email already exists
    const existing = users.find(u => u.email.toLowerCase().trim() === newUserObj.email.toLowerCase().trim());
    if (existing) {
        return { success: false, message: "An account with this email already exists!" };
    }

    users.push(newUserObj);
    saveUsers(users);

    // Try posting to json-server database
    try {
        fetch("http://localhost:3000/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newUserObj)
        }).catch(err => console.log("Backend offline, user registered locally."));
    } catch(e) {}

    return { success: true, user: newUserObj };
}

function authenticateUser(email, password) {
    const users = getLocalUsers();
    const cleanEmail = (email || "").toLowerCase().trim();
    const cleanPass = password || "";

    const foundUser = users.find(
        u => u.email.toLowerCase().trim() === cleanEmail && u.password === cleanPass
    );

    if (!foundUser) {
        return { success: false, message: "Invalid email or password. Please check your credentials!" };
    }

    return { success: true, user: foundUser };
}

// ==========================================
// USER SESSION STATE
// ==========================================

function getCurrentUser() {
    const raw = localStorage.getItem("inventory_current_user");
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

function saveCurrentUser(userObj) {
    localStorage.setItem("inventory_current_user", JSON.stringify(userObj));
    updateGlobalUserUI(userObj);
}

function updateGlobalUserUI(userObj) {
    const user = userObj || getCurrentUser();
    if (!user) return;

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
    window.location.href = "login.html";
}

// ==========================================
// SYSTEM-WIDE AUTHENTICATION GUARD
// ==========================================

function checkAuthGuard() {
    const currentPath = window.location.pathname.split("/").pop() || "dashboard.html";
    const isPublicPage = currentPath === "login.html" || currentPath === "signup.html";
    const user = getCurrentUser();

    // Rule 1: Redirect unauthenticated users to login.html
    if (!user && !isPublicPage) {
        window.location.href = "login.html";
        return false;
    }

    // Rule 2: Redirect logged in users away from login/signup to dashboard.html
    if (user && isPublicPage) {
        window.location.href = "dashboard.html";
        return false;
    }

    return true;
}

// Synchronous Execution Guard
checkAuthGuard();

// Auto sync UI on load
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => updateGlobalUserUI());
    } else {
        updateGlobalUserUI();
    }
}