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