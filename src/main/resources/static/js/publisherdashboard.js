let allMyBooks = [];
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

    // Book + Category backend ab ready hai — real data load karo
    loadCategories();
    loadMyBooks();
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

    const quickCategoryFilters = document.getElementById('quickCategoryFilters');
    if (quickCategoryFilters) {
        quickCategoryFilters.innerHTML = '';
    }

    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.innerHTML = '<option value="all">All Categories</option>';
    }

    const suggestionTableBody = document.getElementById('suggestionTableBody');
    if (suggestionTableBody) {
        suggestionTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Suggestions feature is coming soon.</td></tr>`;
    }
}

// ===== Category dropdown ko DB se bharna =====
async function loadCategories() {
    const bookCategory = document.getElementById('bookCategory');
    const newCategoryParent = document.getElementById('newCategoryParent');
    try {
        const response = await fetch(`${window.location.origin}/api/v1/category/findAll`, {
            credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to fetch categories');
        const categories = await response.json();

        if (bookCategory) {
            const options = categories.map(c => `<option value="${c.id}">${c.categoryName}</option>`).join('');
            bookCategory.innerHTML = '<option value="">Select Category</option>' + options +
                '<option value="__new__">+ Suggest a new category</option>';
        }
        if (newCategoryParent) {
            const parentOptions = categories.map(c => `<option value="${c.id}">${c.categoryName}</option>`).join('');
            newCategoryParent.innerHTML = '<option value="">None (top-level category)</option>' + parentOptions;
        }
    } catch (error) {
        if (bookCategory) bookCategory.innerHTML = '<option value="">Failed to load categories</option>';
        showToast('Could not load categories. Please refresh the page.', 'error');
    }
}
function toggleCategorySuggestBlock() {
    const bookCategory = document.getElementById('bookCategory');
    const block = document.getElementById('suggestCategoryBlock');
    if (block) {
        block.style.display = (bookCategory && bookCategory.value === '__new__') ? 'block' : 'none';
    }
}

// Pehle ye function standalone /category/suggest call karke naye category ko turant DB mein
// save kar deta tha — chahe book upload aage fail ho jaaye. Ab ye sirf book-upload payload ke
// liye category fields taiyar karta hai (categoryId YA newCategoryName+newCategoryParentId),
// koi alag API call nahi karta. Category ab sirf tabhi banegi jab poora /book/upload request
// backend mein saari validations (PDF size, PDF validity, cover image) pass kar le.
function buildCategoryFields() {
    const bookCategory = document.getElementById('bookCategory');

    if (bookCategory.value !== '__new__') {
        if (!bookCategory.value) {
            throw new Error('Please select a category');
        }
        return { categoryId: parseInt(bookCategory.value) };
    }

    const newCategoryName = document.getElementById('newCategoryName').value.trim();
    const parentId = document.getElementById('newCategoryParent').value;

    if (!newCategoryName) {
        throw new Error('Please enter a name for the new category');
    }

    return {
        newCategoryName: newCategoryName,
        newCategoryParentId: parentId ? parseInt(parentId) : null
    };
}

// ===== Publisher ki apni books load karke table bharna =====
async function loadMyBooks() {
    const bookTableBody = document.getElementById('bookTableBody');
    if (!bookTableBody) return;

    try {
        const response = await fetch(`${window.location.origin}/api/v1/book/my-books`, {
            credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to fetch books');

        const books = await response.json();
        allMyBooks = books;
        updateBookStats(books);

        if (books.length === 0) {
            bookTableBody.innerHTML = `<tr><td colspan="10" style="text-align:center;">No books yet. Add your first book above.</td></tr>`;
            return;
        }

        bookTableBody.innerHTML = books.map(b => `
            <tr>
                <td class="book-cover-cell">
                    ${b.coverImagePath ? `<img src="${escapeHtml(b.coverImagePath)}" alt="cover" style="width:40px;height:56px;object-fit:cover;">` : '-'}
                </td>
                <td>${escapeHtml(b.title)}</td>
                <td>${escapeHtml(b.author)}</td>
                <td>${escapeHtml(b.categoryName || '-')}</td>
                <td>-</td>
                <td>-</td>
                <td>${escapeHtml(b.language)}</td>
                <td>${escapeHtml(b.status)}</td>
                <td>${b.uploadedAt ? new Date(b.uploadedAt).toLocaleDateString() : '-'}</td>
                <td>
                    <button type="button" class="btn-secondary" onclick="editBook(${b.id})">Edit</button>
                    <button type="button" class="btn-secondary" onclick="confirmDeleteBook(${b.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        bookTableBody.innerHTML = `<tr><td colspan="10" style="text-align:center;">Failed to load books.</td></tr>`;
    }
}

function updateBookStats(books) {
    const totalEl = document.getElementById('totalBooks');
    const publishedEl = document.getElementById('publishedBooks');
    const pendingEl = document.getElementById('draftBooks');

    if (totalEl) totalEl.textContent = books.length;
    if (publishedEl) publishedEl.textContent = books.filter(b => b.status === 'PUBLISHED').length;
    if (pendingEl) pendingEl.textContent = books.filter(b => b.status === 'PENDING').length;
}

function editBook(bookId) {
    const book = allMyBooks.find(b => b.id === bookId);
    if (!book) return;

    const form = document.getElementById('editBookForm');
    if (!form) return;

    form.innerHTML = `
        <input type="hidden" id="editBookId" value="${book.id}">
        <div class="form-group">
            <label>Book Title *</label>
            <input type="text" id="editBookTitle" value="${escapeHtml(book.title)}" required>
        </div>
        <div class="form-group">
            <label>Author *</label>
            <input type="text" id="editBookAuthor" value="${escapeHtml(book.author)}" required>
        </div>
        <div class="form-group">
            <label>Language *</label>
            <input type="text" id="editBookLanguage" value="${escapeHtml(book.language)}" required>
        </div>
        <div class="form-group">
            <label>Description</label>
            <textarea id="editBookDescription">${escapeHtml(book.description || '')}</textarea>
        </div>
        <div class="action-buttons">
            <button type="submit" class="btn-primary">Save Changes</button>
        </div>
    `;

    form.onsubmit = async function(e) {
        e.preventDefault();
        await submitEditBook(book.categoryId);
    };

    const editModal = document.getElementById('editBookModal');
    if (editModal) editModal.style.display = 'block';
}

async function submitEditBook(categoryId) {
    const bookId = document.getElementById('editBookId').value;
    const payload = {
        title: document.getElementById('editBookTitle').value.trim(),
        author: document.getElementById('editBookAuthor').value.trim(),
        description: document.getElementById('editBookDescription').value.trim(),
        language: document.getElementById('editBookLanguage').value.trim(),
        categoryId: categoryId
    };

    showLoading(true);
    try {
        const response = await fetch(`${window.location.origin}/api/v1/book/${bookId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showToast('Book updated. It will be reviewed again by admin.', 'success');
            closeEditModal();
            loadMyBooks();
        } else {
            const errorText = await response.text();
            showToast('Update failed: ' + errorText, 'error');
        }
    } catch (error) {
        showToast('Error updating book', 'error');
    } finally {
        showLoading(false);
    }
}

function confirmDeleteBook(bookId) {
    if (!window.confirm('Are you sure you want to delete this book? This cannot be undone.')) {
        return;
    }
    deleteBookRequest(bookId);
}

async function deleteBookRequest(bookId) {
    showLoading(true);
    try {
        const response = await fetch(`${window.location.origin}/api/v1/book/${bookId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.ok) {
            showToast('Book deleted successfully', 'success');
            loadMyBooks();
        } else {
            const errorText = await response.text();
            showToast('Delete failed: ' + errorText, 'error');
        }
    } catch (error) {
        showToast('Error deleting book', 'error');
    } finally {
        showLoading(false);
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
        addBookForm.addEventListener('submit', handleAddBookSubmit);
    }

    const bookCategory = document.getElementById('bookCategory');
    if (bookCategory) {
        bookCategory.addEventListener('change', toggleCategorySuggestBlock);
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

// ===== Add Book form submit — real backend call =====
async function handleAddBookSubmit(e) {
    e.preventDefault();

    let categoryFields;
    try {
        categoryFields = buildCategoryFields();
    } catch (error) {
        showToast(error.message || 'Please select or suggest a category', 'error');
        return;
    }

    const bookData = {
        title: document.getElementById('bookTitle').value.trim(),
        author: document.getElementById('bookAuthor').value.trim(),
        description: document.getElementById('bookDescription').value.trim(),
        language: document.getElementById('bookLanguage').value.trim(),
        ...categoryFields
    };

    if (!bookData.title || !bookData.author || !bookData.language) {
        showToast('Please fill all required fields', 'error');
        return;
    }

    const bookFileInput = document.getElementById('bookFile');
    const coverUploadInput = document.getElementById('coverUpload');

    const pdfFile = bookFileInput ? bookFileInput.files[0] : null;
    const coverImage = coverUploadInput ? coverUploadInput.files[0] : null;

    if (!pdfFile) {
        showToast('Please select a book file (PDF)', 'error');
        return;
    }
    // Server bhi 10MB check karta hai — ye sirf turant feedback ke liye, upload shuru hone se pehle
    if (pdfFile.size > 10 * 1024 * 1024) {
        showToast('PDF file size should not exceed 10MB', 'error');
        return;
    }
    if (!coverImage) {
        showToast('Please upload a cover image', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('book', new Blob([JSON.stringify(bookData)], { type: 'application/json' }));
    formData.append('pdfFile', pdfFile);
    formData.append('coverImage', coverImage);

    const submitBtn = document.getElementById('submitBookBtn');
    if (submitBtn) submitBtn.disabled = true;
    showLoading(true);

    try {
        const response = await fetch(`${window.location.origin}/api/v1/book/upload`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        if (response.ok) {
            showToast('Book uploaded successfully! Waiting for review.', 'success');
            resetBookForm();
            loadMyBooks();
        } else {
            const errorText = await response.text();
            showToast('Upload failed: ' + errorText, 'error');
        }
    } catch (error) {
        showToast('Error uploading book. Please try again.', 'error');
    } finally {
        showLoading(false);
        if (submitBtn) submitBtn.disabled = false;
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
    const suggestBlock = document.getElementById('suggestCategoryBlock');
    if (suggestBlock) suggestBlock.style.display = 'none';
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

function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(value);
    return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', function() {
    if (!initializeUser()) {
        return;
    }

    initializeDashboard();
    setupEventListeners();
});