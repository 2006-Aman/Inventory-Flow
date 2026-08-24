/* ==========================================================================
   SYSTEM SETTINGS & PREFERENCES CONTROLLER
   - Sidebar Tab Switching (Inventory, Business, Notifications, Data)
   - Load & Save Config to LocalStorage ("system_settings")
   - Database Export JSON & Import Backup
   - Reset Cache Data
   - Toast Notifications
   ========================================================================== */

const getDom = (id) => document.getElementById(id);

const DEFAULT_SETTINGS = {
    defaultLeadTime: 7,
    safetyStockBuffer: 5,
    criticalLevelPercent: 20,
    autoReorderToggle: true,
    storeName: "Inventory Flow Mart",
    currencySymbol: "₹",
    businessEmail: "admin@inventoryflow.com",
    taxRate: 18,
    lowStockBannerToggle: true,
    emailAlertToggle: true,
    minMarginAlert: 15,
    theme: "dark"
};

document.addEventListener("DOMContentLoaded", initSettingsPage);

async function initSettingsPage() {
    try {
        await checkServerStatus();
        setupTabSwitching();
        loadSettingsValues();
        setupFormEventHandlers();
        setupDataBackupHandlers();
    } catch (error) {
        console.error("Settings Page Init Error:", error);
    }
}

async function checkServerStatus() {
    const serverStatus = getDom("serverStatus");
    try {
        if (typeof getProducts === "function") {
            await getProducts();
        }
        if (serverStatus) {
            serverStatus.textContent = "● Server Connected";
            serverStatus.style.color = "#34d399";
        }
    } catch (error) {
        if (serverStatus) {
            serverStatus.textContent = "● Server Offline";
            serverStatus.style.color = "#f87171";
        }
    }
}

// ==========================================
// 1. TAB SWITCHING
// ==========================================

function setupTabSwitching() {
    const tabBtns = document.querySelectorAll(".settings-tab-btn");
    const panels = document.querySelectorAll(".settings-panel");

    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            tabBtns.forEach(b => b.classList.remove("active"));
            panels.forEach(p => p.classList.remove("active"));

            btn.classList.add("active");
            const targetId = btn.getAttribute("data-tab");
            const targetPanel = getDom(targetId);
            if (targetPanel) targetPanel.classList.add("active");
        });
    });
}

// ==========================================
// 2. LOAD & SAVE SETTINGS
// ==========================================

function getSavedSettings() {
    try {
        const stored = localStorage.getItem("system_settings");
        return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch (e) {
        return DEFAULT_SETTINGS;
    }
}

function loadSettingsValues() {
    const config = getSavedSettings();
    const currentTheme = localStorage.getItem('theme') || config.theme || 'dark';

    if (getDom("defaultLeadTime")) getDom("defaultLeadTime").value = config.defaultLeadTime;
    if (getDom("safetyStockBuffer")) getDom("safetyStockBuffer").value = config.safetyStockBuffer;
    if (getDom("criticalLevelPercent")) getDom("criticalLevelPercent").value = config.criticalLevelPercent;
    if (getDom("autoReorderToggle")) getDom("autoReorderToggle").checked = Boolean(config.autoReorderToggle);

    if (getDom("storeName")) getDom("storeName").value = config.storeName;
    if (getDom("currencySymbol")) getDom("currencySymbol").value = config.currencySymbol;
    if (getDom("businessEmail")) getDom("businessEmail").value = config.businessEmail;
    if (getDom("taxRate")) getDom("taxRate").value = config.taxRate;
    if (getDom("themeSelect")) getDom("themeSelect").value = currentTheme;

    if (getDom("lowStockBannerToggle")) getDom("lowStockBannerToggle").checked = Boolean(config.lowStockBannerToggle);
    if (getDom("emailAlertToggle")) getDom("emailAlertToggle").checked = Boolean(config.emailAlertToggle);
    if (getDom("minMarginAlert")) getDom("minMarginAlert").value = config.minMarginAlert;
}

function setupFormEventHandlers() {
    const saveBtn = getDom("saveSettingsBtn");
    if (saveBtn) {
        saveBtn.addEventListener("click", saveSettingsValues);
    }

    const themeSelect = getDom("themeSelect");
    if (themeSelect) {
        themeSelect.addEventListener("change", (e) => {
            const selectedTheme = e.target.value;
            if (typeof applyGlobalTheme === "function") {
                applyGlobalTheme(selectedTheme);
            } else {
                localStorage.setItem('theme', selectedTheme);
                document.body.classList.toggle('theme-light', selectedTheme === 'light');
                document.documentElement.classList.toggle('theme-light', selectedTheme === 'light');
            }
        });
    }
}

function saveSettingsValues() {
    const existing = getSavedSettings();
    const storeNameVal = getDom("storeName") ? getDom("storeName").value.trim() : existing.storeName;
    const currencyVal = getDom("currencySymbol") ? getDom("currencySymbol").value : existing.currencySymbol;
    const taxRateVal = getDom("taxRate") ? Number(getDom("taxRate").value) : existing.taxRate;
    const themeVal = getDom("themeSelect") ? getDom("themeSelect").value : (localStorage.getItem('theme') || 'dark');

    const updated = {
        ...existing,
        defaultLeadTime: getDom("defaultLeadTime") ? Number(getDom("defaultLeadTime").value) : existing.defaultLeadTime,
        safetyStockBuffer: getDom("safetyStockBuffer") ? Number(getDom("safetyStockBuffer").value) : existing.safetyStockBuffer,
        criticalLevelPercent: getDom("criticalLevelPercent") ? Number(getDom("criticalLevelPercent").value) : existing.criticalLevelPercent,
        autoReorderToggle: getDom("autoReorderToggle") ? Boolean(getDom("autoReorderToggle").checked) : existing.autoReorderToggle,
        storeName: storeNameVal || "Inventory Flow Mart",
        currencySymbol: currencyVal || "₹",
        taxRate: Number.isFinite(taxRateVal) ? taxRateVal : 18,
        theme: themeVal
    };

    if (getDom("businessEmail")) updated.businessEmail = getDom("businessEmail").value.trim();
    if (getDom("lowStockBannerToggle")) updated.lowStockBannerToggle = Boolean(getDom("lowStockBannerToggle").checked);
    if (getDom("emailAlertToggle")) updated.emailAlertToggle = Boolean(getDom("emailAlertToggle").checked);
    if (getDom("minMarginAlert")) updated.minMarginAlert = Number(getDom("minMarginAlert").value);

    localStorage.setItem("system_settings", JSON.stringify(updated));
    localStorage.setItem("theme", themeVal);
    if (typeof applyGlobalTheme === "function") {
        applyGlobalTheme(themeVal);
    }

    // Also sync storeName to logged-in user profile organization if active
    const currentUser = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    if (currentUser && updated.storeName) {
        currentUser.organization = updated.storeName;
        if (typeof saveCurrentUser === "function") {
            saveCurrentUser(currentUser);
        } else {
            localStorage.setItem("inventory_current_user", JSON.stringify(currentUser));
        }
    }

    showToast("✓ Settings & Store Preferences Saved Successfully!");
}

// ==========================================
// 3. DATABASE BACKUP & EXPORT JSON
// ==========================================

function setupDataBackupHandlers() {
    const exportBtn = getDom("exportJsonBtn");
    const importBtn = getDom("importJsonBtn");
    const importInput = getDom("importJsonInput");
    const resetBtn = getDom("resetDemoBtn");

    // Export JSON
    if (exportBtn) {
        exportBtn.addEventListener("click", async () => {
            try {
                let prods = [];
                let sales = [];

                try { prods = await getProducts(); } catch (e) { prods = getLocalProducts() || []; }
                try { sales = await getSales(); } catch (e) { sales = getLocalSales() || []; }

                const backupData = {
                    version: "1.0",
                    timestamp: new Date().toISOString(),
                    settings: getSavedSettings(),
                    products: prods,
                    sales: sales
                };

                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
                const a = document.createElement("a");
                a.href = dataStr;
                a.download = `Inventory_Backup_${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                showToast("📥 Database Backup JSON Exported!");
            } catch (err) {
                console.error("Export Error:", err);
                showToast("Failed to export backup JSON.", true);
            }
        });
    }

    // Import JSON
    if (importBtn && importInput) {
        importBtn.addEventListener("click", () => importInput.click());

        importInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const parsed = JSON.parse(evt.target.result);
                    if (parsed.products && Array.isArray(parsed.products)) {
                        localStorage.setItem("local_products", JSON.stringify(parsed.products));
                    }
                    if (parsed.sales && Array.isArray(parsed.sales)) {
                        localStorage.setItem("local_sales", JSON.stringify(parsed.sales));
                    }
                    if (parsed.settings) {
                        localStorage.setItem("system_settings", JSON.stringify(parsed.settings));
                    }
                    showToast("📤 Backup Restored Successfully! Reloading...");
                    setTimeout(() => window.location.reload(), 1200);
                } catch (jsonErr) {
                    alert("Invalid JSON backup file format.");
                }
            };
            reader.readAsText(file);
        });
    }

    // Reset Cache
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            if (confirm("Are you sure you want to clear system cache & reload default data?")) {
                localStorage.removeItem("local_products");
                localStorage.removeItem("local_sales");
                localStorage.removeItem("system_settings");
                showToast("♻️ Cache Cleared! Reloading page...");
                setTimeout(() => window.location.reload(), 1000);
            }
        });
    }
}

// ==========================================
// TOAST NOTIFICATION HELPERS
// ==========================================

function showToast(message, isError = false) {
    const container = getDom("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "toast-msg";
    if (isError) toast.style.borderColor = "#f87171";

    toast.innerHTML = `<i class="ph ${isError ? 'ph-warning' : 'ph-check-circle'}" style="color:${isError ? '#f87171' : '#34d399'}; font-size:20px;"></i> ${escapeHtml(message)}`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(20px)";
        toast.style.transition = "all 0.3s ease";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
