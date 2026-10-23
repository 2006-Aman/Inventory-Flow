// ==========================================
// SESSION & AUTH CONTROLLER (MongoDB Backend Only)
// Zero LocalStorage usage: sessionStorage is used exclusively for active session & JWT token.
// All product, sale, category data comes EXCLUSIVELY from the Express + MongoDB API.
// ==========================================

// Ensure LocalStorage is completely empty (zero persistent client-side data)
try {
    if (typeof localStorage !== "undefined") {
        localStorage.clear();
    }
} catch (e) {}

// ==========================================
// CURRENT USER SESSION (SessionStorage Only)
// ==========================================

function getCurrentUser() {
    const raw = sessionStorage.getItem("inventory_current_user");
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

function saveCurrentUser(userObj) {
    if (!userObj) return;
    sessionStorage.setItem("inventory_current_user", JSON.stringify(userObj));
    try { localStorage.clear(); } catch (e) {}
    updateGlobalUserUI(userObj);
}

function logoutUser() {
    sessionStorage.removeItem("inventory_current_user");
    sessionStorage.removeItem("inventoryiq_token");
    try { localStorage.clear(); } catch (e) {}
    window.location.href = "login.html";
}

// ==========================================
// BACKEND AUTHENTICATION (Render Production / Localhost Fallback)
// ==========================================

const AUTH_BACKEND_URL = (typeof window !== "undefined" && window.location.origin.includes("5000"))
    ? ""
    : "https://inventory-backend-y8nj.onrender.com";

async function authenticateUser(email, password) {
    const cleanEmail = (email || "").toLowerCase().trim();
    const cleanPass = password || "";

    try {
        const authRes = await fetch(`${AUTH_BACKEND_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: cleanEmail, password: cleanPass })
        });

        const authData = await authRes.json();

        if (authRes.ok && authData.token && authData.user) {
            sessionStorage.setItem("inventoryiq_token", authData.token);
            try { localStorage.clear(); } catch (e) {}
            const userObj = {
                ...authData.user,
                id: authData.user.id || authData.user._id,
                firstName: authData.user.firstName || authData.user.name?.split(' ')[0] || 'User',
                lastName: authData.user.lastName || authData.user.name?.split(' ').slice(1).join(' ') || '',
                organization: 'InventoryIQ Systems',
                avatar: (authData.user.firstName || authData.user.name || authData.user.email)[0].toUpperCase()
            };
            saveCurrentUser(userObj);
            return { success: true, user: userObj };
        }

        return { success: false, message: authData.message || "Invalid email or password." };

    } catch (err) {
        console.error("Login API error:", err);
        return { success: false, message: "Cannot connect to server. Please ensure the backend is running." };
    }
}

async function registerNewUser(newUserObj) {
    try {
        const authRes = await fetch(`${AUTH_BACKEND_URL}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: newUserObj.email,
                password: newUserObj.password,
                name: `${newUserObj.firstName || ''} ${newUserObj.lastName || ''}`.trim() || newUserObj.email,
                firstName: newUserObj.firstName,
                lastName: newUserObj.lastName,
                role: newUserObj.role || 'user'
            })
        });

        const authData = await authRes.json();

        if (authRes.ok && authData.token && authData.user) {
            sessionStorage.setItem("inventoryiq_token", authData.token);
            try { localStorage.clear(); } catch (e) {}
            const userObj = {
                ...authData.user,
                id: authData.user.id || authData.user._id,
                organization: newUserObj.organization || 'InventoryIQ Systems',
                avatar: (newUserObj.firstName || newUserObj.email || 'U')[0].toUpperCase()
            };
            saveCurrentUser(userObj);
            return { success: true, user: userObj };
        }

        return { success: false, message: authData.message || "Registration failed." };

    } catch (err) {
        console.error("Register API error:", err);
        return { success: false, message: "Cannot connect to server. Please ensure the backend is running." };
    }
}

// ==========================================
// PASSWORD UPDATE (via backend API)
// ==========================================

async function updateUserPassword(currentPassword, newPassword) {
    const user = getCurrentUser();
    if (!user) return { success: false, message: "Not logged in." };

    const token = sessionStorage.getItem("inventoryiq_token");
    if (!token) return { success: false, message: "Session expired. Please log in again." };

    try {
        const res = await fetch(`${AUTH_BACKEND_URL}/api/users/me/password`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        const data = await res.json();
        if (res.ok && data.success) return { success: true, message: "Password updated successfully!" };
        return { success: false, message: data.message || "Password update failed." };
    } catch (e) {
        return { success: false, message: "Server error. Cannot update password." };
    }
}

// ==========================================
// GLOBAL USER UI UPDATE
// ==========================================

function updateGlobalUserUI(userObj) {
    const user = userObj || getCurrentUser();
    if (!user) return;

    const fullName = `${user.firstName || 'Aman'} ${user.lastName || 'Sharma'}`.trim();
    const initial = (user.firstName || 'A')[0].toUpperCase();

    document.querySelectorAll('.user-name').forEach(el => el.textContent = user.firstName || 'Aman');

    document.querySelectorAll('.avatar-circle').forEach(el => {
        if (user.avatarImage) {
            el.innerHTML = `<img src="${user.avatarImage}" alt="${fullName}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;">`;
            el.style.backgroundColor = 'transparent';
        } else {
            el.innerHTML = '';
            el.textContent = initial;
            el.style.backgroundColor = '';
        }
    });

    document.querySelectorAll('.user-dropdown-header strong').forEach(el => el.textContent = fullName);
    document.querySelectorAll('.user-dropdown-header span').forEach(el => el.textContent = user.email || 'demo@inventoryflow.com');
    document.querySelectorAll('.greeting-subtitle').forEach(el => el.textContent = `GOOD MORNING • ${(user.firstName || 'AMAN').toUpperCase()}`);
}

// ==========================================
// AUTH GUARD — Redirect unauthenticated users
// ==========================================

function checkAuthGuard() {
    const rawPath = window.location.pathname.split("/").pop() || "index.html";
    const currentPath = rawPath.replace(/\.html$/, "").toLowerCase();
    const isPublicPage = ["login", "signup", "index", ""].includes(currentPath);
    const user = getCurrentUser();

    if (!user && !isPublicPage) {
        window.location.href = "login.html";
        return false;
    }

    const isAuthForm = currentPath === "login" || currentPath === "signup";
    if (user && isAuthForm) {
        window.location.href = "dashboard.html";
        return false;
    }

    return true;
}

// Run auth check
checkAuthGuard();

// Update UI on DOM ready
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
// GLOBAL TOPBAR SEARCH
// ==========================================

function initGlobalTopbarSearch() {
    const searchInputs = document.querySelectorAll('.navbar-search input, .search-box input, #global-search, header input[placeholder*="Search"]');

    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('q') || '';

    searchInputs.forEach(input => {
        if (searchParam && !input.value) input.value = searchParam;

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
// GLOBAL REORDER ALERT BADGES
// ==========================================

async function updateGlobalAlertBadges() {
    let products = [];
    try {
        if (typeof getProducts === 'function') {
            products = await getProducts();
        }
    } catch (e) { /* server may not be ready yet */ }
    if (!Array.isArray(products)) products = [];

    const reorderItems = products.filter(p => {
        const stock = Number(p.stock ?? p.currentStock ?? 0);
        const rop = Number(p.reorderPoint ?? 0);
        const min = Number(p.minimumStock ?? 0);
        const threshold = rop > 0 ? rop : min;
        return stock === 0 || (threshold > 0 && stock <= threshold);
    });

    const alertCount = reorderItems.length;

    document.querySelectorAll('#sidebarAlertCount, #sidebar-reorder-badge, .sidebar-nav a[href*="reorder"] .badge').forEach(b => {
        b.textContent = alertCount;
        b.style.display = alertCount > 0 ? 'inline-flex' : 'none';
    });

    document.querySelectorAll('.dot-badge, #bell-badge, .navbar-right .dot-badge').forEach(b => {
        b.textContent = alertCount;
        b.style.display = alertCount > 0 ? 'inline-flex' : 'none';
    });

    renderNotificationDropdown(reorderItems);
}

function renderNotificationDropdown(reorderItems) {
    const bellBtns = document.querySelectorAll('.icon-btn.has-badge, #bell-btn, #bellBtn, button[title*="Notification"], button[title*="Notifications"]');

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
            itemsHtml = `<div class="noti-empty"><i class="ph ph-check-circle" style="font-size:24px; color:#34d399;"></i><p>All stock levels are healthy!</p></div>`;
        } else {
            itemsHtml = reorderItems.map(item => {
                const stock = Number(item.currentStock ?? item.stock ?? 0);
                const rop = Number(item.reorderPoint ?? item.minimumStock ?? 0);
                const isOut = stock === 0;
                const name = item.productName || item.name || 'Product';
                return `
                    <a href="./reorder.html" class="noti-item" onclick="event.stopPropagation(); window.location.href='./reorder.html';">
                        <div class="noti-icon ${isOut ? 'out' : 'low'}">
                            <i class="ph ${isOut ? 'ph-x-circle' : 'ph-warning-amber'}"></i>
                        </div>
                        <div class="noti-details">
                            <strong>${escapeHtml(name)}</strong>
                            <span>${isOut ? 'Out of Stock (0 units)' : `Low Stock: ${stock} units left`} &middot; ROP: ${rop}</span>
                        </div>
                    </a>`;
            }).join('');
        }

        dropdown.innerHTML = `
            <div class="noti-header">
                <strong>Reorder Notifications</strong>
                <span class="noti-count-badge">${count} Alert${count !== 1 ? 's' : ''}</span>
            </div>
            <div class="noti-body">${itemsHtml}</div>
            <div class="noti-footer"><a href="./reorder.html" onclick="event.stopPropagation(); window.location.href='./reorder.html';">View Reorder Hub &rarr;</a></div>`;

        dropdown.onclick = (e) => e.stopPropagation();
        btn.onclick = (e) => {
            if (e.target.closest('.notification-dropdown')) return;
            e.preventDefault(); e.stopPropagation();
            const isActive = dropdown.classList.contains('show');
            document.querySelectorAll('.notification-dropdown').forEach(d => d.classList.remove('show'));
            if (!isActive) dropdown.classList.add('show');
        };
    });
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('.notification-dropdown')) {
        document.querySelectorAll('.notification-dropdown').forEach(d => d.classList.remove('show'));
    }
});

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}