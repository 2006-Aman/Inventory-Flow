/* ==========================================================================
   GLOBAL UTILITY HELPERS & SYSTEM SETTINGS DYNAMIC CURRENCY CONVERSION
   ========================================================================== */

const DEFAULT_SYSTEM_SETTINGS = {
    defaultLeadTime: 7,
    safetyStockBuffer: 5,
    criticalLevelPercent: 20,
    autoReorderToggle: true,
    storeName: "Inventory Flow Mart",
    currencySymbol: "₹",
    taxRate: 18
};

const EXCHANGE_RATES_FROM_INR = {
    "₹": 1.0,
    "$": 1 / 83.5,
    "€": 1 / 91.0,
    "£": 1 / 106.0
};

function getSystemSettings() {
    try {
        const stored = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("system_settings") : null;
        return stored ? { ...DEFAULT_SYSTEM_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SYSTEM_SETTINGS;
    } catch (e) {
        return DEFAULT_SYSTEM_SETTINGS;
    }
}

function getCurrencySymbol() {
    const settings = getSystemSettings();
    return settings.currencySymbol || "₹";
}

function getCurrencyRate() {
    const symbol = getCurrencySymbol();
    return EXCHANGE_RATES_FROM_INR[symbol] || 1.0;
}

function convertCurrency(amountInINR) {
    const num = Number(amountInINR || 0);
    const rate = getCurrencyRate();
    return num * rate;
}

function formatCurrency(amountInINR) {
    const convertedNum = convertCurrency(amountInINR);
    const symbol = getCurrencySymbol();
    const isForeign = symbol !== "₹";

    return `${symbol}${convertedNum.toLocaleString(isForeign ? 'en-US' : 'en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateString) {
    if (!dateString) return "N/A";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

var escapeHtml = function(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

function getStoreName() {
    const settings = getSystemSettings();
    return settings.storeName || "Inventory Flow Mart";
}

function getTaxRate() {
    const settings = getSystemSettings();
    return Number.isFinite(Number(settings.taxRate)) ? Number(settings.taxRate) : 18;
}

