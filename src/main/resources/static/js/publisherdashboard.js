let currentUser = null;
function loadCurrentUser() {
    try {
        const userData = localStorage.getItem('user');
        const isLoggedIn = localStorage.getItem('isLoggedIn');

        if (userData && isLoggedIn === 'true') {
            currentUser = JSON.parse(userData);
            return currentUser;
        }
        return null;
    } catch (error) {
        return null;
    }
}

function initializeUser() {
    const user = loadCurrentUser();

    if (!user) {
        showToast('User session not found. Please login again.', 'error');
        setTimeout(() => {
            window.location.href = '/login';
        }, 1500);
        return false;
    }

    const userIdInput = document.getElementById('userId');
    if (userIdInput) userIdInput.value = user.userId || '';

    return true;
}
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });

    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    const menuItem = document.querySelector(`.menu-item[onclick="showSection('${sectionId}')"]`);
    if (menuItem) {
        menuItem.classList.add('active');
    }

    if (window.innerWidth <= 1024) {
        toggleSidebar(false);
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.style.display = 'block';

        setTimeout(() => {
            toast.style.display = 'none';
        }, 4000);
    }
}

function toggleSidebar(force) {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        if (typeof force === 'boolean') {
            sidebar.classList.toggle('active', force);
        } else {
            sidebar.classList.toggle('active');
        }
    }
}

function showLoading(show) {
    const loadingOverlay = document.getElementById('globalLoading');
    if (loadingOverlay) {
        loadingOverlay.classList.toggle('active', show);
    }
}
async function logout() {
    showLoading(true);
    try {
        await fetch(`${window.location.origin}/api/v1/login/logout`, {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {

    }

    localStorage.removeItem('user');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUserId');
    currentUser = null;

    setTimeout(() => {
        showLoading(false);
        window.location.href = '/login';
    }, 800);
}

function initializeDashboard() {
    const publisherNameElem = document.getElementById('publisherName');
    const publisherNameInput = document.getElementById('publisherNameInput');
    const publisherEmail = document.getElementById('publisherEmail');

    if (currentUser) {
        if (publisherNameElem) {
            publisherNameElem.textContent = `Welcome, ${currentUser.name}`;
        }
        if (publisherNameInput) {
            publisherNameInput.value = currentUser.name || '';
        }
        if (publisherEmail) {
            publisherEmail.value = currentUser.email || '';
        }
    }

    renderUnavailableSections();
}

function renderUnavailableSections() {
    const recentBooks = document.getElementById('recentBooks');
    if (recentBooks) {
        recentBooks.innerHTML = `<p class="empty-state">No books yet. Book publishing is coming soon.</p>`;
    }

    const categoryDistribution = document.getElementById('categoryDistribution');
    if (categoryDistribution) {
        categoryDistribution.innerHTML = `<p class="empty-state">Not available yet.</p>`;
    }

    const bookTableBody = document.getElementById('bookTableBody');
    if (bookTableBody) {
        bookTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Book management is coming soon.</td></tr>`;
    }

    const quickCategoryFilters = document.getElementById('quickCategoryFilters');
    if (quickCategoryFilters) {
        quickCategoryFilters.innerHTML = '';
    }

    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.innerHTML = '<option value="all">All Categories</option>';
    }

    const bookCategory = document.getElementById('bookCategory');
    if (bookCategory) {
        bookCategory.innerHTML = '<option value="">Categories not available yet</option>';
    }

    const suggestionTableBody = document.getElementById('suggestionTableBody');
    if (suggestionTableBody) {
        suggestionTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Suggestions feature is coming soon.</td></tr>`;
    }
}

function setupEventListeners() {
    const uploadArea = document.getElementById('uploadArea');
    const coverUpload = document.getElementById('coverUpload');

    if (uploadArea && coverUpload) {
        uploadArea.addEventListener('click', () => coverUpload.click());
        coverUpload.addEventListener('change', function() {
            handleCoverUpload(this.files);
        });
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('dragover');
        });
        uploadArea.addEventListener('dragleave', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
        });
        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                handleCoverUpload(e.dataTransfer.files);
            }
        });
    }

    const addBookForm = document.getElementById('addBookForm');
    if (addBookForm) {
        addBookForm.addEventListener('submit', function(e) {
            e.preventDefault();
            showToast('Book upload is not available yet - this feature is coming soon.', 'error');
        });
    }

    window.addEventListener('click', function(event) {
        const bookModal = document.getElementById('bookModal');
        const editModal = document.getElementById('editBookModal');
        if (event.target === bookModal) bookModal.style.display = 'none';
        if (event.target === editModal) editModal.style.display = 'none';
    });

    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeEditModal();
            closeModal('bookModal');
        }
    });

    const logoutBtn = document.getElementById('logoutBtn');
    const logoutOverlay = document.getElementById('logoutOverlay');
    const confirmLogout = document.getElementById('confirmLogout');
    const cancelLogout = document.getElementById('cancelLogout');

    if (logoutBtn && logoutOverlay && confirmLogout && cancelLogout) {
        logoutBtn.addEventListener('click', () => {
            logoutOverlay.style.display = 'flex';
        });
        cancelLogout.addEventListener('click', () => {
            logoutOverlay.style.display = 'none';
        });
        confirmLogout.addEventListener('click', () => {
            logoutOverlay.style.display = 'none';
            logout();
        });
        logoutOverlay.addEventListener('click', (e) => {
            if (e.target === logoutOverlay) logoutOverlay.style.display = 'none';
        });
    }
}

function handleCoverUpload(files) {
    if (!files || !files[0]) return;
    const file = files[0];

    if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file', 'error');
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        showToast('Image size must be less than 10MB', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('coverPreview');
        if (preview) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        }
    };
    reader.onerror = function() {
        showToast('Error reading image file', 'error');
    };
    reader.readAsDataURL(file);
}

function closeEditModal() {
    const editModal = document.getElementById('editBookModal');
    if (editModal) editModal.style.display = 'none';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

function resetBookForm() {
    const form = document.getElementById('addBookForm');
    if (form) form.reset();
    const preview = document.getElementById('coverPreview');
    if (preview) preview.style.display = 'none';
}

function searchBooks() {
    showToast('Book search is not available yet.', 'error');
}

function filterBooks() {
    showToast('Book filtering is not available yet.', 'error');
}

function searchPublisherSuggestions() {
    showToast('Suggestions feature is not available yet.', 'error');
}

function filterPublisherSuggestions() {
    showToast('Suggestions feature is not available yet.', 'error');
}

function refreshSuggestions() {
    showToast('Suggestions feature is not available yet.', 'error');
}


async function updateProfile() {
    const nameInput = document.getElementById('publisherNameInput');
    const name = nameInput ? nameInput.value.trim() : '';

    if (!name) {
        showToast('Please enter a publisher name', 'error');
        return;
    }

    if (!currentUser) {
        showToast('Please login again to update your profile', 'error');
        return;
    }

    showLoading(true);
    try {
        const response = await fetch(`${window.location.origin}/api/v1/user/update-user-name`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name })
        });

        if (response.ok) {
            const updatedUser = await response.json();

            currentUser.name = updatedUser.name;
            localStorage.setItem('user', JSON.stringify(currentUser));

            const publisherNameElem = document.getElementById('publisherName');
            if (publisherNameElem) publisherNameElem.textContent = `Welcome, ${updatedUser.name}`;

            showToast('Name updated successfully! (Email, phone and company details are not saved yet - that feature is coming soon.)', 'success');
        } else {
            const errorText = await response.text();
            showToast('Failed to update profile: ' + errorText, 'error');
        }
    } catch (error) {
        showToast('Error updating profile', 'error');
    } finally {
        showLoading(false);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    if (!initializeUser()) {
        return;
    }

    initializeDashboard();
    setupEventListeners();
});