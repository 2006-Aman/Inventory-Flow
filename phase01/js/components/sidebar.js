// sidebar.js - Premium navigation sidebar (shared across every page).
// Renders the logo, main menu, live reorder badge, the "Forecast Engine"
// card with a circular progress ring and a refresh countdown, and a
// compact signed-in user footer.

// GLOBAL AUTH GUARD
// If the user is not signed in, instantly kick them to the login screen.
if (typeof getCurrentUser === 'function' && !getCurrentUser()) {
    window.location.replace('login.html');
}

const sidebarHTML = `
<aside class="sidebar">
    <div class="sidebar-logo">
        <a href="dashboard.html" class="sidebar-logo-link" style="display: flex; align-items: center; gap: 12px; text-decoration: none; color: inherit;">
            <div class="logo-icon" title="InventoryIQ" style="width: 42px; height: 42px; flex: 0 0 42px;">
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%; display: block;">
                  <defs>
                    <linearGradient id="iq-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#38bdf8"/>
                      <stop offset="50%" stop-color="#0ea5e9"/>
                      <stop offset="100%" stop-color="#6366f1"/>
                    </linearGradient>
                    <linearGradient id="iq-bar-grad" x1="0%" y1="100%" x2="0%" y2="0%">
                      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.3"/>
                      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.95"/>
                    </linearGradient>
                    <filter id="iq-glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>
                  
                  <!-- Outer glowing box -->
                  <rect x="6" y="6" width="88" height="88" rx="24" fill="url(#iq-logo-grad)" />
                  <rect x="7" y="7" width="86" height="86" rx="23" stroke="#ffffff" stroke-opacity="0.35" stroke-width="2" />
                  
                  <!-- Bar chart bars -->
                  <rect x="24" y="52" width="10" height="22" rx="3" fill="url(#iq-bar-grad)" opacity="0.6" />
                  <rect x="42" y="40" width="10" height="34" rx="3" fill="url(#iq-bar-grad)" opacity="0.8" />
                  <rect x="60" y="26" width="10" height="48" rx="3" fill="#ffffff" />
                  
                  <!-- Dynamic upward trend curve -->
                  <path d="M 20 62 Q 38 48 55 36 T 80 20" stroke="#ffffff" stroke-width="5" stroke-linecap="round" fill="none" filter="url(#iq-glow)" />
                  
                  <!-- Sparkle dot at apex -->
                  <circle cx="80" cy="20" r="6" fill="#38bdf8" stroke="#ffffff" stroke-width="2.5" />
                </svg>
            </div>

            <div class="logo-text">
                <h2>Inventory<span>IQ</span></h2>
                <p>Forecast &middot; Reorder &middot; Grow</p>
            </div>
        </a>
        <button class="icon-btn mobile-close-btn" id="sidebar-close-btn" aria-label="Close menu" style="display: none; margin-left: auto; border: none; font-size: 20px;"><i class="ph ph-x"></i></button>
    </div>

    <nav class="sidebar-nav">
        <a href="dashboard.html" data-name="Dashboard"><i class="ph ph-squares-four"></i><span>Dashboard</span></a>
        <a href="inventory.html" data-name="Inventory"><i class="ph ph-cube"></i><span>Inventory</span></a>
        <a href="add-product.html" data-name="Add Product"><i class="ph ph-package"></i><span>Add Product</span></a>
        <a href="sales.html" data-name="Sales"><i class="ph ph-shopping-cart-simple"></i><span>Sales</span></a>
        <a href="sales-history.html" data-name="Sales History"><i class="ph ph-clock-counter-clockwise"></i><span>Sales History</span></a>
        <a href="reorder.html" data-name="Reorder Alerts"><i class="ph ph-bell"></i><span>Reorder Alerts</span><span class="badge" id="sidebar-reorder-badge" style="display:none;">0</span></a>
        <a href="forecast.html" data-name="Demand Forecast"><i class="ph ph-chart-line"></i><span>Demand Forecast</span></a>
        <a href="analytics.html" data-name="Analytics"><i class="ph ph-chart-bar"></i><span>Analytics</span></a>
        <a href="reports.html" data-name="Reports"><i class="ph ph-file-text"></i><span>Reports</span></a>
        <a href="settings.html" data-name="Settings"><i class="ph ph-sliders-horizontal"></i><span>Settings</span></a>
    </nav>

    <div class="sidebar-footer">
        <div class="engine-card">
            <div class="engine-top">
                <span class="engine-status"><span class="engine-dot"></span> Running</span>
                <a class="engine-link" href="forecast.html">View</a>
            </div>
            <div class="engine-body">
                <div class="engine-ring" id="engine-ring" style="--pct: 266deg;">
                    <div class="engine-ring-inner"><span id="engine-ring-value">74%</span></div>
                </div>
                <div class="engine-info">
                    <h4>Forecast Engine</h4>
                    <p>Moving Average &middot; 7d</p>
                    <p class="engine-next">Next refresh in <span id="engine-countdown">16:06:29</span></p>
                </div>
            </div>
        </div>
    </div>
</aside>
`;

class AppSidebar extends HTMLElement {
    connectedCallback() {
        this.innerHTML = sidebarHTML;
        this.updateActiveLink();
        this.refreshBadge();
        this.initEngineCard();
        this.setupMobileClose();
        document.addEventListener('DOMContentLoaded', () => this.refreshBadge());
    }

    setupMobileClose() {
        const closeBtn = this.querySelector('#sidebar-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                document.body.classList.remove('sidebar-open');
                const topbarBtn = document.querySelector('#menu-toggle');
                if (topbarBtn) {
                    const icon = topbarBtn.querySelector('i');
                    if (icon) icon.className = 'ph ph-list';
                    topbarBtn.setAttribute('aria-expanded', 'false');
                }
            });
        }
    }

    // Highlight the link matching the current page
    updateActiveLink(path) {
        const currentPath = path || window.location.pathname.split('/').pop() || 'dashboard.html';
        const links = this.querySelectorAll('.sidebar-nav a');
        links.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
            }
        });
    }

    // Keep the reorder notification badge in sync with LocalStorage
    refreshBadge() {
        const badge = this.querySelector('#sidebar-reorder-badge');
        if (!badge) return;
        if (typeof initializeDatabase === 'function') {
            initializeDatabase().then(() => {
                const count = countProductsNeedingReorder();
                badge.textContent = count;
                badge.style.display = count > 0 ? 'inline-block' : 'none';
            });
        } else {
            badge.textContent = "0";
            badge.style.display = "none";
        }
    }

    initEngineCard() {
        updateSidebarEngineCard(this);
    }
}

if (!customElements.get('app-sidebar')) {
    customElements.define('app-sidebar', AppSidebar);
}

// Global standalone engine card controller for static sidebars
async function updateSidebarEngineCard(container = document) {
    const ring = container.querySelector('#engine-ring');
    const ringValue = container.querySelector('#engine-ring-value');
    const badge = container.querySelector('#sidebar-reorder-badge') || container.querySelector('#sidebarAlertCount');

    // 1. Live Stock Health Calculation
    try {
        let products = [];
        if (typeof getProducts === 'function') {
            try {
                const res = await getProducts();
                products = Array.isArray(res) ? res : [];
            } catch (err) {
                products = [];
            }
        }
        if (!products.length && typeof getLocalProducts === 'function') {
            products = getLocalProducts() || [];
        }

        if (products.length > 0) {
            const inStockCount = products.filter(p => {
                const stock = Number(p.stock ?? p.currentStock ?? 0);
                const min = Number(p.minimumStock ?? 5);
                const rop = Number(p.reorderPoint ?? min);
                return stock > rop;
            }).length;
            const health = Math.round((inStockCount / products.length) * 100);

            if (ring) ring.style.setProperty('--pct', (health * 3.6) + 'deg');
            if (ringValue) ringValue.textContent = health + '%';

            const reorderNeededCount = products.length - inStockCount;
            if (badge) {
                badge.textContent = reorderNeededCount;
                badge.style.display = reorderNeededCount > 0 ? 'inline-block' : 'none';
            }
        } else {
            if (ring) ring.style.setProperty('--pct', '0deg');
            if (ringValue) ringValue.textContent = '0%';
            if (badge) {
                badge.textContent = '0';
                badge.style.display = 'none';
            }
        }
    } catch (e) {
        console.warn("Could not calculate live engine health:", e);
    }

    // 2. Countdown Timer (Ticking every second)
    if (!window._sidebarCountdownInterval) {
        const tick = () => {
            const el = document.querySelector('#engine-countdown');
            if (!el) return;
            const now = new Date();
            const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
            let diff = Math.floor((midnight - now) / 1000);
            if (diff < 0) diff = 0;
            const h = String(Math.floor(diff / 3600)).padStart(2, '0');
            const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
            const s = String(diff % 60).padStart(2, '0');
            el.textContent = `${h}:${m}:${s}`;
        };
        tick();
        window._sidebarCountdownInterval = setInterval(tick, 1000);
    }
}

// ==========================================
// SMOOTH PAGE TRANSITION INTERCEPTOR
// ==========================================
function setupSmoothNavigation() {
    document.addEventListener("click", (e) => {
        const link = e.target.closest("a[href]");
        if (!link) return;

        const href = link.getAttribute("href");
        if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("javascript:")) return;
        if (e.metaKey || e.ctrlKey || link.target === "_blank") return;

        const currentPath = window.location.pathname.split("/").pop() || "dashboard.html";
        if (href === currentPath || href === `./${currentPath}`) return;

        e.preventDefault();

        const targetEl = document.querySelector(".content") || document.querySelector(".main-wrapper") || document.body;
        targetEl.style.transition = "opacity 0.14s cubic-bezier(0.16, 1, 0.3, 1), transform 0.14s cubic-bezier(0.16, 1, 0.3, 1)";
        targetEl.style.opacity = "0";
        targetEl.style.transform = "translateY(-6px)";

        setTimeout(() => {
            window.location.href = href;
        }, 130);
    });
}

// ==========================================
// GLOBAL TOPBAR LIVE DATE & CLOCK
// ==========================================
function initGlobalClock() {
    const update = () => {
        const d = new Date();
        const dateEl = document.getElementById("liveDate");
        const timeEl = document.getElementById("liveTime");

        if (dateEl) {
            const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
            dateEl.textContent = d.toLocaleDateString('en-GB', options);
        }
        if (timeEl) {
            timeEl.textContent = d.toLocaleTimeString('en-GB', { hour12: false });
        }
    };
    update();
    setInterval(update, 1000);
}

// ==========================================
// USER PROFILE DROPDOWN MENU INTERACTION
// ==========================================
function setupUserProfileDropdown() {
    document.addEventListener("click", (e) => {
        const profileBtn = e.target.closest(".user-profile");
        const allDropdowns = document.querySelectorAll(".user-dropdown-menu");

        if (profileBtn) {
            e.stopPropagation();
            const dropdown = profileBtn.querySelector(".user-dropdown-menu");
            if (dropdown) {
                const isActive = dropdown.classList.contains("active");
                allDropdowns.forEach(d => d.classList.remove("active"));
                if (!isActive) dropdown.classList.add("active");
            }
        } else {
            allDropdowns.forEach(d => d.classList.remove("active"));
        }

        const signOutBtn = e.target.closest("#globalSignOutBtn") || e.target.closest(".user-dropdown-item.signout");
        if (signOutBtn) {
            if (typeof clearCurrentUser === "function") {
                clearCurrentUser();
            } else {
                localStorage.removeItem("currentUser");
            }
            window.location.href = "login.html";
        }
    });
}

// Auto-initialize for sidebars, smooth navigation, clock & profile dropdown
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        updateSidebarEngineCard();
        setupSmoothNavigation();
        initGlobalClock();
        setupUserProfileDropdown();
    });
} else {
    updateSidebarEngineCard();
    setupSmoothNavigation();
    initGlobalClock();
    setupUserProfileDropdown();
}
