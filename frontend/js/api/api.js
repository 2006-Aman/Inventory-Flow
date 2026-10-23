// Automatically resolve Express Backend URL on Port 5000
const API_BASE_URL = (typeof window !== "undefined" && window.location.origin.includes("5000"))
    ? ""
    : "http://localhost:5000";

async function apiRequest(endpoint, options = {}) {
    const token = typeof sessionStorage !== "undefined"
        ? (sessionStorage.getItem("inventoryiq_token") || (typeof localStorage !== "undefined" ? localStorage.getItem("inventoryiq_token") : null))
        : null;
    const authHeaders = token ? { "Authorization": `Bearer ${token}` } : {};

    const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
            headers: {
                "Content-Type": "application/json",
                ...authHeaders,
                ...(options.headers || {})
            },
            ...options
        }
    );

    if (!response.ok) {
        let errorMsg = `API Error: ${response.status} ${response.statusText}`;
        try {
            const errJson = await response.json();
            if (errJson && errJson.message) errorMsg = errJson.message;
        } catch (e) {}
        throw new Error(errorMsg);
    }

    const data = await response.json();

    // Compatibility unwrapping: If backend returns { success: true, products: [...] }, extract the array
    if (data && typeof data === "object" && !Array.isArray(data)) {
        if (Array.isArray(data.products)) return data.products;
        if (Array.isArray(data.sales)) return data.sales;
        if (Array.isArray(data.categories)) return data.categories;
        if (Array.isArray(data.users)) return data.users;
        if (data.product) return data.product;
        if (data.sale) return data.sale;
        if (data.category) return data.category;
        if (data.user) return data.user;
    }

    return data;
}

// Shorthand helpers used by userApi.js, categoryApi.js, etc.
async function apiGet(endpoint) {
    return apiRequest(endpoint);
}

async function apiPost(endpoint, data) {
    return apiRequest(endpoint, { method: "POST", body: JSON.stringify(data) });
}

async function apiPut(endpoint, data) {
    return apiRequest(endpoint, { method: "PUT", body: JSON.stringify(data) });
}

async function apiDelete(endpoint) {
    return apiRequest(endpoint, { method: "DELETE" });
}