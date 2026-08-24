// topbar.js - Premium global topbar (shared across every page).
// Greeting + page title, search, calendar date, live clock, notification
// bell, theme toggle and a user avatar/name dropdown.

// =========================================================================
// 1. GLOBAL THEME MANAGER (Works for both static and dynamic topbars)
// =========================================================================

function getSavedTheme() {
    return localStorage.getItem('theme') || 'dark';
}

function syncAllThemeButtons(isLight) {
    const selector = '#theme-toggle, .theme-toggle, [title*="Theme"], [title*="theme"], [aria-label*="Theme"], [aria-label*="theme"]';
    document.querySelectorAll(selector).forEach(btn => {
        const icon = btn.querySelector('i');
        if (icon) {
            icon.className = isLight ? 'ph ph-moon' : 'ph ph-sun';
        }
        btn.title = isLight ? 'Switch to Dark Theme' : 'Switch to Light Theme';
        btn.setAttribute('aria-label', isLight ? 'Switch to Dark Theme' : 'Switch to Light Theme');
    });

    const themeSelect = document.getElementById('themeSelect') || document.getElementById('systemTheme');
    if (themeSelect) {
        themeSelect.value = isLight ? 'light' : 'dark';
    }
}

function applyGlobalTheme(theme) {
    const isLight = theme === 'light';
    
    // Toggle theme-light class on documentElement and body
    if (document.documentElement) {
        document.documentElement.classList.toggle('theme-light', isLight);
    }
    if (document.body) {
        document.body.classList.toggle('theme-light', isLight);
    }
    
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    syncAllThemeButtons(isLight);

    // Notify other components/charts
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: isLight ? 'light' : 'dark', isLight } }));
}

function toggleGlobalTheme() {
    const currentTheme = getSavedTheme();
    const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyGlobalTheme(nextTheme);
    return nextTheme;
}

// Global click event delegation for theme buttons
document.addEventListener('click', (e) => {
    const themeBtn = e.target.closest('#theme-toggle, .theme-toggle, [title*="Theme"], [title*="theme"], [aria-label*="Theme"], [aria-label*="theme"], button:has(.ph-sun), button:has(.ph-moon)');
    if (themeBtn) {
        e.preventDefault();
        e.stopPropagation();
        toggleGlobalTheme();
    }
});

// Immediate initial execution & on DOM ready
(function initTheme() {
    const theme = getSavedTheme();
    applyGlobalTheme(theme);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => applyGlobalTheme(getSavedTheme()));
    }
})();

// Expose globally
window.applyGlobalTheme = applyGlobalTheme;
window.toggleGlobalTheme = toggleGlobalTheme;
window.getSavedTheme = getSavedTheme;


// =========================================================================
// 2. APP TOPBAR CUSTOM ELEMENT (For components using <app-topbar>)
// =========================================================================

const topbarHTML = `
<header class="global-topbar">
    <div class="topbar-left">
        <button class="icon-btn menu-btn" id="menu-toggle" title="Toggle menu" aria-label="Toggle menu"><i class="ph ph-list"></i></button>
        <div class="page-title">
            <p class="greeting-line"><span id="greeting-text">Good morning</span> &middot; <span id="greeting-name">there</span></p>
            <h1 id="dynamic-page-title">Operations Dashboard</h1>
        </div>
    </div>

    <div class="topbar-right">
        <div class="search-box">
            <i class="ph ph-magnifying-glass"></i>
            <input id="global-search" type="text" placeholder="Search or jump to...">
        </div>

        <div class="date-chip" title="Today's date">
            <i class="ph ph-calendar-dots"></i>
            <span id="current-date">--</span>
        </div>

        <div class="time-display" id="time-display">--:--:--</div>

        <button class="icon-btn theme-toggle" id="theme-toggle" title="Toggle theme" aria-label="Toggle theme"><i class="ph ph-sun"></i></button>

        <button class="icon-btn" id="bell-btn" title="Notifications">
            <i class="ph ph-bell"></i>
            <div class="badge-dot" id="bell-badge" style="display:none;">0</div>
        </button>

        <div class="user-menu" id="user-menu">
            <button class="user-trigger" id="user-trigger" title="Account">
                <div class="avatar-top" id="avatar-top">A</div>
                <span class="user-name" id="user-name">Aman</span>
                <i class="ph ph-caret-down"></i>
            </button>
            <div class="user-dropdown" id="user-dropdown">
                <div class="user-dropdown-head">
                    <strong id="dd-name">Aman</strong>
                    <span id="dd-email">demo@inventoryflow.com</span>
                </div>
                <a href="settings.html"><i class="ph ph-sliders"></i> Settings</a>
                <button id="user-signout"><i class="ph ph-sign-out"></i> Sign out</button>
            </div>
        </div>
    </div>
</header>
`;

class AppTopbar extends HTMLElement {
    connectedCallback() {
        this.innerHTML = topbarHTML;

        // Use the page's own <title> for the topbar heading
        if (document.title) {
            const pageTitle = document.title.split('|')[0].trim();
            const headingEl = this.querySelector('#dynamic-page-title');
            if (headingEl && pageTitle) headingEl.innerText = pageTitle;
        }

        this.renderGreeting();
        this.renderDate();
        this.startClock();
        applyGlobalTheme(getSavedTheme());
        this.setupSearch();
        this.setupUserMenu();
        this.setupMobileNav();
        this.refreshBadges();

        document.addEventListener('DOMContentLoaded', () => {
            this.renderGreeting();
            this.refreshBadges();
        });
    }

    // "Good morning / afternoon / evening" based on the time of day
    renderGreeting() {
        const hour = new Date().getHours();
        const text = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
        const greetingText = this.querySelector('#greeting-text');
        const greetingName = this.querySelector('#greeting-name');
        if (greetingText) greetingText.textContent = text;
        if (greetingName) greetingName.textContent = 'Aman';
    }

    renderDate() {
        const el = this.querySelector('#current-date');
        if (!el) return;
        const d = new Date();
        const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
        el.textContent = d.toLocaleDateString('en-GB', options);
    }

    // Live clock
    startClock() {
        const el = this.querySelector('#time-display');
        if (!el) return;
        const tick = () => {
            const d = new Date();
            el.textContent = d.toLocaleTimeString('en-GB', { hour12: false });
        };
        tick();
        setInterval(tick, 1000);
    }

    // Topbar search: Enter jumps to the inventory page with the query
    setupSearch() {
        const input = this.querySelector('#global-search');
        if (!input) return;
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && input.value.trim()) {
                window.location.href = 'inventory.html?q=' + encodeURIComponent(input.value.trim());
            }
        });
    }

    // Mobile: hamburger toggles the off-canvas sidebar
    setupMobileNav() {
        const btn = this.querySelector('#menu-toggle');
        if (!btn) return;

        const toggle = (open) => {
            document.body.classList.toggle('sidebar-open', open);
            const icon = btn.querySelector('i');
            if (icon) icon.className = open ? 'ph ph-x' : 'ph ph-list';
            btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        };

        btn.addEventListener('click', () => toggle(!document.body.classList.contains('sidebar-open')));

        // Close when tapping a nav link or anywhere outside the sidebar
        document.addEventListener('click', (e) => {
            if (!document.body.classList.contains('sidebar-open')) return;
            const insideSidebar = e.target.closest('app-sidebar, .sidebar');
            const insideToggle = e.target.closest('#menu-toggle');
            if (insideSidebar && !e.target.closest('.sidebar-nav a')) return;
            if (!insideSidebar && !insideToggle) toggle(false);
        });
    }

    // User avatar + dropdown menu
    setupUserMenu() {
        const menu = this.querySelector('#user-menu');
        const trigger = this.querySelector('#user-trigger');
        if (!menu || !trigger) return;

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('open');
        });

        // Close when clicking anywhere else
        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target)) menu.classList.remove('open');
        });

        const signout = this.querySelector('#user-signout');
        if (signout) {
            signout.addEventListener('click', () => {
                alert('Signed out successfully.');
            });
        }
    }

    refreshBadges() {
        if (typeof updateGlobalAlertBadges === 'function') {
            updateGlobalAlertBadges();
        }
    }
}

if (!customElements.get('app-topbar')) {
    customElements.define('app-topbar', AppTopbar);
}
