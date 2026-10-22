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
    setupAvatarUploadHandler();
    if (typeof updateGlobalAlertBadges === 'function') {
        updateGlobalAlertBadges();
    }
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
    if (emailInput) emailInput.value = user.email || "demo@inventoryflow.com";
    if (phoneInput) phoneInput.value = user.phone || "+91 98765 43210";
    if (orgInput) orgInput.value = user.organization || "InventoryIQ Systems";
    if (desigInput) desigInput.value = user.role || user.designation || "Lead Operations Manager";

    // Header Display Elements
    const headerName = document.getElementById("profileHeaderName");
    const headerRole = document.getElementById("profileHeaderRole");
    const headerEmail = document.getElementById("profileHeaderEmail");
    const salesCountEl = document.getElementById("profileSalesCount");
    const largeAvatar = document.getElementById("profileAvatarLarge");
    const removeBtn = document.getElementById("removePhotoBtn");
    const separator = document.getElementById("avatarActionSeparator");
    const changeBtn = document.getElementById("changePhotoBtn");

    const fullName = `${user.firstName || 'Aman'} ${user.lastName || 'Sharma'}`.trim();
    const initial = (user.firstName || 'A')[0].toUpperCase();

    if (headerName) headerName.textContent = fullName;
    if (headerRole) headerRole.textContent = user.role || user.designation || "Lead Operations Manager";
    if (headerEmail) headerEmail.innerHTML = `<i class="ph ph-envelope-simple" style="color: #38bdf8;"></i> ${user.email || 'demo@inventoryflow.com'}`;

    // Update Large Profile Avatar
    if (largeAvatar) {
        if (user.avatarImage) {
            largeAvatar.innerHTML = `<img src="${user.avatarImage}" alt="${fullName}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;">`;
            largeAvatar.style.background = "transparent";
            if (removeBtn) removeBtn.style.display = "inline-block";
            if (separator) separator.style.display = "inline";
            if (changeBtn) changeBtn.textContent = "Change";
        } else {
            largeAvatar.innerHTML = '';
            largeAvatar.textContent = initial;
            largeAvatar.style.background = "#0284c7";
            if (removeBtn) removeBtn.style.display = "none";
            if (separator) separator.style.display = "none";
            if (changeBtn) changeBtn.textContent = "Upload";
        }
    }

    // Real Sales Count from API
    if (salesCountEl) {
        if (typeof getSales === 'function') {
            getSales().then(s => {
                salesCountEl.textContent = Array.isArray(s) ? s.length : 0;
            }).catch(err => {
                console.warn("Could not load sales count for profile:", err);
                salesCountEl.textContent = "0";
            });
        } else {
            salesCountEl.textContent = "0";
        }
    }

    // Sync global UI elements
    updateGlobalUserUI(user);
}

function setupAvatarUploadHandler() {
    const fileInput = document.getElementById("avatarFileInput");
    const avatarContainer = document.getElementById("profileAvatarContainer");
    const changeBtn = document.getElementById("changePhotoBtn");
    const removeBtn = document.getElementById("removePhotoBtn");

    if (avatarContainer && fileInput) {
        avatarContainer.addEventListener("click", () => fileInput.click());
    }
    if (changeBtn && fileInput) {
        changeBtn.addEventListener("click", () => fileInput.click());
    }

    if (fileInput) {
        fileInput.addEventListener("change", (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            if (!file.type.startsWith("image/")) {
                showProfileToast("Please select a valid image file (PNG, JPG, etc.)", true);
                return;
            }

            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    // Compress image using Canvas to max 300x300 for optimal localStorage footprint
                    const canvas = document.createElement("canvas");
                    const maxDim = 300;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxDim) {
                            height = Math.round((height * maxDim) / width);
                            width = maxDim;
                        }
                    } else {
                        if (height > maxDim) {
                            width = Math.round((width * maxDim) / height);
                            height = maxDim;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, width, height);

                    const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);

                    // Save to user profile
                    const user = getCurrentUser();
                    user.avatarImage = compressedDataUrl;
                    saveCurrentUser(user);

                    // Update UI across all components
                    loadProfileData();
                    showProfileToast("Profile photo updated successfully!");
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);

            // Reset input so same image can be re-selected if needed
            fileInput.value = "";
        });
    }

    if (removeBtn) {
        removeBtn.addEventListener("click", () => {
            const user = getCurrentUser();
            delete user.avatarImage;
            saveCurrentUser(user);
            loadProfileData();
            showProfileToast("Profile photo removed.");
        });
    }
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

