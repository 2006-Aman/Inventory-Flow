async function getUsers() {
    return await apiGet("/users");
}


async function getUserById(id) {
    return await apiGet(`/users/${id}`);
}


async function addUser(user) {
    return await apiPost("/users", user);
}


async function updateUser(id, user) {
    return await apiPut(`/users/${id}`, user);
}


async function deleteUser(id) {
    return await apiDelete(`/users/${id}`);
}


/**
 * Find user by email
 */
async function getUserByEmail(email) {
    const users = await getUsers();

    return users.find(
        user => user.email.toLowerCase() === email.toLowerCase()
    );
}