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

// Get user-isolated key for products, sales, and categories
function getUserStorageKey(baseKey) {
    const raw = localStorage.getItem("inventory_current_user");
    if (!raw) return baseKey;
    try {
        const user = JSON.parse(raw);
        // Demo admin account uses shared keys with initial demo data
        if (!user || user.id === "1" || user.id === "usr_admin_01" || user.email === "admin@inventoryflow.com") {
            return baseKey;
        }
        // New registered accounts get their own clean key starting at 0 items
        const userSuffix = user.id || (user.email ? user.email.replace(/[^a-zA-Z0-9]/g, '_') : 'guest');
        return `${baseKey}_${userSuffix}`;
    } catch(e) {
        return baseKey;
    }
}

// ==========================================
// PRODUCTS
// ==========================================

function saveProducts(products) {
    saveToLocalStorage(getUserStorageKey(STORAGE_KEYS.products), products);
}

function getLocalProducts() {
    return getFromLocalStorage(getUserStorageKey(STORAGE_KEYS.products), []);
}

// ==========================================
// SALES
// ==========================================

function saveSales(sales) {
    saveToLocalStorage(getUserStorageKey(STORAGE_KEYS.sales), sales);
}

function getLocalSales() {
    return getFromLocalStorage(getUserStorageKey(STORAGE_KEYS.sales), []);
}

// ==========================================
// CATEGORIES
// ==========================================

function saveCategories(categories) {
    saveToLocalStorage(getUserStorageKey(STORAGE_KEYS.categories), categories);
}

function getLocalCategories() {
    return getFromLocalStorage(getUserStorageKey(STORAGE_KEYS.categories), []);
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
    const raw = localStorage.getItem("inventory_current_user");
    let isDemoAdmin = true;
    if (raw) {
        try {
            const user = JSON.parse(raw);
            if (user && user.email !== "admin@inventoryflow.com" && user.id !== "1" && user.id !== "usr_admin_01") {
                isDemoAdmin = false;
            }
        } catch(e) {}
    }

    // ONLY populate demo dataset for Demo Admin account!
    if (isDemoAdmin) {
        try {
            // 1. Sync Demo Products
            const prodRes = await fetch("http://localhost:3000/products");
            if (prodRes.ok) {
                const products = await prodRes.json();
                if (Array.isArray(products) && products.length > 0) {
                    saveToLocalStorage(STORAGE_KEYS.products, products);
                }
            }
        } catch(e) {}

        try {
            // 2. Sync Demo Sales
            const salesRes = await fetch("http://localhost:3000/sales");
            if (salesRes.ok) {
                const sales = await salesRes.json();
                if (Array.isArray(sales) && sales.length > 0) {
                    saveToLocalStorage(STORAGE_KEYS.sales, sales);
                }
            }
        } catch(e) {}

        try {
            // 3. Sync Demo Categories
            const catRes = await fetch("http://localhost:3000/categories");
            if (catRes.ok) {
                const categories = await catRes.json();
                if (Array.isArray(categories) && categories.length > 0) {
                    saveToLocalStorage(STORAGE_KEYS.categories, categories);
                }
            }
        } catch(e) {}
    }

    try {
        // 4. Sync Users Database
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

/**
 * Sync all data from JSON-Server into LocalStorage.
 * Called by api-test.html "Sync Data to LocalStorage" button.
 * Returns an object with arrays: { users, categories, products, sales }
 */
async function syncAllDataToStorage() {
    const result = { users: [], categories: [], products: [], sales: [] };

    const prodRes = await fetch(`${API_BASE_URL}/products`);
    if (prodRes.ok) {
        result.products = await prodRes.json();
        if (Array.isArray(result.products)) saveToLocalStorage(getUserStorageKey(STORAGE_KEYS.products), result.products);
    }

    const salesRes = await fetch(`${API_BASE_URL}/sales`);
    if (salesRes.ok) {
        result.sales = await salesRes.json();
        if (Array.isArray(result.sales)) saveToLocalStorage(getUserStorageKey(STORAGE_KEYS.sales), result.sales);
    }

    const catRes = await fetch(`${API_BASE_URL}/categories`);
    if (catRes.ok) {
        result.categories = await catRes.json();
        if (Array.isArray(result.categories)) saveToLocalStorage(getUserStorageKey(STORAGE_KEYS.categories), result.categories);
    }

    const userRes = await fetch(`${API_BASE_URL}/users`);
    if (userRes.ok) {
        result.users = await userRes.json();
        if (Array.isArray(result.users)) saveToLocalStorage(STORAGE_KEYS.users, result.users);
    }

    return result;
}

// Trigger database sync on load
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
    const currentPath = window.location.pathname.split("/").pop() || "index.html";
    const isPublicPage = currentPath === "login.html" || currentPath === "signup.html" || currentPath === "index.html" || currentPath === "";
    const user = getCurrentUser();

    // Rule 1: Redirect unauthenticated users to login.html ONLY if accessing protected app pages (dashboard, inventory, sales, etc.)
    if (!user && !isPublicPage) {
        window.location.href = "login.html";
        return false;
    }

    // Rule 2: Redirect logged in users away from auth forms (login/signup) to dashboard.html
    const isAuthForm = currentPath === "login.html" || currentPath === "signup.html";
    if (user && isAuthForm) {
        window.location.href = "dashboard.html";
        return false;
    }

    return true;
}

// Run auth check immediately
checkAuthGuard();

// Update UI elements with active user on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        updateGlobalUserUI();
        initGlobalTopbarSearch();
        updateGlobalAlertBadges();
    });
} else {
    updateGlobalUserUI();
    initGlobalTopbarSearch();
    updateGlobalAlertBadges();
}

// ==========================================
// SYSTEM-WIDE TOPBAR SEARCH CONTROLLER
// ==========================================

function initGlobalTopbarSearch() {
    const searchInputs = document.querySelectorAll('.navbar-search input, .search-box input, #global-search, header input[placeholder*="Search"]');
    
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('q') || '';
    
    searchInputs.forEach(input => {
        if (searchParam && !input.value) {
            input.value = searchParam;
        }

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const query = input.value.trim();
                if (!query) return;
                
                const encodedQuery = encodeURIComponent(query);
                const isInventoryPage = window.location.pathname.endsWith('inventory.html');

                if (isInventoryPage) {
                    const pageSearchInput = document.getElementById('searchInput');
                    if (pageSearchInput) {
                        pageSearchInput.value = query;
                        pageSearchInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                } else {
                    window.location.href = `inventory.html?q=${encodedQuery}`;
                }
            }
        });
    });
}

// ==========================================
// SYSTEM-WIDE REORDER & NOTIFICATION CONTROLLER
// ==========================================

async function updateGlobalAlertBadges() {
    let products = [];
    try {
        if (typeof getProducts === 'function') {
            products = await getProducts();
        } else if (typeof getLocalProducts === 'function') {
            products = getLocalProducts();
        }
    } catch(e) {
        if (typeof getLocalProducts === 'function') {
            products = getLocalProducts();
        }
    }

    if (!Array.isArray(products)) products = [];

    // Filter products needing reorder (stock <= reorderPoint or stock <= minimumStock)
    const reorderItems = products.filter(p => {
        const stock = Number(p.stock ?? p.currentStock ?? 0);
        const min = Number(p.minimumStock ?? 5);
        const rop = Number(p.reorderPoint ?? min);
        return stock <= rop;
    });

    const alertCount = reorderItems.length;

    // 1. Update Sidebar Badges
    const sidebarBadges = document.querySelectorAll('#sidebarAlertCount, #sidebar-reorder-badge, .sidebar-nav a[href*="reorder"] .badge');
    sidebarBadges.forEach(b => {
        b.textContent = alertCount;
        b.style.display = alertCount > 0 ? 'inline-flex' : 'none';
    });

    // 2. Update Header Bell Badges
    const bellBadges = document.querySelectorAll('.dot-badge, #bell-badge, .navbar-right .dot-badge');
    bellBadges.forEach(b => {
        b.textContent = alertCount;
        b.style.display = alertCount > 0 ? 'inline-flex' : 'none';
    });

    // 3. Render Notification Dropdown
    renderNotificationDropdown(reorderItems);
}

function renderNotificationDropdown(reorderItems) {
    const bellBtns = document.querySelectorAll('.icon-btn.has-badge, #bell-btn, button[title*="Notification"]');
    
    bellBtns.forEach(btn => {
        btn.style.position = 'relative';
        
        let dropdown = btn.querySelector('.notification-dropdown');
        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.className = 'notification-dropdown';
            btn.appendChild(dropdown);
        }

        const count = reorderItems.length;
        let itemsHtml = '';

        if (count === 0) {
            itemsHtml = `
                <div class="noti-empty">
                    <i class="ph ph-check-circle" style="font-size:24px; color:#34d399;"></i>
                    <p>All stock levels are healthy!</p>
                </div>`;
        } else {
            itemsHtml = reorderItems.map(item => {
                const stock = Number(item.stock || 0);
                const rop = Number(item.reorderPoint || item.minimumStock || 5);
                const isOut = stock === 0;
                return `
                    <a href="reorder.html" class="noti-item">
                        <div class="noti-icon ${isOut ? 'out' : 'low'}">
                            <i class="ph ${isOut ? 'ph-x-circle' : 'ph-warning-amber'}"></i>
                        </div>
                        <div class="noti-details">
                            <strong>${escapeHtml(item.name || 'Product')}</strong>
                            <span>${isOut ? 'Out of Stock (0 units)' : `Low Stock: ${stock} units left`} &middot; ROP: ${rop}</span>
                        </div>
                    </a>
                `;
            }).join('');
        }

        dropdown.innerHTML = `
            <div class="noti-header">
                <strong>Reorder Notifications</strong>
                <span class="noti-count-badge">${count} Alert${count !== 1 ? 's' : ''}</span>
            </div>
            <div class="noti-body">
                ${itemsHtml}
            </div>
            <div class="noti-footer">
                <a href="reorder.html">View Reorder Hub &rarr;</a>
            </div>
        `;

        btn.onclick = (e) => {
            e.stopPropagation();
            const isActive = dropdown.classList.contains('show');
            document.querySelectorAll('.notification-dropdown').forEach(d => d.classList.remove('show'));
            if (!isActive) dropdown.classList.add('show');
        };
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.notification-dropdown') && !e.target.closest('.icon-btn.has-badge') && !e.target.closest('#bell-btn')) {
            document.querySelectorAll('.notification-dropdown').forEach(d => d.classList.remove('show'));
        }
    });
}