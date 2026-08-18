// ==========================================
// USER PROFILE REAL DATA CONTROLLER
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    initProfilePage();
});

function initProfilePage() {
    loadProfileData();
    setupProfileFormHandler();
    setupSecurityFormHandler();
}

function loadProfileData() {
    const user = getCurrentUser();
    
    // Form Inputs
    const firstNameInput = document.getElementById("firstNameInput");
    const lastNameInput = document.getElementById("lastNameInput");
    const emailInput = document.getElementById("emailInput");
    const phoneInput = document.getElementById("phoneInput");
    const orgInput = document.getElementById("organizationInput");
    const desigInput = document.getElementById("designationInput");

    if (firstNameInput) firstNameInput.value = user.firstName || "Aman";
    if (lastNameInput) lastNameInput.value = user.lastName || "Sharma";
    if (emailInput) emailInput.value = user.email || "admin@inventoryflow.com";
    if (phoneInput) phoneInput.value = user.phone || "+91 98765 43210";
    if (orgInput) orgInput.value = user.organization || "InventoryIQ Systems";
    if (desigInput) desigInput.value = user.role || user.designation || "Lead Operations Manager";

    // Header Display Elements
    const headerName = document.getElementById("profileHeaderName");
    const headerRole = document.getElementById("profileHeaderRole");
    const headerEmail = document.getElementById("profileHeaderEmail");
    const salesCountEl = document.getElementById("profileSalesCount");

    if (headerName) headerName.textContent = `${user.firstName || 'Aman'} ${user.lastName || 'Sharma'}`;
    if (headerRole) headerRole.textContent = user.role || user.designation || "Lead Operations Manager";
    if (headerEmail) headerEmail.innerHTML = `<i class="ph ph-envelope-simple" style="color: #38bdf8;"></i> ${user.email || 'admin@inventoryflow.com'}`;

    // Real Sales Count from Local Storage
    if (salesCountEl) {
        const sales = getLocalSales();
        salesCountEl.textContent = sales.length || 0;
    }

    // Sync global UI elements
    updateGlobalUserUI(user);
}

function setupProfileFormHandler() {
    const form = document.getElementById("profileAccountForm");
    if (!form) return;

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const user = getCurrentUser();
        user.firstName = document.getElementById("firstNameInput")?.value.trim() || user.firstName;
        user.lastName = document.getElementById("lastNameInput")?.value.trim() || user.lastName;
        user.email = document.getElementById("emailInput")?.value.trim() || user.email;
        user.phone = document.getElementById("phoneInput")?.value.trim() || user.phone;
        user.organization = document.getElementById("organizationInput")?.value.trim() || user.organization;
        user.avatar = (user.firstName[0] || 'A').toUpperCase();

        // Save real state to localStorage
        saveCurrentUser(user);

        // Reload display
        loadProfileData();

        // Show Toast
        showProfileToast("Account information saved successfully!");
    });
}

function setupSecurityFormHandler() {
    const form = document.getElementById("profileSecurityForm");
    if (!form) return;

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const currentPass = document.getElementById("currentPassInput")?.value || "";
        const newPass = document.getElementById("newPassInput")?.value || "";
        const confirmPass = document.getElementById("confirmPassInput")?.value || "";

        if (!currentPass) {
            showProfileToast("Please enter your current password!", true);
            return;
        }

        if (newPass !== confirmPass) {
            showProfileToast("New passwords do not match!", true);
            return;
        }

        // Call storage controller password update handler
        const result = updateUserPassword(currentPass, newPass);

        if (!result.success) {
            showProfileToast(result.message, true);
            return;
        }

        form.reset();
        showProfileToast(result.message);
    });
}

function showProfileToast(msg, isError = false) {
    const toast = document.getElementById("profileToast");
    const msgEl = document.getElementById("toastMessage");
    if (!toast || !msgEl) return;

    msgEl.textContent = msg;
    toast.style.background = isError ? "#ef4444" : "#0ea5e9";
    toast.style.display = "flex";

    setTimeout(() => {
        toast.style.display = "none";
    }, 3000);
}
