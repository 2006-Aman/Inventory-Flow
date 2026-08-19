const API_BASE_URL = "http://localhost:3000";

async function apiRequest(endpoint, options = {}) {
    const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            },
            ...options
        }
    );

    if (!response.ok) {
        throw new Error(
            `API Error: ${response.status} ${response.statusText}`
        );
    }

    return response.json();
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