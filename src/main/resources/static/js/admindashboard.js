// ===== GLOBAL VARIABLES =====
let currentUserPage = 1;
let currentBookPage = 1;
let currentSuggestionPage = 1;

const usersPerPage = 6;
const booksPerPage = 6;
const suggestionsPerPage = 6;

let allUsers = [];
let allBooks = [];
let allSuggestions = [];
let allPendingCategories = [];
let allApprovedCategories = [];

let currentRejectBookId = null;
let currentApproveSuggestionId = null;
let currentRejectSuggestionId = null;
let currentApproveCategoryId = null;

// ===== DASHBOARD INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {

    checkAdminAuth();
    loadDashboardSummary();
    loadUsers();
    loadBooks();
    loadSuggestions();
    loadPendingCategories();
    setupEventListeners();

});

function checkAdminAuth() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userJson = localStorage.getItem('user');

    if (!isLoggedIn || !userJson) {
        window.location.href = '/admin-login';
        return;
    }

    try {
        const user = JSON.parse(userJson);
        if (user.role !== 'ADMIN') {
            window.location.href = '/admin-login';
        }
    } catch (error) {
        window.location.href = '/admin-login';
    }
}

// ===== NAVIGATION FUNCTIONS =====
function showSection(sectionId) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active');
    });

    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.classList.remove('active');
    });

    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    const targetMenuItem = document.querySelector(`.menu-item[onclick="showSection('${sectionId}')"]`);
    if (targetMenuItem) {
        targetMenuItem.classList.add('active');
    }

    switch(sectionId) {
        case 'dashboard':
            loadDashboardSummary();
            break;
        case 'users':
            loadUsers();
            break;
        case 'books':
            loadBooks();
            break;
        case 'suggestions':
            loadSuggestions();
            break;
        case 'categories':
            loadPendingCategories();
            break;
        case 'analytics':
            loadAnalytics();
            break;
    }
}

// ===== DASHBOARD DATA FUNCTIONS =====
// TODO: /api/admin/summary backend endpoint is not implemented yet.
// Once an AdminController with getSummary() exists, restore a fetch()
// call here and remove setEmptyDashboardData().
async function loadDashboardSummary() {
    setEmptyDashboardData();
    await loadSuggestionStats();
    loadRecentActivity();
}

// TODO: /suggestion/apis/admin/stats backend endpoint is not implemented yet.
async function loadSuggestionStats() {
    document.getElementById('totalSuggestions').textContent = '0';
    document.getElementById('pendingSuggestions').textContent = '0';
}

function setEmptyDashboardData() {
    document.getElementById('totalUsers').textContent = '0';
    document.getElementById('totalBooks').textContent = '0';
    document.getElementById('pendingBooks').textContent = '0';
    document.getElementById('activeUsers').textContent = '0';
    document.getElementById('pendingPublishers').textContent = '0';
    document.getElementById('totalPublishers').textContent = '0';
}

// TODO: /api/admin/activities backend endpoint is not implemented yet.
function loadRecentActivity() {
    const activityList = document.getElementById('recentActivity');
    if (!activityList) return;

    activityList.innerHTML = `
        <div class="no-data">
            <i class='bx bx-time'></i>
            <p>Activity feed is not available yet.</p>
        </div>
    `;
}

// ===== USER MANAGEMENT FUNCTIONS =====
// Backend: GET /api/v1/admin/users -> List<UserResponseDTO>
// UserResponseDTO fields: id, name, email, phoneNumber, age, role, userStatus, createdAt, updatedAt
async function loadUsers(page = 1) {
    currentUserPage = page;
    showLoading(true);

    try {
        const response = await fetch(`${window.location.origin}/api/v1/admin/users`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to load users');
        }

        allUsers = await response.json();
        renderUserPage(currentUserPage);
        updateDashboardUserStats();
    } catch (error) {
        console.error('Error loading users:', error);
        allUsers = [];
        showNoUsersFound();
        showNotification('Could not load users. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

// Slices allUsers for the current page and renders + paginates it.
function renderUserPage(page = 1) {
    currentUserPage = page;
    const start = (page - 1) * usersPerPage;
    const pageUsers = allUsers.slice(start, start + usersPerPage);
    displayUsers(pageUsers);
    updateUserPagination(Math.max(1, Math.ceil(allUsers.length / usersPerPage)), currentUserPage);
}

function displayUsers(users) {
    const userTableBody = document.getElementById('userTableBody');
    if (!userTableBody) {
        console.error('User table body not found');
        return;
    }

    userTableBody.innerHTML = '';

    if (!users || users.length === 0) {
        showNoUsersFound();
        return;
    }

    users.forEach(user => {
        try {
            const row = document.createElement('tr');

            const userName = user.name || 'Unknown User';
            const userEmail = user.email || 'No email';
            const userRole = user.role || 'USER';
            const userStatus = user.userStatus || 'ACTIVE';

            const { statusText, statusClass } = getUserStatusDisplay(userRole, userStatus);

            const canApproveOrReject = userRole === 'PUBLISHER' && userStatus === 'PENDING';

            row.innerHTML = `
                <td>
                    <div class="user-avatar">
                        <i class='bx bx-user'></i>
                        <span>${escapeHtml(userName)}</span>
                    </div>
                </td>
                <td>${escapeHtml(userEmail)}</td>
                <td>
                    <span class="role-badge ${userRole.toLowerCase()}">${escapeHtml(userRole)}</span>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </td>
                <td>${formatDate(user.createdAt)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-info" onclick="viewUser(${user.id})" title="View Details">
                            <i class='bx bx-show'></i> View
                        </button>
                        ${canApproveOrReject ?
                            `<button class="btn-success" onclick="approvePublisher('${encodeURIComponent(user.email)}')" title="Approve Publisher">
                                <i class='bx bx-check'></i> Approve
                            </button>
                             <button class="btn-danger" onclick="rejectPublisher('${encodeURIComponent(user.email)}')" title="Reject Publisher">
                                <i class='bx bx-x'></i> Reject
                             </button>` : ''
                        }
                    </div>
                </td>
            `;

            userTableBody.appendChild(row);
        } catch (error) {
            console.error('Error rendering user row:', error, user);
        }
    });
}

// role/userStatus -> badge text + CSS class (matches enums.Role / enums.UserStatus)
function getUserStatusDisplay(role, userStatus) {
    if (role === 'PUBLISHER') {
        switch (userStatus) {
            case 'APPROVED': return { statusText: 'Approved Publisher', statusClass: 'status-approved' };
            case 'REJECTED': return { statusText: 'Rejected', statusClass: 'status-rejected' };
            case 'PENDING':
            default: return { statusText: 'Pending Approval', statusClass: 'status-pending' };
        }
    }
    // USER and ADMIN accounts are always ACTIVE (see UserService.registerUser)
    return { statusText: 'Active', statusClass: 'status-active' };
}

function updateUserPagination(totalPages, currentPage) {
    const pagination = document.getElementById('userPagination');
    if (!pagination) return;

    let paginationHTML = '';

    if (currentPage > 1) {
        paginationHTML += `<button class="page-btn" onclick="renderUserPage(${currentPage - 1})">Previous</button>`;
    }

    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            paginationHTML += `<button class="page-btn active">${i}</button>`;
        } else {
            paginationHTML += `<button class="page-btn" onclick="renderUserPage(${i})">${i}</button>`;
        }
    }

    if (currentPage < totalPages) {
        paginationHTML += `<button class="page-btn" onclick="renderUserPage(${currentPage + 1})">Next</button>`;
    }

    pagination.innerHTML = paginationHTML;
}

// Backend: PUT /api/v1/admin/approve/{email} -> UserResponseDTO
async function approvePublisher(email) {
    await changePublisherStatus(email, 'approve');
}

// Backend: PUT /api/v1/admin/reject/{email} -> UserResponseDTO
async function rejectPublisher(email) {
    await changePublisherStatus(email, 'reject');
}

async function changePublisherStatus(email, action) {
    showLoading(true);
    try {
        const response = await fetch(`${window.location.origin}/api/v1/admin/${action}/${email}`, {
            method: 'PUT',
            credentials: 'include'
        });

        if (response.ok) {
            showNotification(`Publisher ${action === 'approve' ? 'approved' : 'rejected'} successfully!`, 'success');
            await loadUsers(currentUserPage);
        } else {
            const errorText = await response.text();
            showNotification(errorText || `Failed to ${action} publisher`, 'error');
        }
    } catch (error) {
        console.error(`Error trying to ${action} publisher:`, error);
        showNotification(`Error trying to ${action} publisher`, 'error');
    } finally {
        showLoading(false);
    }
}

// Uses the already-loaded allUsers array — no extra backend call needed.
async function viewUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (user) {
        showUserModal(user);
    } else {
        showNotification('User details not found.', 'error');
    }
}

function showUserModal(user) {
    const modal = document.getElementById('userModal');
    const userDetails = document.getElementById('userDetails');

    if (!modal || !userDetails) {
        console.error('Modal elements not found');
        showNotification('Error: Could not open user details', 'error');
        return;
    }

    try {
        const joinDate = formatDateTime(user.createdAt);
        const updatedDate = formatDateTime(user.updatedAt);
        const { statusText, statusClass } = getUserStatusDisplay(user.role, user.userStatus);
        const canApproveOrReject = user.role === 'PUBLISHER' && user.userStatus === 'PENDING';

        userDetails.innerHTML = `
            <div class="user-detail-grid">
                <div class="user-detail">
                    <label>Name:</label>
                    <span>${escapeHtml(user.name || 'N/A')}</span>
                </div>
                <div class="user-detail">
                    <label>Email:</label>
                    <span>${escapeHtml(user.email || 'N/A')}</span>
                </div>
                <div class="user-detail">
                    <label>Phone Number:</label>
                    <span>${escapeHtml(user.phoneNumber || 'N/A')}</span>
                </div>
                <div class="user-detail">
                    <label>Age:</label>
                    <span>${user.age ?? 'N/A'}</span>
                </div>
                <div class="user-detail">
                    <label>Role:</label>
                    <span class="role-badge ${(user.role || 'user').toLowerCase()}">
                        ${user.role || 'USER'}
                    </span>
                </div>
                <div class="user-detail">
                    <label>Status:</label>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                <div class="user-detail">
                    <label>Account Created:</label>
                    <span>${joinDate}</span>
                </div>
                <div class="user-detail">
                    <label>Last Updated:</label>
                    <span>${updatedDate}</span>
                </div>
            </div>
            <div class="modal-actions">
                ${canApproveOrReject ? `
                    <button class="btn-success" onclick="approvePublisher('${encodeURIComponent(user.email)}')">
                        <i class='bx bx-check'></i> Approve Publisher
                    </button>
                    <button class="btn-danger" onclick="rejectPublisher('${encodeURIComponent(user.email)}')">
                        <i class='bx bx-x'></i> Reject Publisher
                    </button>
                ` : ''}
            </div>
        `;

        modal.style.display = 'block';
    } catch (error) {
        console.error('Error displaying user modal:', error);
        userDetails.innerHTML = `
            <div class="no-data">
                <i class='bx bx-error'></i>
                <p>Error loading user details</p>
                <p style="font-size: 0.9rem; color: var(--gray);">${error.message}</p>
            </div>
        `;
        modal.style.display = 'block';
    }
}

// Note: there is no "edit any user" or "delete user" endpoint in the backend
// (UserController only exposes self-service /update-user-name), so those
// actions have been removed from this dashboard rather than left as fake buttons.

function searchUsers() {
    const searchTerm = document.getElementById('userSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#userTableBody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function showNoUsersFound() {
    const userTableBody = document.getElementById('userTableBody');
    if (!userTableBody) return;

    userTableBody.innerHTML = `
        <tr>
            <td colspan="6" class="no-data">
                <i class='bx bx-user-x'></i>
                <p>No users found</p>
            </td>
        </tr>
    `;
    const pagination = document.getElementById('userPagination');
    if (pagination) pagination.innerHTML = '';
}

// Derives the dashboard's user-related stat cards from the already-loaded
// allUsers list, so no separate /api/admin/summary endpoint is needed.
function updateDashboardUserStats() {
    const totalUsersEl = document.getElementById('totalUsers');
    const activeUsersEl = document.getElementById('activeUsers');
    const totalPublishersEl = document.getElementById('totalPublishers');
    const pendingPublishersEl = document.getElementById('pendingPublishers');

    if (totalUsersEl) totalUsersEl.textContent = allUsers.length;
    if (activeUsersEl) {
        activeUsersEl.textContent = allUsers.filter(u => u.role === 'USER').length;
    }
    if (totalPublishersEl) {
        totalPublishersEl.textContent = allUsers.filter(u => u.role === 'PUBLISHER' && u.userStatus === 'APPROVED').length;
    }
    if (pendingPublishersEl) {
        pendingPublishersEl.textContent = allUsers.filter(u => u.role === 'PUBLISHER' && u.userStatus === 'PENDING').length;
    }
}

// ===== BOOK MANAGEMENT FUNCTIONS =====
async function loadBooks(page = 1) {
    currentBookPage = page;
    try {
        const response = await fetch(`${window.location.origin}/api/v1/admin/books`, {
            credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to fetch books');
        allBooks = await response.json();

        document.getElementById('totalBooks').textContent = allBooks.length;
        document.getElementById('pendingBooks').textContent =
            allBooks.filter(b => b.status === 'PENDING').length;

        displayBooks(allBooks);
    } catch (error) {
        allBooks = [];
        displayBooks([]);
        showNotification('Failed to load books', 'error');
    }
}

function displayBooks(books) {
    const bookTableBody = document.getElementById('bookTableBody');
    if (!bookTableBody) return;

    bookTableBody.innerHTML = '';

    if (!books || books.length === 0) {
        bookTableBody.innerHTML = `
            <tr><td colspan="7" class="no-data"><i class='bx bx-book-open'></i><p>No books found</p></td></tr>
        `;
        return;
    }

    books.forEach(book => {
        const row = document.createElement('tr');

        let statusClass = 'status-pending';
        if (book.status === 'PUBLISHED') statusClass = 'status-approved';
        if (book.status === 'REJECTED') statusClass = 'status-rejected';

        row.innerHTML = `
            <td>
                ${book.coverImagePath ?
                    `<img src="${escapeHtml(book.coverImagePath)}" alt="${escapeHtml(book.title)}" class="book-cover">` :
                    '<div class="book-cover-placeholder"><i class="bx bx-book"></i></div>'
                }
            </td>
            <td>
                <div class="book-title">
                    <strong>${escapeHtml(book.title || 'Untitled')}</strong>
                    <div style="font-size: 0.8rem; color: var(--gray); margin-top: 4px;">by ${escapeHtml(book.author || 'Unknown Author')}</div>
                </div>
            </td>
            <td><span class="category-tag">${escapeHtml(book.categoryName || 'Uncategorized')}</span></td>
            <td><div style="font-size: 0.9rem;">${escapeHtml(book.publisherName || 'Unknown Publisher')}</div></td>
            <td><span class="status-badge ${statusClass}">${book.status}</span></td>
            <td>${book.uploadedAt ? formatDate(book.uploadedAt) : 'Unknown'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-info" onclick="viewBook(${book.id})" title="View Details">
                        <i class='bx bx-show'></i> View
                    </button>
                    ${book.status === 'PENDING' ?
                        `<button class="btn-success" onclick="approveBook(${book.id})" title="Approve Book">
                            <i class='bx bx-check'></i> Approve
                        </button>
                         <button class="btn-danger" onclick="rejectBookDirect(${book.id})" title="Reject Book">
                            <i class='bx bx-x'></i> Reject
                         </button>` : ''
                    }
                    <button class="btn-danger" onclick="deleteBook(${book.id})" title="Delete Book">
                        <i class='bx bx-trash'></i> Delete
                    </button>
                </div>
            </td>
        `;
        bookTableBody.appendChild(row);
    });
}

async function approveBook(bookId) {
    try {
        const response = await fetch(`${window.location.origin}/api/v1/admin/books/approve/${bookId}`, {
            method: 'PUT',
            credentials: 'include'
        });
        if (response.ok) {
            showNotification('Book approved and published', 'success');
            loadBooks(currentBookPage);
        } else {
            // Backend AppException ka asli message dikhao — e.g. "category is still PENDING"
            const errorText = await response.text();
            showNotification(errorText || 'Failed to approve book', 'error');
        }
    } catch (error) {
        showNotification('Error approving book', 'error');
    }
}

async function rejectBookDirect(bookId) {
    if (!window.confirm('Reject this book?')) return;
    try {
        const response = await fetch(`${window.location.origin}/api/v1/admin/books/reject/${bookId}`, {
            method: 'PUT',
            credentials: 'include'
        });
        if (response.ok) {
            showNotification('Book rejected', 'success');
            loadBooks(currentBookPage);
        } else {
            showNotification('Failed to reject book', 'error');
        }
    } catch (error) {
        showNotification('Error rejecting book', 'error');
    }
}

function viewBook(bookId) {
    const book = allBooks.find(b => b.id === bookId);
    if (book) {
        showBookModal(book);
    } else {
        showNotification('Book details not found', 'error');
    }
}

function showBookModal(book) {
    const modal = document.getElementById('bookModal');
    const bookDetails = document.getElementById('bookDetails');
    if (!modal || !bookDetails) return;

    bookDetails.innerHTML = `
        <div class="book-detail-grid">
            <div class="book-cover-large">
                ${book.coverImagePath ?
                    `<img src="${escapeHtml(book.coverImagePath)}" alt="${escapeHtml(book.title)}" style="max-width: 200px; border-radius: 8px;">` :
                    '<div class="book-cover-placeholder" style="width:200px;height:300px;background:#f8f9fa;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#6c757d;font-size:3rem;"><i class="bx bx-book"></i></div>'
                }
            </div>
            <div class="book-info">
                <h3>${escapeHtml(book.title)}</h3>
                <p class="book-author">by ${escapeHtml(book.author)}</p>
                <div class="book-meta">
                    <span class="category-tag">${escapeHtml(book.categoryName || 'Uncategorized')}</span>
                    <span class="status-badge">${escapeHtml(book.status)}</span>
                </div>
                <div style="margin: 1rem 0; padding: 1rem; background: #f8f9fa; border-radius: 6px;">
                    <strong>Publisher:</strong> ${escapeHtml(book.publisherName || 'Unknown')}
                </div>
                ${book.description ? `<div class="book-description"><h4>Description</h4><p>${escapeHtml(book.description)}</p></div>` : ''}
                <div class="book-stats">
                    <div class="stat"><label>Language:</label><span>${escapeHtml(book.language)}</span></div>
                    <div class="stat"><label>Uploaded:</label><span>${formatDateTime(book.uploadedAt)}</span></div>
                </div>
                ${book.filePath ? `<p><a href="${escapeHtml(book.filePath)}" target="_blank">Open PDF</a></p>` : ''}
            </div>
        </div>
        <div class="modal-actions">
            ${book.status === 'PENDING' ? `
                <button class="btn-success" onclick="approveBook(${book.id})"><i class='bx bx-check'></i> Approve</button>
                <button class="btn-danger" onclick="rejectBookDirect(${book.id})"><i class='bx bx-x'></i> Reject</button>
            ` : ''}
            <button class="btn-danger" onclick="deleteBook(${book.id})"><i class='bx bx-trash'></i> Delete</button>
        </div>
    `;
    modal.style.display = 'block';
}

async function deleteBook(bookId) {
    if (!window.confirm('Delete this book permanently?')) return;
    try {
        const response = await fetch(`${window.location.origin}/api/v1/admin/books/${bookId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (response.ok) {
            showNotification('Book deleted', 'success');
            closeModal('bookModal');
            loadBooks(currentBookPage);
        } else {
            showNotification('Failed to delete book', 'error');
        }
    } catch (error) {
        showNotification('Error deleting book', 'error');
    }
}

function searchBooks() {
    const searchTerm = document.getElementById('bookSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#bookTableBody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function filterBooks() {
    const statusFilter = document.getElementById('statusFilter').value;
    const rows = document.querySelectorAll('#bookTableBody tr');

    rows.forEach(row => {
        if (!statusFilter) {
            row.style.display = '';
            return;
        }

        const statusBadge = row.querySelector('.status-badge');
        if (statusBadge && statusBadge.textContent.toLowerCase() === statusFilter.toLowerCase()) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function showDemoBooks() {
    const bookTableBody = document.getElementById('bookTableBody');
    if (!bookTableBody) return;

    bookTableBody.innerHTML = `
        <tr>
            <td colspan="7" class="no-data">
                <i class='bx bx-book-open'></i>
                <p>No books found</p>
            </td>
        </tr>
    `;
}

// ===== SUGGESTION MANAGEMENT FUNCTIONS =====
// TODO: /suggestion/apis/admin/all backend endpoint is not implemented yet.
// Once a SuggestionController with getAllForAdmin() exists, restore a
// fetch() call here, keeping the same displaySuggestions()/
// updateSuggestionPagination() calls.
async function loadSuggestions(page = 1) {
    currentSuggestionPage = page;
    allSuggestions = [];
    showDemoSuggestions();
}

function displaySuggestions(suggestions) {
    const suggestionTableBody = document.getElementById('suggestionTableBody');
    if (!suggestionTableBody) {
        console.error('Suggestion table body not found');
        return;
    }

    suggestionTableBody.innerHTML = '';

    if (!suggestions || suggestions.length === 0) {
        suggestionTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="no-data">
                    <i class='bx bx-message-square-x'></i>
                    <p>No suggestions found</p>
                </td>
            </tr>
        `;
        return;
    }

    const startIndex = (currentSuggestionPage - 1) * suggestionsPerPage;
    const endIndex = startIndex + suggestionsPerPage;
    const paginatedSuggestions = suggestions.slice(startIndex, endIndex);

    paginatedSuggestions.forEach(suggestion => {
        try {
            const row = document.createElement('tr');

            let statusClass = '';
            let statusText = suggestion.suggestionStatus || 'PENDING';

            switch(statusText.toLowerCase()) {
                case 'approved':
                    statusClass = 'status-approved';
                    break;
                case 'pending':
                    statusClass = 'status-pending';
                    break;
                case 'rejected':
                    statusClass = 'status-rejected';
                    break;
                default:
                    statusClass = 'status-pending';
            }

            const userName = suggestion.user ? (suggestion.user.name || suggestion.user.fullName || 'Unknown User') : 'Unknown User';
            const userEmail = suggestion.user ? suggestion.user.email : 'N/A';

            row.innerHTML = `
                <td>
                    <strong>${suggestion.suggestedTitle || 'Untitled'}</strong>
                </td>
                <td>${suggestion.author || 'Not specified'}</td>
                <td>
                    <div class="user-avatar">
                        <i class='bx bx-user'></i>
                        <div>
                            <div>${userName}</div>
                            <small style="color: var(--gray);">${userEmail}</small>
                        </div>
                    </div>
                </td>
                <td>
                    ${suggestion.suggestionReason ?
                        `<div class="suggestion-reason">${suggestion.suggestionReason}</div>` :
                        '<span style="color: var(--gray); font-style: italic;">No reason provided</span>'
                    }
                </td>
                <td>
                    <span class="status-badge ${statusClass}">${statusText.toUpperCase()}</span>
                </td>
                <td>${formatDate(suggestion.createdAt)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-info" onclick="viewSuggestion(${suggestion.id})" title="View Details">
                            <i class='bx bx-show'></i> View
                        </button>
                        ${suggestion.suggestionStatus === 'PENDING' ? `
                            <button class="btn-success" onclick="showSuggestionApprovalModal(${suggestion.id})" title="Approve Suggestion">
                                <i class='bx bx-check'></i> Approve
                            </button>
                            <button class="btn-danger" onclick="showSuggestionRejectionModal(${suggestion.id})" title="Reject Suggestion">
                                <i class='bx bx-x'></i> Reject
                            </button>
                        ` : ''}
                        <button class="btn-warning" onclick="editSuggestion(${suggestion.id})" title="Edit Suggestion">
                            <i class='bx bx-edit'></i> Edit
                        </button>
                        <button class="btn-danger" onclick="deleteSuggestion(${suggestion.id})" title="Delete Suggestion">
                            <i class='bx bx-trash'></i> Delete
                        </button>
                    </div>
                </td>
            `;

            suggestionTableBody.appendChild(row);
        } catch (error) {
            console.error('Error rendering suggestion row:', error, suggestion);
        }
    });
}

function updateSuggestionPagination(totalPages, currentPage) {
    const pagination = document.getElementById('suggestionPagination');
    if (!pagination) return;

    let paginationHTML = '';

    if (currentPage > 1) {
        paginationHTML += `<button class="page-btn" onclick="loadSuggestions(${currentPage - 1})">Previous</button>`;
    }

    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            paginationHTML += `<button class="page-btn active">${i}</button>`;
        } else {
            paginationHTML += `<button class="page-btn" onclick="loadSuggestions(${i})">${i}</button>`;
        }
    }

    if (currentPage < totalPages) {
        paginationHTML += `<button class="page-btn" onclick="loadSuggestions(${currentPage + 1})">Next</button>`;
    }

    pagination.innerHTML = paginationHTML;
}

// TODO: /suggestion/apis/findById/{id} backend endpoint is not implemented yet.
async function viewSuggestion(suggestionId) {
    const suggestion = allSuggestions.find(s => s.id == suggestionId);
    if (suggestion) {
        showSuggestionModal(suggestion);
    } else {
        showNotification('Suggestion details are not available yet.', 'info');
    }
}

function showSuggestionModal(suggestion) {
    const modal = document.getElementById('suggestionModal');
    const suggestionDetails = document.getElementById('suggestionDetails');

    if (modal && suggestionDetails) {
        const statusText = suggestion.suggestionStatus || 'PENDING';
        const statusClass = `status-${statusText.toLowerCase()}`;

        const userName = suggestion.user ? (suggestion.user.name || suggestion.user.fullName || 'Unknown User') : 'Unknown User';
        const userEmail = suggestion.user ? suggestion.user.email : 'N/A';

        suggestionDetails.innerHTML = `
            <div class="book-detail-grid">
                <div class="book-info">
                    <h3>${suggestion.suggestedTitle || 'Untitled'}</h3>
                    <p class="book-author">by ${suggestion.author || 'Not specified'}</p>

                    <div class="book-meta">
                        <span class="status-badge ${statusClass}">${statusText.toUpperCase()}</span>
                    </div>

                    <div style="margin: 1rem 0; padding: 1rem; background: #f8f9fa; border-radius: 6px;">
                        <strong>Suggested by:</strong> ${userName} (${userEmail})
                    </div>

                    ${suggestion.suggestionReason ? `
                    <div class="book-description">
                        <h4>Suggestion Reason</h4>
                        <div class="suggestion-reason">${suggestion.suggestionReason}</div>
                    </div>
                    ` : ''}

                    ${suggestion.adminNotes ? `
                    <div class="book-description">
                        <h4>Admin Notes</h4>
                        <div class="admin-notes">${suggestion.adminNotes}</div>
                    </div>
                    ` : ''}

                    <div class="book-stats">
                        <div class="stat">
                            <label>Submitted:</label>
                            <span>${suggestion.createdAt ? formatDateTime(suggestion.createdAt) : 'Unknown'}</span>
                        </div>
                        ${suggestion.updatedAt ? `
                        <div class="stat">
                            <label>Last Updated:</label>
                            <span>${formatDateTime(suggestion.updatedAt)}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
            <div class="modal-actions">
                ${suggestion.suggestionStatus === 'PENDING' ? `
                    <button class="btn-success" onclick="showSuggestionApprovalModal(${suggestion.id})">
                        <i class='bx bx-check'></i> Approve
                    </button>
                    <button class="btn-danger" onclick="showSuggestionRejectionModal(${suggestion.id})">
                        <i class='bx bx-x'></i> Reject
                    </button>
                ` : ''}
                <button class="btn-primary" onclick="editSuggestion(${suggestion.id})">
                    <i class='bx bx-edit'></i> Edit
                </button>
                <button class="btn-danger" onclick="deleteSuggestion(${suggestion.id})">
                    <i class='bx bx-trash'></i> Delete
                </button>
            </div>
        `;

        modal.style.display = 'block';
    }
}

function showSuggestionApprovalModal(suggestionId) {
    currentApproveSuggestionId = suggestionId;
    const modal = document.getElementById('suggestionApprovalModal');
    if (modal) {
        modal.style.display = 'block';
        document.getElementById('approvalNotes').value = '';
    }
}

function closeSuggestionApprovalModal() {
    const modal = document.getElementById('suggestionApprovalModal');
    if (modal) {
        modal.style.display = 'none';
        currentApproveSuggestionId = null;
    }
}

function showSuggestionRejectionModal(suggestionId) {
    currentRejectSuggestionId = suggestionId;
    const modal = document.getElementById('suggestionRejectionModal');
    if (modal) {
        modal.style.display = 'block';
        document.getElementById('rejectionNotes').value = '';
    }
}

function closeSuggestionRejectionModal() {
    const modal = document.getElementById('suggestionRejectionModal');
    if (modal) {
        modal.style.display = 'none';
        currentRejectSuggestionId = null;
    }
}

document.getElementById('suggestionApprovalForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    if (!currentApproveSuggestionId) return;

    const adminNotes = document.getElementById('approvalNotes').value;
    await approveSuggestion(currentApproveSuggestionId, adminNotes);
});

document.getElementById('suggestionRejectionForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    if (!currentRejectSuggestionId) return;

    const rejectionNotes = document.getElementById('rejectionNotes').value;

    if (!rejectionNotes.trim()) {
        showNotification('Please provide a reason for rejection', 'error');
        return;
    }

    await rejectSuggestion(currentRejectSuggestionId, rejectionNotes);
});

// ===== CATEGORY MANAGEMENT (approve / rename / reparent / merge / reject) =====

async function loadPendingCategories() {
    try {
        const [pendingRes, approvedRes] = await Promise.all([
            fetch(`${window.location.origin}/api/v1/category/pending`, { credentials: 'include' }),
            fetch(`${window.location.origin}/api/v1/category/findAll`, { credentials: 'include' })
        ]);

        allPendingCategories = pendingRes.ok ? await pendingRes.json() : [];
        allApprovedCategories = approvedRes.ok ? await approvedRes.json() : [];
    } catch (error) {
        console.error('Error loading categories:', error);
        allPendingCategories = [];
        allApprovedCategories = [];
    }
    renderCategoryTable();
}

function renderCategoryTable() {
    const tbody = document.getElementById('categoryTableBody');
    if (!tbody) return;

    if (allPendingCategories.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No pending categories 🎉</td></tr>`;
        return;
    }

    tbody.innerHTML = allPendingCategories.map(cat => `
        <tr>
            <td>${escapeHtml(cat.categoryName)}</td>
            <td>${escapeHtml(cat.description || '-')}</td>
            <td>${escapeHtml(cat.parentCategoryName || '-')}</td>
            <td>
                <button class="btn-success" onclick="openCategoryApprovalModal(${cat.id})" title="Approve / Rename / Merge">
                    <i class='bx bx-check'></i> Approve
                </button>
                <button class="btn-danger" onclick="rejectCategoryAction(${cat.id})" title="Reject">
                    <i class='bx bx-x'></i> Reject
                </button>
            </td>
        </tr>
    `).join('');
}

// Category naam publisher ka free-text input hai (jaise "sci-fic") — HTML mein
// seedha daalne se pehle escape karna zaroori hai, warna stored XSS ban sakta hai
function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(value);
    return div.innerHTML;
}

function openCategoryApprovalModal(categoryId) {
    currentApproveCategoryId = categoryId;
    const category = allPendingCategories.find(c => c.id === categoryId);
    if (!category) return;

    const modal = document.getElementById('categoryApprovalModal');
    const nameInput = document.getElementById('categoryNewName');
    const parentSelect = document.getElementById('categoryParentSelect');
    const mergeSelect = document.getElementById('categoryMergeSelect');

    nameInput.value = category.categoryName;

    // Parent dropdown — is category ke alawa saari approved categories (khud ka parent nahi ban sakta)
    parentSelect.innerHTML = `<option value="">-- Top-level category (no parent) --</option>` +
        allApprovedCategories.map(c => `<option value="${c.id}">${c.categoryName}</option>`).join('');

    // Merge dropdown — sirf approved categories mein merge ho sakta hai
    mergeSelect.innerHTML = `<option value="">-- Do not merge, approve as new category --</option>` +
        allApprovedCategories.map(c => `<option value="${c.id}">${c.categoryName}</option>`).join('');

    modal.style.display = 'block';
}

function closeCategoryApprovalModal() {
    const modal = document.getElementById('categoryApprovalModal');
    if (modal) modal.style.display = 'none';
    currentApproveCategoryId = null;
}

document.getElementById('categoryApprovalForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!currentApproveCategoryId) return;

    const newCategoryName = document.getElementById('categoryNewName').value.trim();
    const parentCategoryId = document.getElementById('categoryParentSelect').value;
    const mergeIntoCategoryId = document.getElementById('categoryMergeSelect').value;

    const body = {
        newCategoryName: newCategoryName || null,
        parentCategoryId: parentCategoryId ? parseInt(parentCategoryId) : null,
        mergeIntoCategoryId: mergeIntoCategoryId ? parseInt(mergeIntoCategoryId) : null
    };

    try {
        const response = await fetch(`${window.location.origin}/api/v1/category/approve/${currentApproveCategoryId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            showNotification(errorText || 'Failed to approve category', 'error');
            return;
        }

        showNotification(mergeIntoCategoryId ? 'Category merged successfully' : 'Category approved successfully', 'success');
        closeCategoryApprovalModal();
        await loadPendingCategories();
        await loadBooks(currentBookPage); // categoryStatus badal gaya hoga, book table refresh karo
    } catch (error) {
        console.error('Error approving category:', error);
        showNotification('Something went wrong. Please try again.', 'error');
    }
});

async function rejectCategoryAction(categoryId) {
    if (!confirm('Reject this category suggestion?')) return;

    try {
        const response = await fetch(`${window.location.origin}/api/v1/category/reject/${categoryId}`, {
            method: 'POST',
            credentials: 'include'
        });

        if (!response.ok) {
            const errorText = await response.text();
            showNotification(errorText || 'Failed to reject category', 'error');
            return;
        }

        showNotification('Category rejected', 'success');
        await loadPendingCategories();
    } catch (error) {
        console.error('Error rejecting category:', error);
        showNotification('Something went wrong. Please try again.', 'error');
    }
}

// TODO: /suggestion/apis/admin/approve/{id} backend endpoint is not implemented yet.
// Once a SuggestionController with approve() exists, restore a fetch() call
// here (Category already has an equivalent approve/reject pattern to mirror).
async function approveSuggestion(suggestionId, adminNotes) {
    showNotification('Approving suggestions is not available yet. This feature is under development.', 'info');
    closeSuggestionApprovalModal();
}

// TODO: /suggestion/apis/admin/reject/{id} backend endpoint is not implemented yet.
async function rejectSuggestion(suggestionId, adminNotes) {
    showNotification('Rejecting suggestions is not available yet. This feature is under development.', 'info');
    closeSuggestionRejectionModal();
}

async function editSuggestion(suggestionId) {
    showNotification('Edit suggestion functionality coming soon!', 'info');
}

// TODO: /suggestion/apis/delete/{id} backend endpoint is not implemented yet.
async function deleteSuggestion(suggestionId) {
    showNotification('Deleting suggestions is not available yet. This feature is under development.', 'info');
}

function searchSuggestions() {
    const searchTerm = document.getElementById('suggestionSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#suggestionTableBody tr');

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function filterSuggestions() {
    const statusFilter = document.getElementById('suggestionStatusFilter').value;
    const rows = document.querySelectorAll('#suggestionTableBody tr');

    rows.forEach(row => {
        if (!statusFilter) {
            row.style.display = '';
            return;
        }

        const statusBadge = row.querySelector('.status-badge');
        if (statusBadge && statusBadge.textContent.toLowerCase().includes(statusFilter.toLowerCase())) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// TODO: /suggestion/apis/admin/all backend endpoint is not implemented yet.
async function exportSuggestions() {
    showNotification('Exporting suggestions is not available yet. This feature is under development.', 'info');
}

function convertSuggestionsToCSV(suggestions) {
    const headers = ['Title', 'Author', 'User', 'Reason', 'Status', 'Submitted Date', 'Admin Notes'];

    const rows = suggestions.map(suggestion => [
        suggestion.suggestedTitle,
        suggestion.author || 'Not specified',
        suggestion.user ? (suggestion.user.name || suggestion.user.fullName || 'Unknown') : 'Unknown',
        suggestion.suggestionReason || 'No reason provided',
        suggestion.suggestionStatus || 'PENDING',
        new Date(suggestion.createdAt).toLocaleDateString(),
        suggestion.adminNotes || 'No notes'
    ]);

    return [headers, ...rows].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
}

function showDemoSuggestions() {
    const suggestionTableBody = document.getElementById('suggestionTableBody');
    if (!suggestionTableBody) return;

    suggestionTableBody.innerHTML = `
        <tr>
            <td colspan="7" class="no-data">
                <i class='bx bx-message-square-x'></i>
                <p>No suggestions found</p>
            </td>
        </tr>
    `;
}

// ===== ANALYTICS FUNCTIONS =====
// TODO: /api/admin/analytics backend endpoint is not implemented yet.
async function loadAnalytics() {
    // Chart placeholders in the HTML already say "chart visualization" —
    // nothing to load yet.
}

// ===== EXPORT FUNCTIONALITY =====
// No dedicated backend export endpoint is needed — allUsers is already
// loaded from GET /api/v1/admin/users, so we just format it as CSV here.
async function exportUsers() {
    if (!allUsers || allUsers.length === 0) {
        showNotification('No users to export yet.', 'info');
        return;
    }
    const csv = convertToCSV(allUsers);
    downloadCSV(csv, `users-${new Date().toISOString().slice(0, 10)}.csv`);
}

function convertToCSV(users) {
    const headers = ['Name', 'Email', 'Role', 'Status', 'Joined Date'];
    const rows = users.map(user => {
        const { statusText } = getUserStatusDisplay(user.role, user.userStatus);
        return [
            user.name,
            user.email,
            user.role,
            statusText,
            formatDate(user.createdAt)
        ];
    });

    return [headers, ...rows].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}

// ===== SETTINGS FUNCTIONS =====
function saveSettings() {
    showNotification('Settings saved successfully!', 'success');
}

// ===== LOGOUT FUNCTIONALITY =====
function showLogoutConfirmation() {
    const modal = document.getElementById('logoutModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Backend endpoint DOES exist (LoginController /api/v1/login/logout) —
// call it so the httpOnly auth cookie is actually cleared server-side,
// matching how logout works on every other dashboard in this app.
async function confirmLogout() {
    try {
        await fetch(`${window.location.origin}/api/v1/login/logout`, {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Logout request failed:', error);
    }

    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
    localStorage.removeItem('currentUserId');

    showNotification('Logged out successfully!', 'success');

    setTimeout(() => {
        window.location.href = '/admin-login';
    }, 500);
}

// ===== NOTIFICATION SYSTEM =====
function showNotification(message, type = 'info') {
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    });

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class='bx ${getNotificationIcon(type)}'></i>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        'success': 'bx-check-circle',
        'error': 'bx-error-circle',
        'warning': 'bx-error',
        'info': 'bx-info-circle'
    };
    return icons[type] || 'bx-info-circle';
}

function showLoading(show) {
    const loadingOverlay = document.getElementById('globalLoading');
    if (loadingOverlay) {
        if (show) {
            loadingOverlay.classList.add('active');
        } else {
            loadingOverlay.classList.remove('active');
        }
    }
}

// ===== EVENT LISTENERS SETUP =====
function setupEventListeners() {
    const closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });

    window.addEventListener('click', function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });

    let searchTimeout;
    const userSearch = document.getElementById('userSearch');
    const bookSearch = document.getElementById('bookSearch');
    const suggestionSearch = document.getElementById('suggestionSearch');

    if (userSearch) {
        userSearch.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(searchUsers, 300);
        });
    }

    if (bookSearch) {
        bookSearch.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(searchBooks, 300);
        });
    }

    if (suggestionSearch) {
        suggestionSearch.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(searchSuggestions, 300);
        });
    }
}

// ===== UTILITY FUNCTIONS =====
function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateTime(dateString) {
    if (!dateString) return 'Unknown';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Date Error';
    }
}

// ===== GLOBAL FUNCTION EXPORTS =====
window.showSection = showSection;
window.loadUsers = loadUsers;
window.renderUserPage = renderUserPage;
window.loadBooks = loadBooks;
window.loadSuggestions = loadSuggestions;
window.searchUsers = searchUsers;
window.searchBooks = searchBooks;
window.searchSuggestions = searchSuggestions;
window.filterBooks = filterBooks;
window.filterSuggestions = filterSuggestions;
window.approvePublisher = approvePublisher;
window.rejectPublisher = rejectPublisher;
window.viewUser = viewUser;
window.approveBook = approveBook;
window.rejectBookDirect = rejectBookDirect;
window.viewBook = viewBook;
window.deleteBook = deleteBook;
window.viewSuggestion = viewSuggestion;
window.showSuggestionApprovalModal = showSuggestionApprovalModal;
window.closeSuggestionApprovalModal = closeSuggestionApprovalModal;
window.showSuggestionRejectionModal = showSuggestionRejectionModal;
window.closeSuggestionRejectionModal = closeSuggestionRejectionModal;
window.editSuggestion = editSuggestion;
window.deleteSuggestion = deleteSuggestion;
window.exportUsers = exportUsers;
window.exportSuggestions = exportSuggestions;
window.saveSettings = saveSettings;
window.showLogoutConfirmation = showLogoutConfirmation;
window.closeLogoutModal = closeLogoutModal;
window.confirmLogout = confirmLogout;