let currentUser = null;
let currentPage = 'dashboard';

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('year').textContent = new Date().getFullYear();
    initializePage();
});

async function initializePage() {
    showLoading(true);

    try {
        const user = getCurrentUser();
        if (!user) {
            window.location.href = '/login';
            return;
        }
        updateDashboard(user);
        setupEventListeners();
        loadSettingsData();
        renderUnavailableSections();
    } finally {
        showLoading(false);
    }
}

function getCurrentUser() {
    try {
        const userData = localStorage.getItem('user');
        const isLoggedIn = localStorage.getItem('isLoggedIn');

        if (userData && isLoggedIn === 'true') {
            const user = JSON.parse(userData);
            currentUser = user;
            return user;
        }
        return null;
    } catch (error) {
        return null;
    }
}
function renderUnavailableSections() {
    const notReadyMessage = (icon, text) => `
        <div class="empty-state">
            <i class='bx ${icon}'></i>
            <p>${text}</p>
            <p>This feature is coming soon.</p>
        </div>
    `;

    const currentlyReadingGrid = document.getElementById('currentlyReadingGrid');
    if (currentlyReadingGrid) currentlyReadingGrid.innerHTML = notReadyMessage('bx-book-open', 'Reading feature not available yet');

    const recentlyAddedGrid = document.getElementById('recentlyAddedGrid');
    if (recentlyAddedGrid) recentlyAddedGrid.innerHTML = notReadyMessage('bx-book-add', 'No books available yet');

    const recentActivityList = document.getElementById('recentActivityList');
    if (recentActivityList) recentActivityList.innerHTML = notReadyMessage('bx-time', 'Activity feed not available yet');

    const libraryBooksGrid = document.getElementById('libraryBooksGrid');
    if (libraryBooksGrid) libraryBooksGrid.innerHTML = notReadyMessage('bx-book', 'Library feature not available yet');

    const readingTimeline = document.getElementById('readingTimeline');
    if (readingTimeline) readingTimeline.innerHTML = notReadyMessage('bx-history', 'Reading history not available yet');

    const reviewsList = document.getElementById('reviewsList');
    if (reviewsList) reviewsList.innerHTML = notReadyMessage('bx-comment-detail', 'Reviews feature not available yet');

    const userSuggestionsList = document.getElementById('userSuggestionsList');
    if (userSuggestionsList) userSuggestionsList.innerHTML = notReadyMessage('bx-bulb', 'Your suggestions will appear here');

    const allSuggestionsList = document.getElementById('allSuggestionsList');
    if (allSuggestionsList) allSuggestionsList.innerHTML = notReadyMessage('bx-bulb', 'Suggestions feature not available yet');

    const suggestionsGrid = document.getElementById('suggestionsGrid');
    if (suggestionsGrid) suggestionsGrid.innerHTML = notReadyMessage('bx-book', 'No suggested books yet');
}

function loadSettingsData() {
    if (!currentUser) return;
    const userFullName = document.getElementById('userFullName');
    const userEmail = document.getElementById('userEmail');

    if (userFullName) userFullName.value = currentUser.name || '';
    if (userEmail) userEmail.value = currentUser.email || '';
}

function updateDashboard(user) {
    const usernameElement = document.getElementById('username');
    const dashboardUsernameElement = document.getElementById('dashboardUsername');

    if (usernameElement) usernameElement.textContent = user.name || user.email || 'User';
    if (dashboardUsernameElement) dashboardUsernameElement.textContent = user.name || user.email || 'User';
}

function setupEventListeners() {
    setupUserMenu();
    setupNavigation();
    setupSettingsActions();
}

function setupUserMenu() {
    const userMenu = document.getElementById('userMenu');
    const dropdown = document.getElementById('dropdownMenu');
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    if (userMenu && dropdown) {
        userMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!userMenu.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });
    }

    if (hamburgerMenu && sidebar && overlay) {
        hamburgerMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            hamburgerMenu.classList.toggle('active');
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });

        overlay.addEventListener('click', () => {
            hamburgerMenu.classList.remove('active');
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }
}

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 992) {
                const hamburgerMenu = document.getElementById('hamburgerMenu');
                const sidebar = document.getElementById('sidebar');
                const overlay = document.getElementById('overlay');

                if (hamburgerMenu) hamburgerMenu.classList.remove('active');
                if (sidebar) sidebar.classList.remove('active');
                if (overlay) overlay.classList.remove('active');
            }
        });
    });

    const navItems = document.querySelectorAll('.nav-links li');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();

            document.querySelectorAll('.nav-links li').forEach(li => {
                li.classList.remove('active');
            });

            this.classList.add('active');

            const page = this.querySelector('a').getAttribute('data-page');
            switchPage(page);
        });
    });

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
}

function setupSettingsActions() {
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    if (saveProfileBtn) saveProfileBtn.addEventListener('click', saveProfile);
    const savePreferencesBtn = document.getElementById('savePreferencesBtn');
    if (savePreferencesBtn) {
        savePreferencesBtn.addEventListener('click', () => {
            showNotification('Preferences cannot be saved yet - this feature is coming soon', 'info');
        });
    }

    const saveNotificationsBtn = document.getElementById('saveNotificationsBtn');
    if (saveNotificationsBtn) {
        saveNotificationsBtn.addEventListener('click', () => {
            showNotification('Notification settings cannot be saved yet - this feature is coming soon', 'info');
        });
    }
}

async function saveProfile() {
    const userFullName = document.getElementById('userFullName');
    const userEmail = document.getElementById('userEmail');

    if (!userFullName || !userEmail) return;

    const newName = userFullName.value.trim();

    if (!newName) {
        showNotification('Name cannot be empty', 'error');
        return;
    }

    if (!currentUser) {
        showNotification('Please login again to update your profile', 'error');
        return;
    }

    showLoading(true);

    try {
        const response = await fetch(`${window.location.origin}/api/v1/user/update-user-name`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ name: newName })
        });

        if (response.ok) {
            const updatedUser = await response.json();

            currentUser.name = updatedUser.name;
            localStorage.setItem('user', JSON.stringify(currentUser));

            updateDashboard(currentUser);

            showNotification('Profile updated successfully!', 'success');
        } else {
            const errorText = await response.text();
            showNotification('Failed to update profile: ' + errorText, 'error');
        }
    } catch (error) {
        showNotification('Error updating profile', 'error');
    } finally {
        showLoading(false);
    }
}

function switchPage(page) {
    if (page === currentPage) return;

    const currentPageElement = document.getElementById(`${currentPage}-page`);
    const newPageElement = document.getElementById(`${page}-page`);

    if (currentPageElement) currentPageElement.classList.remove('active');
    if (newPageElement) newPageElement.classList.add('active');

    currentPage = page;
    document.title = `Intelli-Read - ${getPageTitle(page)}`;
}

function getPageTitle(page) {
    const titles = {
        'dashboard': 'Dashboard',
        'my-library': 'My Library',
        'reading-history': 'Reading History',
        'reviews': 'Reviews',
        'suggestions': 'Suggestions',
        'settings': 'Settings'
    };
    return titles[page] || 'Dashboard';
}

function showLoading(show) {
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (loadingSpinner) {
        loadingSpinner.style.display = show ? 'flex' : 'none';
    }
}

function showNotification(message, type = 'info') {
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    });

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function openBookDetails(bookId) {
    window.location.href = `/book-details?bookId=${bookId}`;
}
async function logout() {
    try {
        await fetch(`${window.location.origin}/api/v1/login/logout`, {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {

    }

    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
    localStorage.removeItem('currentUserId');
    window.location.href = '/login';
}