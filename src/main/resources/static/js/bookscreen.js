let currentUser = null;

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('year').textContent = new Date().getFullYear();
    initializePage();
    setupEventListeners();
});

function initializePage() {
    showLoading(true);
    try {
        getCurrentUser();
        if (!currentUser) {
            showNotification('Please login for full functionality', 'info');
        }
        renderCategoryPlaceholder();
        renderBooksUnavailable();
        renderSliderUnavailable();
    } finally {
        showLoading(false);
    }
}
function getCurrentUser() {
    const userData = localStorage.getItem('user');
    const isLoggedIn = localStorage.getItem('isLoggedIn');

    if (isLoggedIn !== 'true' || !userData) {
        currentUser = null;
        return null;
    }

    const user = JSON.parse(userData);
    const usernameElement = document.getElementById('username');
    if (usernameElement) {
        usernameElement.textContent = user.name || user.email || 'User';
    }

    currentUser = user;
    return user;
}

function renderCategoryPlaceholder() {
    const tagsContainer = document.getElementById('tags');
    const allBooksTag = tagsContainer.querySelector('[data-category="all"]');
    tagsContainer.innerHTML = '';
    if (allBooksTag) {
        tagsContainer.appendChild(allBooksTag);
    }
}

function renderBooksUnavailable() {
    const main = document.getElementById('main');
    main.innerHTML = `
        <div class="no-results">
            <h3>Book catalog coming soon</h3>
            <p>The book library feature is not available yet. Please check back later.</p>
        </div>
    `;
    document.getElementById('pagination').innerHTML = '';
}

function renderSliderUnavailable() {
    const slider = document.getElementById('recommendedSlider');
    slider.innerHTML = `
        <div style="text-align: center; padding: 40px; width: 100%; color: #666;">
            <p style="font-size: 1.1rem;">
                No books available yet. Check back later for new additions!
            </p>
        </div>
    `;
    document.getElementById('dotsContainer').innerHTML = '';
}

function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    const booksSpinner = document.getElementById('loadingBooksSpinner');
    const main = document.getElementById('main');

    if (spinner) {
        spinner.style.display = show ? 'block' : 'none';
    }
    if (booksSpinner) {
        booksSpinner.style.display = show ? 'block' : 'none';
    }
    if (main) {
        main.style.display = show ? 'none' : 'grid';
    }
}

function showNotification(message, type = 'info') {
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

function navigateToDashboard() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');

    if (currentUser && isLoggedIn === 'true') {
        window.location.href = '/user-dashboard';
    } else {
        showNotification('Please login to access your dashboard', 'error');
        window.location.href = '/login';
    }
}

function setupEventListeners() {
    const headerSearchForm = document.getElementById('headerSearchForm');
    const headerSearchInput = document.getElementById('header-search');

    if (headerSearchForm && headerSearchInput) {
        headerSearchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            renderBooksUnavailable();
            headerSearchInput.value = '';
        });
    }

    const slideLeft = document.getElementById('slideLeft');
    const slideRight = document.getElementById('slideRight');
    if (slideLeft) slideLeft.addEventListener('click', () => {});
    if (slideRight) slideRight.addEventListener('click', () => {});

    const userMenu = document.getElementById('userMenu');
    const dropdown = document.getElementById('dropdownMenu');

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

        dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
            const link = e.target.closest('a');

            if (link) {
                const href = link.getAttribute('href');

                if (link.id === 'logoutBtn') {
                    e.preventDefault();
                    logout();
                } else if (href && (href.includes('Dashboard') || href.includes('dashboard'))) {
                    e.preventDefault();
                    navigateToDashboard();
                }

                dropdown.classList.remove('active');
            }
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
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

    showNotification('Logged out successfully', 'info');

    setTimeout(() => {
        window.location.href = '/login';
    }, 1000);
}