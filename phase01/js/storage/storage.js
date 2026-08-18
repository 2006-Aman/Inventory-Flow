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

// ==========================================
// AUTOMATIC FULL DATABASE SYNC ON STARTUP
// ==========================================

async function syncAllDataFromBackend() {
    try {
        // 1. Sync Products
        const prodRes = await fetch("http://localhost:3000/products");
        if (prodRes.ok) {
            const products = await prodRes.json();
            if (Array.isArray(products) && products.length > 0) {
                saveProducts(products);
            }
        }
    } catch(e) {}

    try {
        // 2. Sync Sales
        const salesRes = await fetch("http://localhost:3000/sales");
        if (salesRes.ok) {
            const sales = await salesRes.json();
            if (Array.isArray(sales) && sales.length > 0) {
                saveSales(sales);
            }
        }
    } catch(e) {}

    try {
        // 3. Sync Categories
        const catRes = await fetch("http://localhost:3000/categories");
        if (catRes.ok) {
            const categories = await catRes.json();
            if (Array.isArray(categories) && categories.length > 0) {
                saveCategories(categories);
            }
        }
    } catch(e) {}

    try {
        // 4. Sync Users
        const userRes = await fetch("http://localhost:3000/users");
        if (userRes.ok) {
            const dbUsers = await userRes.json();
            if (Array.isArray(dbUsers) && dbUsers.length > 0) {
                const localUsers = getFromLocalStorage(STORAGE_KEYS.users, []);
                const userMap = new Map();
                DEFAULT_USERS.forEach(u => u.email && userMap.set(u.email.toLowerCase().trim(), u));
                localUsers.forEach(u => u.email && userMap.set(u.email.toLowerCase().trim(), u));
                dbUsers.forEach(u => u.email && userMap.set(u.email.toLowerCase().trim(), { ...(userMap.get(u.email.toLowerCase().trim()) || {}), ...u }));
                saveToLocalStorage(STORAGE_KEYS.users, Array.from(userMap.values()));
            }
        }
    } catch(e) {}
}

// Trigger full database sync on load
syncAllDataFromBackend();

function getCurrentUser() {
    const raw = localStorage.getItem("inventory_current_user");
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

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

async function registerNewUser(newUserObj) {
    const users = getLocalUsers();
    
    // Check if email already exists
    const existing = users.find(u => u.email && u.email.toLowerCase().trim() === newUserObj.email.toLowerCase().trim());
    if (existing) {
        return { success: false, message: "An account with this email already exists!" };
    }

    // Save locally first so session works immediately
    users.push(newUserObj);
    saveUsers(users);
    localStorage.setItem("inventory_current_user", JSON.stringify(newUserObj));

    // Try posting to json-server database
    try {
        const res = await fetch("http://localhost:3000/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newUserObj)
        });
        if (res.ok) {
            const created = await res.json();
            if (created && created.id) {
                newUserObj.id = created.id;
                // update id in list
                const idx = users.findIndex(u => u.email.toLowerCase().trim() === newUserObj.email.toLowerCase().trim());
                if (idx !== -1) users[idx].id = created.id;
                saveUsers(users);
                localStorage.setItem("inventory_current_user", JSON.stringify(newUserObj));
            }
        }
    } catch(e) {
        console.log("Backend offline, user registered locally.");
    }

    return { success: true, user: newUserObj };
}

async function authenticateUser(email, password) {
    const cleanEmail = (email || "").toLowerCase().trim();
    const cleanPass = password || "";

    let users = getLocalUsers();
    let foundUser = users.find(
        u => u.email && u.email.toLowerCase().trim() === cleanEmail && u.password === cleanPass
    );

    // Fallback: If local storage was cleared, query db.json directly
    if (!foundUser) {
        try {
            const res = await fetch("http://localhost:3000/users");
            if (res.ok) {
                const dbUsers = await res.json();
                if (Array.isArray(dbUsers)) {
                    foundUser = dbUsers.find(
                        u => u.email && u.email.toLowerCase().trim() === cleanEmail && u.password === cleanPass
                    );
                    if (foundUser) {
                        users.push(foundUser);
                        saveUsers(users);
                    }
                }
            }
        } catch(e) {}
    }

    if (!foundUser) {
        return { success: false, message: "Invalid email or password. Please check your credentials!" };
    }

    return { success: true, user: foundUser };
}

function saveCurrentUser(userObj) {
    if (!userObj) return;
    localStorage.setItem("inventory_current_user", JSON.stringify(userObj));
    
    // Sync userObj into inventory_users list as well
    if (userObj.email) {
        const users = getLocalUsers();
        const idx = users.findIndex(u => u.email && u.email.toLowerCase().trim() === userObj.email.toLowerCase().trim());
        if (idx !== -1) {
            users[idx] = { ...users[idx], ...userObj };
        } else {
            users.push(userObj);
        }
        saveUsers(users);
    }

    updateGlobalUserUI(userObj);
    syncProfileToBackend(userObj);
}

function updateUserPassword(currentPassword, newPassword) {
    const user = getCurrentUser();
    if (!user) {
        return { success: false, message: "User session not found. Please log in again." };
    }

    const users = getLocalUsers();
    // Find user by email in local storage list
    let userIndex = users.findIndex(u => u.email && u.email.toLowerCase().trim() === user.email.toLowerCase().trim());
    if (userIndex === -1) {
        users.push(user);
        userIndex = users.length - 1;
    }
    const userInDb = users[userIndex];

    // Determine current password stored (fallback to admin123 or user.password)
    const storedPass = userInDb.password || user.password || "admin123";
    
    // Verify current password (if user provided current password)
    if (currentPassword && currentPassword !== storedPass && storedPass !== "admin123") {
        return { success: false, message: "Current password is incorrect!" };
    }

    if (!newPassword || newPassword.length < 4) {
        return { success: false, message: "New password must be at least 4 characters long." };
    }

    // Update password in local memory
    user.password = newPassword;
    userInDb.password = newPassword;
    users[userIndex] = userInDb;

    // Save updated users list and active session to LocalStorage
    saveUsers(users);
    localStorage.setItem("inventory_current_user", JSON.stringify(user));
    updateGlobalUserUI(user);

    // Sync updated password to db.json (json-server)
    syncPasswordToBackend(user.email, newPassword);

    return { success: true, message: "Password updated successfully in storage & database!" };
}

// Async Sync Handlers for db.json (json-server)
async function syncPasswordToBackend(email, newPassword) {
    if (!email) return;
    try {
        const res = await fetch("http://localhost:3000/users");
        if (res.ok) {
            const dbUsers = await res.json();
            const serverUser = dbUsers.find(u => u.email && u.email.toLowerCase().trim() === email.toLowerCase().trim());
            if (serverUser && serverUser.id) {
                const patchRes = await fetch(`http://localhost:3000/users/${serverUser.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ password: newPassword })
                });
                if (patchRes.ok) {
                    console.log(`Password successfully updated in db.json for user ID: ${serverUser.id}`);
                }
            } else {
                // If user not in db.json yet, post user to db.json
                const currentUser = getCurrentUser();
                if (currentUser) {
                    currentUser.password = newPassword;
                    await fetch("http://localhost:3000/users", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(currentUser)
                    });
                    console.log("New user posted to db.json with updated password.");
                }
            }
        }
    } catch (e) {
        console.log("Backend offline, password saved in local storage.");
    }
}

async function syncProfileToBackend(userObj) {
    if (!userObj || !userObj.email) return;
    try {
        const res = await fetch("http://localhost:3000/users");
        if (res.ok) {
            const dbUsers = await res.json();
            const serverUser = dbUsers.find(u => u.email && u.email.toLowerCase().trim() === userObj.email.toLowerCase().trim());
            if (serverUser && serverUser.id) {
                await fetch(`http://localhost:3000/users/${serverUser.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(userObj)
                });
                console.log(`Profile updated in db.json for user ID ${serverUser.id}`);
            }
        }
    } catch (e) {
        console.log("Backend offline, profile saved locally.");
    }
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