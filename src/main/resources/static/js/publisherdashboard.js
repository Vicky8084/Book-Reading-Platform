// =============================================
// ✅ GLOBAL VARIABLES & CONFIGURATION
// =============================================
const API_BASE_URL = 'http://localhost:8081';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ✅ CORRECTED API Endpoints
const SUGGESTION_API = {
    GET_ALL: `${API_BASE_URL}/suggestion/all`,
    GET_BY_PUBLISHER: `${API_BASE_URL}/suggestion/publisher`,
    EXPRESS_INTEREST: `${API_BASE_URL}/suggestion/interest`,
    UPLOAD_FOR_SUGGESTION: `${API_BASE_URL}/suggestion/upload`,
    GET_DETAILS: `${API_BASE_URL}/suggestion`
};

let categories = [];
let books = [];
let currentPublisher = null;
let currentUserId = null;
let allReviews = [];
let currentPage = 1;
const booksPerPage = 6;
let suggestionsRefreshInterval = null;

// =============================================
// ✅ USER AUTHENTICATION & ID MANAGEMENT
// =============================================

function getCurrentUserId() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        let userId = urlParams.get('userId');

        if (userId) {
            console.log('✅ User ID from URL:', userId);
            localStorage.setItem('currentUserId', userId);
            currentUserId = parseInt(userId);
            return currentUserId;
        }

        userId = localStorage.getItem('currentUserId');
        if (userId) {
            console.log('✅ User ID from localStorage:', userId);
            currentUserId = parseInt(userId);
            return currentUserId;
        }

        console.error('❌ No user ID found!');
        showToast('User session not found. Please login again.', 'error');
        return null;
    } catch (error) {
        console.error('❌ Error getting user ID:', error);
        return null;
    }
}

function initializeUser() {
    try {
        currentUserId = getCurrentUserId();
        const userIdInput = document.getElementById('userId');

        if (userIdInput && currentUserId) {
            userIdInput.value = currentUserId;
        }

        console.log('👤 Current user ID:', currentUserId);

        if (!currentUserId) {
            showToast('User ID not found. Please login again.', 'error');
            setTimeout(() => {
                window.location.href = '/login';
            }, 3000);
            return false;
        }

        return true;
    } catch (error) {
        console.error('❌ Error initializing user:', error);
        showToast('Error initializing user session.', 'error');
        return false;
    }
}

function initializeUserFromURL() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('userId');

        if (userId) {
            const userIdInput = document.getElementById('userId');
            if (userIdInput) {
                userIdInput.value = userId;
            }
            localStorage.setItem('currentUserId', userId);
            currentUserId = parseInt(userId);
            console.log('✅ User ID set from URL:', currentUserId);
            return true;
        }
        return false;
    } catch (error) {
        console.error('❌ Error initializing user from URL:', error);
        return false;
    }
}

// =============================================
// ✅ BASIC UI FUNCTIONS
// =============================================

function showSection(sectionId) {
    try {
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

        console.log(`✅ Switched to section: ${sectionId}`);

        switch(sectionId) {
            case 'dashboard':
                loadDashboardStats();
                break;
            case 'myBooks':
                loadBooksFromAPI();
                break;
            case 'addBook':
                break;
            case 'suggestions':
                loadPublisherSuggestions();
                break;
            case 'analytics':
                break;
            case 'profile':
                break;
        }
    } catch (error) {
        console.error('❌ Error showing section:', error);
    }
}

function showToast(message, type = 'success') {
    try {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = message;
            toast.className = `toast ${type}`;
            toast.style.display = 'block';

            setTimeout(() => {
                toast.style.display = 'none';
            }, 4000);
        }
    } catch (error) {
        console.error('❌ Error showing toast:', error);
    }
}

function showNotification(message, type = 'success') {
    showToast(message, type);
}

function logout() {
    showLoading(true);
    try {
        localStorage.removeItem('currentPublisher');
        localStorage.removeItem('currentUserId');
        localStorage.removeItem('jwtToken');
        sessionStorage.removeItem('jwtToken');
        currentUserId = null;

        setTimeout(() => {
            showLoading(false);
            window.location.href = '/login';
        }, 1000);
    } catch (error) {
        console.error('❌ Error during logout:', error);
        showLoading(false);
        window.location.href = '/login';
    }
}

function closeEditModal() {
    try {
        const editModal = document.getElementById('editBookModal');
        if (editModal) {
            editModal.style.display = 'none';
        }
    } catch (error) {
        console.error('❌ Error closing edit modal:', error);
    }
}

function toggleSidebar(force) {
    try {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            if (typeof force === 'boolean') {
                sidebar.classList.toggle('active', force);
            } else {
                sidebar.classList.toggle('active');
            }
        }
    } catch (error) {
        console.error('❌ Error toggling sidebar:', error);
    }
}

function showLoading(show) {
    try {
        const loadingOverlay = document.getElementById('globalLoading');
        if (loadingOverlay) {
            if (show) {
                loadingOverlay.classList.add('active');
            } else {
                loadingOverlay.classList.remove('active');
            }
        }
    } catch (error) {
        console.error('❌ Error showing loading:', error);
    }
}

// =============================================
// ✅ AUTHENTICATION FUNCTIONS
// =============================================

function getAuthToken() {
    try {
        return localStorage.getItem('jwtToken') || sessionStorage.getItem('jwtToken');
    } catch (error) {
        console.error('❌ Error getting auth token:', error);
        return null;
    }
}

async function authFetch(url, options = {}) {
    const token = getAuthToken();

    const headers = {
        ...options.headers
    };

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers
        });

        if (response.status === 401 || response.status === 403) {
            console.error('Access forbidden - check authentication');
            showToast('Session expired. Please login again.', 'error');
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
            throw new Error('Authentication failed');
        }

        return response;
    } catch (error) {
        console.error('❌ Fetch error:', error);
        if (error.message !== 'Authentication failed') {
            showToast('Network error. Please check your connection.', 'error');
        }
        throw error;
    }
}

// =============================================
// ✅ DASHBOARD INITIALIZATION
// =============================================

function initializeDashboard() {
    try {
        const token = getAuthToken();
        if (!token) {
            showToast('Please login to access publisher dashboard', 'error');
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
            return;
        }

        const savedPublisher = localStorage.getItem('currentPublisher');
        if (savedPublisher) {
            currentPublisher = JSON.parse(savedPublisher);
            const publisherNameElem = document.getElementById('publisherName');
            const publisherNameInput = document.getElementById('publisherNameInput');

            if (publisherNameElem) {
                publisherNameElem.textContent = `Welcome, ${currentPublisher.name}`;
            }
            if (publisherNameInput) {
                publisherNameInput.value = currentPublisher.name;
            }
        }

        console.log('✅ Dashboard initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing dashboard:', error);
        showToast('Error initializing dashboard', 'error');
    }
}

function setupEventListeners() {
    try {
        const uploadArea = document.getElementById('uploadArea');
        const coverUpload = document.getElementById('coverUpload');

        if (uploadArea && coverUpload) {
            uploadArea.addEventListener('click', () => {
                coverUpload.click();
            });

            coverUpload.addEventListener('change', function(e) {
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
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    handleCoverUpload(files);
                }
            });
        }

        const addBookForm = document.getElementById('addBookForm');
        if (addBookForm) {
            addBookForm.addEventListener('submit', function(e) {
                e.preventDefault();
                addNewBook();
            });
        }

        window.addEventListener('click', function(event) {
            const bookModal = document.getElementById('bookModal');
            const editModal = document.getElementById('editBookModal');

            if (event.target === bookModal) {
                bookModal.style.display = 'none';
            }

            if (event.target === editModal) {
                editModal.style.display = 'none';
            }
        });

        const closeButtons = document.querySelectorAll('.close');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const modal = this.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                }
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
                if (e.target === logoutOverlay) {
                    logoutOverlay.style.display = 'none';
                }
            });
        }

        console.log('✅ Event listeners setup completed');
    } catch (error) {
        console.error('❌ Error setting up event listeners:', error);
    }
}

function handleCoverUpload(files) {
    try {
        if (files && files[0]) {
            const file = files[0];

            if (!file.type.startsWith('image/')) {
                showToast('Please select a valid image file', 'error');
                return;
            }

            if (file.size > MAX_FILE_SIZE) {
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
    } catch (error) {
        console.error('❌ Error handling cover upload:', error);
        showToast('Error uploading cover image', 'error');
    }
}

// =============================================
// ✅ CATEGORY MANAGEMENT FUNCTIONS
// =============================================

function setDefaultCategories() {
    try {
        categories = [];
        console.log('🔄 Using default categories:', categories.length);
        populateCategoryDropdowns();
    } catch (error) {
        console.error('❌ Error setting default categories:', error);
    }
}

async function loadCategories() {
    try {
        console.log('🔄 Loading categories from API...');
        const response = await authFetch(`${API_BASE_URL}/category/apies/findAll`);

        if (response.ok) {
            const categoriesData = await response.json();
            console.log('📥 Categories API Response:', categoriesData);

            if (categoriesData && categoriesData.length > 0) {
                categories = categoriesData;
                console.log('✅ Categories loaded successfully:', categories.length);
            } else {
                console.log('⚠️ No categories found in API response, using defaults');
                setDefaultCategories();
                return;
            }
            populateCategoryDropdowns();
            updateCategoryFilters();
        } else {
            console.error('❌ Categories API failed with status:', response.status);
            setDefaultCategories();
        }
    } catch (error) {
        console.error('❌ Error loading categories:', error);
        setDefaultCategories();
    }
}

function populateCategoryDropdowns() {
    try {
        const addBookCategory = document.getElementById('bookCategory');
        const filterCategory = document.getElementById('categoryFilter');

        console.log('🔄 Populating category dropdowns...');
        console.log('Available categories:', categories);

        if (addBookCategory) {
            while (addBookCategory.options.length > 1) {
                addBookCategory.remove(1);
            }

            categories.forEach(category => {
                const option = new Option(category.categoryName, category.id);
                addBookCategory.add(option);
            });

            console.log('✅ Book category dropdown populated with', categories.length, 'categories');
        }

        if (filterCategory) {
            while (filterCategory.options.length > 1) {
                filterCategory.remove(1);
            }

            categories.forEach(category => {
                const option = new Option(category.categoryName, category.id);
                filterCategory.add(option);
            });

            console.log('✅ Filter category dropdown populated');
        }
    } catch (error) {
        console.error('❌ Error populating category dropdowns:', error);
    }
}

// =============================================
// ✅ BOOK MANAGEMENT FUNCTIONS
// =============================================

async function loadBooksFromAPI() {
    showLoading(true);
    try {
        console.log('📚 Loading books for user ID:', currentUserId);

        if (!currentUserId) {
            throw new Error('User ID not available');
        }

        const response = await authFetch(`${API_BASE_URL}/book/apies/user/${currentUserId}`);

        if (response.ok) {
            const booksData = await response.json();
            books = booksData;

            console.log('📥 Books loaded:', books.length);
            books.forEach((book, index) => {
                console.log(`Book ${index + 1}:`, {
                    title: book.title,
                    category: book.category,
                    categoryId: book.category ? book.category.id : 'No category',
                    categoryName: book.category ? book.category.categoryName : 'No name'
                });
            });

            await loadAllReviews();

            renderBooksTable();
            updateDashboardStats();
            loadRecentBooks();
            updateCategoryDistribution();
            updateCategoryFilters();

            showToast(`Loaded ${books.length} books successfully`, 'success');
        } else {
            const errorText = await response.text();
            throw new Error(errorText || `Failed to load books: ${response.status}`);
        }
    } catch (error) {
        console.error('❌ Error loading books:', error);
        showToast('Failed to load books: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// =============================================
// ✅ REVIEW MANAGEMENT FUNCTIONS
// =============================================

async function loadAllReviews() {
    try {
        console.log('📝 Loading all reviews...');
        allReviews = [];

        if (!books || books.length === 0) {
            console.log('No books available for loading reviews');
            return;
        }

        for (const book of books) {
            try {
                const response = await authFetch(`${API_BASE_URL}/review/apies/book/${book.id}`);
                if (response.ok) {
                    const bookReviews = await response.json();
                    allReviews.push(...bookReviews.map(review => ({
                        ...review,
                        bookId: book.id
                    })));
                    console.log(`✅ Loaded ${bookReviews.length} reviews for book ${book.id}`);
                }
            } catch (error) {
                console.error(`❌ Error loading reviews for book ${book.id}:`, error);
            }
        }

        console.log(`✅ Total reviews loaded: ${allReviews.length}`);
    } catch (error) {
        console.error('❌ Error loading reviews:', error);
    }
}

function getBookReviews(bookId) {
    return allReviews.filter(review => review.bookId === bookId);
}

function calculateBookRatingStats(bookId) {
    const bookReviews = getBookReviews(bookId);
    const count = bookReviews.length;
    const averageRating = count > 0 ?
        bookReviews.reduce((sum, review) => sum + (review.rating || 0), 0) / count : 0;

    return {
        count,
        averageRating: parseFloat(averageRating.toFixed(1))
    };
}

function updateDashboardStats() {
    try {
        const totalBooks = books.length;
        const publishedBooks = books.filter(book =>
            book.status === 'published' || book.status === 'PUBLISHED' || book.status === 'APPROVED'
        ).length;
        const draftBooks = books.filter(book =>
            book.status === 'draft' || book.status === 'DRAFT' || book.status === 'PENDING' || !book.status
        ).length;

        const uniqueCategories = new Set();
        books.forEach(book => {
            if (book.category && book.category.id) {
                uniqueCategories.add(book.category.id);
            }
        });

        let totalReviews = 0;
        let totalRating = 0;
        let booksWithReviews = 0;

        books.forEach(book => {
            const stats = calculateBookRatingStats(book.id);
            if (stats.count > 0) {
                totalReviews += stats.count;
                totalRating += stats.averageRating;
                booksWithReviews++;
            }
        });

        const averageRating = booksWithReviews > 0 ? (totalRating / booksWithReviews) : 0;

        updateStats({
            totalBooks,
            publishedBooks,
            draftBooks,
            totalCategories: uniqueCategories.size,
            totalReviews,
            averageRating: parseFloat(averageRating.toFixed(1))
        });
    } catch (error) {
        console.error('❌ Error updating dashboard stats:', error);
    }
}

function updateStats(stats) {
    try {
        const totalBooksElem = document.getElementById('totalBooks');
        const publishedBooksElem = document.getElementById('publishedBooks');
        const draftBooksElem = document.getElementById('draftBooks');
        const totalCategoriesElem = document.getElementById('totalCategories');
        const totalReviewsElem = document.getElementById('totalReviews');
        const averageRatingElem = document.getElementById('averageRating');

        if (totalBooksElem) totalBooksElem.textContent = stats.totalBooks;
        if (publishedBooksElem) publishedBooksElem.textContent = stats.publishedBooks;
        if (draftBooksElem) draftBooksElem.textContent = stats.draftBooks;
        if (totalCategoriesElem) totalCategoriesElem.textContent = stats.totalCategories;
        if (totalReviewsElem) totalReviewsElem.textContent = stats.totalReviews;
        if (averageRatingElem) averageRatingElem.textContent = stats.averageRating;
    } catch (error) {
        console.error('❌ Error updating stats display:', error);
    }
}

function loadPublisherData() {
    try {
        updateStats({
            totalBooks: 0,
            publishedBooks: 0,
            draftBooks: 0,
            totalCategories: 0,
            totalReviews: 0,
            averageRating: 0
        });
    } catch (error) {
        console.error('❌ Error loading publisher data:', error);
    }
}

// =============================================
// ✅ RECENT BOOKS & CATEGORY DISTRIBUTION
// =============================================

function loadRecentBooks() {
    try {
        const recentBooksContainer = document.getElementById('recentBooks');
        if (!recentBooksContainer) return;

        const sortedBooks = [...books].sort((a, b) => {
            const dateA = new Date(a.uploadedAt || a.createdAt || 0);
            const dateB = new Date(b.uploadedAt || b.createdAt || 0);
            return dateB - dateA;
        });

        const recentBooks = sortedBooks.slice(0, 5);
        let html = '';

        if (recentBooks.length > 0) {
            recentBooks.forEach(book => {
                const statusClass = `status-${(book.status || 'draft').toLowerCase()}`;
                const date = book.uploadedAt || book.createdAt ?
                    new Date(book.uploadedAt || book.createdAt).toLocaleDateString() :
                    'Recent';

                const categoryName = book.category ?
                    (book.category.categoryName || book.category) :
                    'Uncategorized';

                const reviewStats = calculateBookRatingStats(book.id);

                html += `
                    <div class="activity-item">
                        <div class="activity-info">
                            <h4>${book.title || 'Untitled'}</h4>
                            <div style="display: flex; gap: 8px; margin-top: 5px; flex-wrap: wrap;">
                                <span class="status-badge ${statusClass}">${book.status || 'draft'}</span>
                                <span class="category-badge">${categoryName}</span>
                                ${reviewStats.count > 0 ?
                                    `<span class="rating-display">
                                        <span class="review-rating">${generateStarRating(reviewStats.averageRating)}</span>
                                        <span class="rating-value">(${reviewStats.averageRating})</span>
                                    </span>` :
                                    '<span style="color: #888; font-size: 0.8rem;">No reviews</span>'
                                }
                            </div>
                        </div>
                        <span class="activity-time">${date}</span>
                    </div>
                `;
            });
        } else {
            html = `
                <div class="activity-item">
                    <div class="activity-info">
                        <h4>No books found</h4>
                        <p>Add your first book to see it here!</p>
                    </div>
                </div>
            `;
        }

        recentBooksContainer.innerHTML = html;
    } catch (error) {
        console.error('❌ Error loading recent books:', error);
    }
}

function updateCategoryDistribution() {
    try {
        const distributionContainer = document.getElementById('categoryDistribution');
        if (!distributionContainer) return;

        const categoryCounts = {};

        books.forEach(book => {
            let categoryName = 'Uncategorized';

            if (book.category) {
                categoryName = book.category.categoryName ||
                              (typeof book.category === 'string' ? book.category : 'Uncategorized');
            }

            categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
        });

        let html = '';

        if (Object.keys(categoryCounts).length > 0) {
            Object.entries(categoryCounts).forEach(([category, count]) => {
                const percentage = books.length > 0 ? ((count / books.length) * 100).toFixed(1) : 0;

                html += `
                    <div class="activity-item">
                        <div class="activity-info">
                            <h4>${category}</h4>
                            <span class="category-badge">${count} books</span>
                        </div>
                        <span class="activity-time">${percentage}%</span>
                    </div>
                `;
            });
        } else {
            html = `
                <div class="activity-item">
                    <div class="activity-info">
                        <h4>No categories found</h4>
                        <p>Books will appear here once categories are assigned</p>
                    </div>
                </div>
            `;
        }

        distributionContainer.innerHTML = html;
    } catch (error) {
        console.error('❌ Error updating category distribution:', error);
    }
}

function updateCategoryFilters() {
    try {
        const quickFilters = document.getElementById('quickCategoryFilters');
        if (!quickFilters) return;

        let html = '<div class="category-filter-btn active" onclick="filterBooksByCategory(\'\')">All</div>';

        const categoryCounts = {};
        books.forEach(book => {
            if (book.category && book.category.id) {
                categoryCounts[book.category.id] = (categoryCounts[book.category.id] || 0) + 1;
            }
        });

        const topCategories = Object.entries(categoryCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        topCategories.forEach(([categoryId, count]) => {
            const category = categories.find(c => c.id == categoryId);
            if (category) {
                html += `<div class="category-filter-btn" onclick="filterBooksByCategory(${categoryId})">
                          ${category.categoryName} (${count})
                         </div>`;
            }
        });

        quickFilters.innerHTML = html;
    } catch (error) {
        console.error('❌ Error updating category filters:', error);
    }
}

// =============================================
// ✅ BOOK TABLE & DISPLAY FUNCTIONS
// =============================================

function renderBooksTable(filteredBooks = null) {
    try {
        const booksToRender = filteredBooks || books;
        const tableBody = document.getElementById('bookTableBody');
        const pagination = document.getElementById('bookPagination');

        if (!tableBody) return;

        if (!booksToRender || booksToRender.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 20px;">No books found</td></tr>';
            if (pagination) pagination.innerHTML = '';
            return;
        }

        const totalPages = Math.ceil(booksToRender.length / booksPerPage);
        const startIndex = (currentPage - 1) * booksPerPage;
        const endIndex = startIndex + booksPerPage;
        const booksToShow = booksToRender.slice(startIndex, endIndex);

        let html = '';
        booksToShow.forEach(book => {
            const statusClass = `status-${(book.status || 'draft').toLowerCase()}`;
            const date = book.uploadedAt || book.createdAt ?
                new Date(book.uploadedAt || book.createdAt).toLocaleDateString() :
                new Date().toLocaleDateString();

            const coverUrl = book.coverImagePath ?
                `${API_BASE_URL}/uploads/${book.coverImagePath}` :
                generatePlaceholderSvg(book.title);

            let categoryName = 'Uncategorized';
            let categoryId = null;

            if (book.category) {
                categoryName = book.category.categoryName || 'Uncategorized';
                categoryId = book.category.id;
            } else if (book.categoryId) {
                const category = categories.find(cat => cat.id === book.categoryId);
                categoryName = category ? category.categoryName : `Category ${book.categoryId}`;
                categoryId = book.categoryId;
            }

            const reviewStats = calculateBookRatingStats(book.id);

            html += `
                <tr>
                    <td class="book-cover-cell">
                        <img src="${coverUrl}" alt="${book.title}"
                             onerror="this.src='${generatePlaceholderSvg(book.title)}'">
                    </td>
                    <td>${book.title || 'Untitled'}</td>
                    <td>${book.author || 'Unknown Author'}</td>
                    <td><span class="category-badge">${categoryName}</span></td>
                    <td>
                        ${reviewStats.count > 0 ?
                            `<span class="review-count-badge">${reviewStats.count}</span>` :
                            '<span style="color: #888;">0</span>'
                        }
                    </td>
                    <td>
                        ${reviewStats.count > 0 ?
                            `<div class="rating-display">
                                <span class="review-rating">${generateStarRating(reviewStats.averageRating)}</span>
                                <span class="rating-value">${reviewStats.averageRating}</span>
                            </div>` :
                            '<span style="color: #888;">No rating</span>'
                        }
                    </td>
                    <td>${book.language || 'English'}</td>
                    <td><span class="status-badge ${statusClass}">${book.status || 'draft'}</span></td>
                    <td>${date}</td>
                    <td>
                        <div class="book-actions">
                            <button class="btn-primary btn-sm" onclick="viewBook(${book.id})">View</button>
                            <button class="btn-secondary btn-sm" onclick="editBook(${book.id})">Edit</button>
                            <button class="btn-danger btn-sm" onclick="deleteBook(${book.id})">Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tableBody.innerHTML = html;
        renderPagination(totalPages);
    } catch (error) {
        console.error('❌ Error rendering books table:', error);
    }
}

function renderPagination(totalPages) {
    try {
        const pagination = document.getElementById('bookPagination');
        if (!pagination) return;

        let html = '';

        html += `<button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>`;

        for (let i = 1; i <= totalPages; i++) {
            html += `<button onclick="changePage(${i})" class="${i === currentPage ? 'active' : ''}">${i}</button>`;
        }

        html += `<button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>`;

        pagination.innerHTML = html;
    } catch (error) {
        console.error('❌ Error rendering pagination:', error);
    }
}

function changePage(page) {
    const totalPages = Math.ceil(books.length / booksPerPage);
    if (page < 1 || page > totalPages) return;

    currentPage = page;
    renderBooksTable();

    const tableContainer = document.querySelector('.table-container');
    if (tableContainer) {
        tableContainer.scrollIntoView({ behavior: 'smooth' });
    }
}

function generatePlaceholderSvg(title) {
    try {
        const initials = title ? title.charAt(0).toUpperCase() : 'B';
        const svg = `
            <svg width="50" height="65" xmlns="http://www.w3.org/2000/svg">
                <rect width="100%" height="100%" fill="#4a90e2"/>
                <text x="50%" y="50%" font-family="Arial" font-size="20" fill="white"
                      text-anchor="middle" dy=".3em">${initials}</text>
            </svg>
        `;
        return 'data:image/svg+xml;base64,' + btoa(svg);
    } catch (error) {
        console.error('❌ Error generating placeholder SVG:', error);
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNjUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iIzRhOTBlMiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+QjwvdGV4dD48L3N2Zz4=';
    }
}

// =============================================
// ✅ BOOK EVENT HANDLERS - BACKEND CRUD
// =============================================

function validateBookForm() {
    try {
        const title = document.getElementById('bookTitle').value.trim();
        const author = document.getElementById('bookAuthor').value.trim();
        const category = document.getElementById('bookCategory').value;
        const language = document.getElementById('bookLanguage').value.trim();
        const bookFile = document.getElementById('bookFile').files[0];

        if (!title || title.length < 2) {
            showToast('Please enter a valid book title (min 2 characters)', 'error');
            return false;
        }

        if (!author || author.length < 2) {
            showToast('Please enter a valid author name (min 2 characters)', 'error');
            return false;
        }

        if (!category) {
            showToast('Please select a category', 'error');
            return false;
        }

        if (!language) {
            showToast('Please enter a language', 'error');
            return false;
        }

        if (!bookFile) {
            showToast('Please select a book file', 'error');
            return false;
        }

        const allowedTypes = ['.pdf', '.txt'];
        const fileExtension = '.' + bookFile.name.split('.').pop().toLowerCase();
        if (!allowedTypes.includes(fileExtension)) {
            showToast('Please select a PDF or TXT file', 'error');
            return false;
        }

        if (bookFile.size > MAX_FILE_SIZE) {
            showToast('File size must be less than 10MB', 'error');
            return false;
        }

        return true;
    } catch (error) {
        console.error('❌ Error validating book form:', error);
        showToast('Error validating form data', 'error');
        return false;
    }
}

async function addNewBook() {
    const submitBtn = document.getElementById('submitBookBtn');
    const spinner = document.getElementById('submitSpinner');

    try {
        if (!validateBookForm()) {
            return;
        }

        submitBtn.disabled = true;
        if (spinner) spinner.style.display = 'inline-block';

        if (!currentUserId) {
            throw new Error('User ID not found. Please login again.');
        }

        const formData = new FormData();

        const bookData = {
            title: document.getElementById('bookTitle').value.trim(),
            author: document.getElementById('bookAuthor').value.trim(),
            description: document.getElementById('bookDescription').value.trim(),
            language: document.getElementById('bookLanguage').value.trim(),
            userId: currentUserId,
            categoryId: document.getElementById('bookCategory').value,
            status: "PENDING"
        };

        const suggestionContext = sessionStorage.getItem('uploadForSuggestion');
        if (suggestionContext) {
            const context = JSON.parse(suggestionContext);
            bookData.suggestionId = context.suggestionId;
            console.log('📚 Uploading book for suggestion:', context.suggestionId);
        }

        console.log('📤 Sending book data for user:', currentUserId, 'Data:', bookData);

        formData.append('book', JSON.stringify(bookData));

        const pdfFile = document.getElementById('bookFile').files[0];
        const coverFile = document.getElementById('coverUpload').files[0];

        if (pdfFile) {
            formData.append('file', pdfFile);
        }
        if (coverFile) {
            formData.append('cover', coverFile);
        }

        const response = await authFetch(`${API_BASE_URL}/book/apies/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Upload failed with status: ${response.status}`);
        }

        const result = await response.text();

        if (suggestionContext) {
            const context = JSON.parse(suggestionContext);
            await markSuggestionAsUploaded(context.suggestionId);
            sessionStorage.removeItem('uploadForSuggestion');
            showToast('Book created and suggestion marked as fulfilled!', 'success');
        } else {
            showToast('Book created successfully!', 'success');
        }

        resetBookForm();

        setTimeout(() => {
            loadBooksFromAPI();
            loadPublisherSuggestions();
            showSection(suggestionContext ? 'suggestions' : 'myBooks');
        }, 1500);

    } catch (error) {
        console.error('❌ Error creating book:', error);
        showToast('Failed to create book: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        if (spinner) spinner.style.display = 'none';
    }
}

async function markSuggestionAsUploaded(suggestionId) {
    try {
        const response = await authFetch(`${SUGGESTION_API.UPLOAD_FOR_SUGGESTION}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                suggestionId: suggestionId,
                publisherId: currentUserId,
                uploadedAt: new Date().toISOString(),
                status: 'UPLOADED'
            })
        });

        if (response.ok) {
            console.log('✅ Suggestion marked as uploaded:', suggestionId);
        }
    } catch (error) {
        console.error('❌ Error marking suggestion as uploaded:', error);
    }
}

function resetBookForm() {
    try {
        document.getElementById('addBookForm').reset();
        const coverPreview = document.getElementById('coverPreview');
        if (coverPreview) {
            coverPreview.style.display = 'none';
            coverPreview.src = '';
        }
    } catch (error) {
        console.error('❌ Error resetting book form:', error);
    }
}

function viewBook(bookId) {
    try {
        const book = books.find(b => b.id === bookId);
        if (!book) {
            showToast('Book not found', 'error');
            return;
        }

        const modal = document.getElementById('bookModal');
        const bookDetails = document.getElementById('bookDetails');

        if (!modal || !bookDetails) return;

        const coverUrl = book.coverImagePath ?
            `${API_BASE_URL}/uploads/${book.coverImagePath}` :
            generatePlaceholderSvg(book.title);

        const date = new Date(book.uploadedAt || book.createdAt).toLocaleDateString();
        const categoryName = book.category ? book.category.categoryName : 'Uncategorized';

        bookDetails.innerHTML = `
            <div class="book-detail-view">
                <div class="book-cover-large">
                    <img src="${coverUrl}" alt="${book.title}"
                         onerror="this.src='${generatePlaceholderSvg(book.title)}'">
                </div>
                <div class="book-info">
                    <h3>${book.title}</h3>
                    <p><strong>Author:</strong> ${book.author}</p>
                    <p><strong>Category:</strong> <span class="category-badge">${categoryName}</span></p>
                    <p><strong>Language:</strong> ${book.language || 'English'}</p>
                    <p><strong>Status:</strong> <span class="status-badge status-${(book.status || 'draft').toLowerCase()}">${book.status || 'draft'}</span></p>
                    <p><strong>Date Added:</strong> ${date}</p>
                    <p><strong>Description:</strong> ${book.description || 'No description available.'}</p>
                    ${book.fileName ? `<p><strong>File:</strong> ${book.fileName}</p>` : ''}
                    ${book.fileSize ? `<p><strong>File Size:</strong> ${(book.fileSize / 1024 / 1024).toFixed(2)} MB</p>` : ''}
                    ${book.extractedText ? `<p><strong>Content Preview:</strong> ${book.extractedText.substring(0, 200)}...</p>` : ''}
                </div>
            </div>

            <div class="reviews-section" style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                <h3>📝 Reader Reviews</h3>
                <div id="reviewsContent-${book.id}">
                    <p>Loading reviews...</p>
                </div>
            </div>

            <div class="action-buttons" style="margin-top: 20px;">
                <button class="btn-primary" onclick="closeModal('bookModal')">Close</button>
            </div>
        `;

        modal.style.display = 'block';

        loadBookReviewsForModal(book.id);
    } catch (error) {
        console.error('❌ Error viewing book:', error);
        showToast('Error loading book details', 'error');
    }
}

function editBook(bookId) {
    try {
        const book = books.find(b => b.id === bookId);
        if (!book) {
            showToast('Book not found', 'error');
            return;
        }

        const modal = document.getElementById('editBookModal');
        const editForm = document.getElementById('editBookForm');

        if (!modal || !editForm) return;

        let categoryOptions = '';
        categories.forEach(category => {
            const selected = book.category && book.category.id === category.id ? 'selected' : '';
            categoryOptions += `<option value="${category.id}" ${selected}>${category.categoryName}</option>`;
        });

        editForm.innerHTML = `
            <input type="hidden" id="editBookId" value="${book.id}">
            <div class="form-row">
                <div class="form-group">
                    <label for="editBookTitle">Book Title *</label>
                    <input type="text" id="editBookTitle" value="${book.title || ''}" required>
                </div>
                <div class="form-group">
                    <label for="editBookAuthor">Author *</label>
                    <input type="text" id="editBookAuthor" value="${book.author || ''}" required>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="editBookCategory">Category</label>
                    <select id="editBookCategory">
                        <option value="">Select Category</option>
                        ${categoryOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="editBookLanguage">Language *</label>
                    <input type="text" id="editBookLanguage" value="${book.language || 'English'}" required>
                </div>
            </div>

            <div class="form-group">
                <label for="editBookDescription">Description</label>
                <textarea id="editBookDescription" rows="4">${book.description || ''}</textarea>
            </div>

            <div class="action-buttons">
                <button type="button" class="btn-secondary" onclick="closeEditModal()">Cancel</button>
                <button type="submit" class="btn-primary">Update Book</button>
            </div>
        `;

        modal.style.display = 'block';

        editForm.onsubmit = async function(e) {
            e.preventDefault();
            await updateBook(bookId);
        };
    } catch (error) {
        console.error('❌ Error editing book:', error);
        showToast('Error loading edit form', 'error');
    }
}

async function updateBook(bookId) {
    showLoading(true);
    try {
        if (!currentUserId) {
            throw new Error('User ID not found. Please login again.');
        }

        const bookData = {
            title: document.getElementById('editBookTitle').value.trim(),
            author: document.getElementById('editBookAuthor').value.trim(),
            description: document.getElementById('editBookDescription').value.trim(),
            language: document.getElementById('editBookLanguage').value.trim(),
            userId: currentUserId,
            categoryId: document.getElementById('editBookCategory').value || null
        };

        if (!bookData.title || !bookData.author || !bookData.language) {
            throw new Error('Please fill in all required fields');
        }

        const response = await authFetch(`${API_BASE_URL}/book/apies/Update/${bookId}`, {
            method: 'PUT',
            body: JSON.stringify(bookData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to update book');
        }

        const result = await response.text();
        showToast('Book updated successfully!', 'success');

        await loadBooksFromAPI();
        closeEditModal();

    } catch (error) {
        console.error('❌ Error updating book:', error);
        showToast('Failed to update book: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function deleteBook(bookId) {
    if (confirm('Are you sure you want to delete this book? This action cannot be undone.')) {
        showLoading(true);
        try {
            const response = await authFetch(`${API_BASE_URL}/book/apies/delete/${bookId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Failed to delete book');
            }

            const result = await response.text();
            showToast('Book deleted successfully!', 'success');

            await loadBooksFromAPI();

        } catch (error) {
            console.error('❌ Error deleting book:', error);
            showToast('Failed to delete book: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
    }
}

function closeModal(modalId) {
    try {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    } catch (error) {
        console.error('❌ Error closing modal:', error);
    }
}

// =============================================
// ✅ REVIEW MANAGEMENT FUNCTIONS
// =============================================

async function loadBookReviewsForModal(bookId) {
    try {
        console.log(`📝 Loading reviews for book ${bookId}...`);

        const response = await authFetch(`${API_BASE_URL}/review/apies/book/${bookId}`);
        const reviewsContent = document.getElementById(`reviewsContent-${bookId}`);

        if (!reviewsContent) return;

        if (response.ok) {
            const reviews = await response.json();
            console.log(`✅ Loaded ${reviews.length} reviews for book ${bookId}`);
            displayReviewsInModal(bookId, reviews);
        } else {
            reviewsContent.innerHTML = `
                <div class="no-reviews">
                    <p>❌ Failed to load reviews. Please try again.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error(`❌ Error loading reviews for book ${bookId}:`, error);
        const reviewsContent = document.getElementById(`reviewsContent-${bookId}`);
        if (reviewsContent) {
            reviewsContent.innerHTML = `
                <div class="no-reviews">
                    <p>❌ Error loading reviews: ${error.message}</p>
                </div>
            `;
        }
    }
}

function displayReviewsInModal(bookId, reviews) {
    try {
        const reviewsContent = document.getElementById(`reviewsContent-${bookId}`);
        if (!reviewsContent) return;

        if (!reviews || reviews.length === 0) {
            reviewsContent.innerHTML = `
                <div class="no-reviews">
                    <p>📭 No reviews yet. Be the first to review this book!</p>
                </div>
            `;
            return;
        }

        const averageRating = calculateAverageRating(reviews);
        const totalReviews = reviews.length;

        let html = `
            <div class="reviews-summary">
                <div class="average-rating">
                    <div class="rating-stars-large">${generateStarRating(averageRating)}</div>
                    <div class="rating-details">
                        <strong>${averageRating.toFixed(1)}</strong> out of 5
                        <span class="review-count">(${totalReviews} ${totalReviews === 1 ? 'review' : 'reviews'})</span>
                    </div>
                </div>
            </div>

            <div class="reviews-list" style="margin-top: 20px;">
                <h4>Recent Reviews</h4>
        `;

        const recentReviews = reviews
            .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
            .slice(0, 5);

        recentReviews.forEach(review => {
            const reviewDate = new Date(review.createdAt || review.date).toLocaleDateString();
            const userName = review.user ? (review.user.name || review.user.username) : 'Anonymous User';

            html += `
                <div class="review-item">
                    <div class="review-header">
                        <div>
                            <strong>${userName}</strong>
                            <div class="review-rating">${generateStarRating(review.rating)}</div>
                        </div>
                        <span class="review-date">${reviewDate}</span>
                    </div>
                    <div class="review-text">
                        ${review.reviewText || review.comment || 'No review text provided.'}
                    </div>
                </div>
            `;
        });

        if (reviews.length > 5) {
            html += `
                <div style="text-align: center; margin-top: 15px;">
                    <small>+ ${reviews.length - 5} more reviews</small>
                </div>
            `;
        }

        html += `</div>`;
        reviewsContent.innerHTML = html;
    } catch (error) {
        console.error('❌ Error displaying reviews:', error);
    }
}

function calculateAverageRating(reviews) {
    if (!reviews || reviews.length === 0) return 0;
    const total = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
    return total / reviews.length;
}

function generateStarRating(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return '⭐'.repeat(fullStars) +
           (hasHalfStar ? '⭐' : '') +
           '☆'.repeat(emptyStars);
}

// =============================================
// ✅ SEARCH & FILTER FUNCTIONS
// =============================================

function searchBooks() {
    try {
        const searchTerm = document.getElementById('bookSearch').value.toLowerCase().trim();
        if (!searchTerm) {
            renderBooksTable();
            return;
        }

        const filteredBooks = books.filter(book =>
            (book.title && book.title.toLowerCase().includes(searchTerm)) ||
            (book.author && book.author.toLowerCase().includes(searchTerm)) ||
            (book.category &&
             ((book.category.categoryName && book.category.categoryName.toLowerCase().includes(searchTerm)) ||
              (typeof book.category === 'string' && book.category.toLowerCase().includes(searchTerm))))
        );

        currentPage = 1;
        renderBooksTable(filteredBooks);

        if (filteredBooks.length === 0) {
            showToast('No books found matching your search', 'warning');
        }
    } catch (error) {
        console.error('❌ Error searching books:', error);
    }
}

function filterBooks() {
    try {
        const status = document.getElementById('statusFilter').value;
        const category = document.getElementById('categoryFilter').value;

        let filteredBooks = books;

        if (status) {
            filteredBooks = filteredBooks.filter(book =>
                book.status && book.status.toLowerCase() === status.toLowerCase()
            );
        }

        if (category) {
            filteredBooks = filteredBooks.filter(book =>
                book.category && book.category.id == category
            );
        }

        currentPage = 1;
        renderBooksTable(filteredBooks);
    } catch (error) {
        console.error('❌ Error filtering books:', error);
    }
}

function filterBooksByCategory(categoryId) {
    try {
        document.querySelectorAll('.category-filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        if (event && event.target) {
            event.target.classList.add('active');
        }

        if (!categoryId) {
            renderBooksTable();
            return;
        }

        const filteredBooks = books.filter(book =>
            book.category && book.category.id == categoryId
        );

        currentPage = 1;
        renderBooksTable(filteredBooks);
    } catch (error) {
        console.error('❌ Error filtering books by category:', error);
    }
}

// =============================================
// ✅ PROFILE MANAGEMENT
// =============================================

function updateProfile() {
    try {
        const name = document.getElementById('publisherNameInput').value.trim();
        const email = document.getElementById('publisherEmail').value.trim();
        const phone = document.getElementById('publisherPhone').value.trim();
        const company = document.getElementById('companyName').value.trim();
        const address = document.getElementById('companyAddress').value.trim();
        const website = document.getElementById('companyWebsite').value.trim();

        if (!name) {
            showToast('Please enter a publisher name', 'error');
            return;
        }

        if (email && !isValidEmail(email)) {
            showToast('Please enter a valid email address', 'error');
            return;
        }

        const publisherNameElem = document.getElementById('publisherName');
        if (publisherNameElem) {
            publisherNameElem.textContent = `Welcome, ${name}`;
        }

        if (currentPublisher) {
            currentPublisher.name = name;
            localStorage.setItem('currentPublisher', JSON.stringify(currentPublisher));
        }

        showToast('Profile updated successfully!', 'success');
    } catch (error) {
        console.error('❌ Error updating profile:', error);
        showToast('Error updating profile', 'error');
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// =============================================
// ✅ PUBLISHER SUGGESTION FUNCTIONS
// =============================================

async function loadPublisherSuggestions() {
    showLoading(true);
    try {
        console.log('📥 Loading LIVE suggestions for publisher...', currentUserId);

        const suggestionTableBody = document.getElementById('suggestionTableBody');
        if (suggestionTableBody) {
            suggestionTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="loading-cell">
                        <div class="loading-spinner"></div>
                        Loading live suggestions from users...
                    </td>
                </tr>
            `;
        }

        const response = await authFetch(`${SUGGESTION_API.GET_BY_PUBLISHER}/${currentUserId}`);

        if (response.ok) {
            const data = await response.json();
            console.log('✅ LIVE Suggestions loaded:', data);

            const suggestions = data.suggestions || data || [];

            displayPublisherSuggestions(suggestions);
            updatePublisherSuggestionStats(suggestions);

            showToast(`Loaded ${suggestions.length} live suggestions`, 'success');
        } else {
            console.error('❌ Failed to load LIVE suggestions:', response.status);

            const suggestionTableBody = document.getElementById('suggestionTableBody');
            if (suggestionTableBody) {
                suggestionTableBody.innerHTML = `
                    <tr>
                        <td colspan="8" class="no-data">
                            <i class='bx bx-error'></i>
                            <p>Suggestions API temporarily unavailable</p>
                            <p>Please try again later</p>
                        </td>
                    </tr>
                `;
            }

            updatePublisherSuggestionStats([]);
        }

    } catch (error) {
        console.error('❌ Error loading LIVE publisher suggestions:', error);
        showNotification('Failed to load live suggestions. Please try again.', 'error');

        const suggestionTableBody = document.getElementById('suggestionTableBody');
        if (suggestionTableBody) {
            suggestionTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="no-data">
                        <i class='bx bx-bulb'></i>
                        <p>Unable to load suggestions</p>
                        <p>Please check your connection and try again</p>
                    </td>
                </tr>
            `;
        }
    } finally {
        showLoading(false);
    }
}

function displayPublisherSuggestions(suggestions) {
    const suggestionTableBody = document.getElementById('suggestionTableBody');
    if (!suggestionTableBody) return;

    if (!suggestions || suggestions.length === 0) {
        suggestionTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="no-data">
                    <i class='bx bx-bulb'></i>
                    <p>No suggestions available</p>
                    <p>User suggestions will appear here</p>
                </td>
            </tr>
        `;
        return;
    }

    suggestionTableBody.innerHTML = suggestions.map(suggestion => `
        <tr>
            <td>
                <div class="book-title">
                    <strong>${suggestion.suggestedTitle || 'Untitled'}</strong>
                    <div style="font-size: 0.8rem; color: #666; margin-top: 4px;">
                        by ${suggestion.author || 'Unknown Author'}
                    </div>
                </div>
            </td>
            <td>
                <div class="user-avatar">
                    <i class='bx bx-user'></i>
                    <span>${suggestion.suggestedByUserName || 'Anonymous User'}</span>
                </div>
            </td>
            <td>
                <div class="suggestion-reason">
                    ${suggestion.suggestionReason || 'No reason provided'}
                </div>
            </td>
            <td>
                <span class="upvote-count">${suggestion.totalUpvotes || 0} 👍</span>
            </td>
            <td>
                <span class="interest-count">${suggestion.totalPublisherInterests || 0} 👁️</span>
            </td>
            <td>
                ${getPublisherActionBadge(suggestion)}
            </td>
            <td>${formatDate(suggestion.suggestionCreatedAt)}</td>
            <td>
                <div class="book-actions">
                    ${!suggestion.publisherAction || suggestion.publisherAction === 'NOT_INTERESTED' ? `
                        <button class="btn-success btn-sm" onclick="expressInterest(${suggestion.suggestionId})" title="Express Interest">
                            <i class='bx bx-show'></i> Interested
                        </button>
                    ` : ''}

                    ${suggestion.publisherAction === 'INTERESTED' ? `
                        <button class="btn-primary btn-sm" onclick="uploadForSuggestion(${suggestion.suggestionId})" title="Upload Book">
                            <i class='bx bx-upload'></i> Upload
                        </button>
                    ` : ''}

                    <button class="btn-info btn-sm" onclick="viewSuggestionDetails(${suggestion.suggestionId})" title="View Details">
                        <i class='bx bx-show'></i> Details
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function getPublisherActionBadge(suggestion) {
    if (!suggestion.publisherAction || suggestion.publisherAction === 'NOT_INTERESTED') {
        return '<span class="status-badge status-pending">Not Viewed</span>';
    }

    switch(suggestion.publisherAction) {
        case 'INTERESTED':
            return '<span class="status-badge status-approved">Interested</span>';
        case 'UPLOADED':
            return '<span class="status-badge status-success">Uploaded</span>';
        default:
            return '<span class="status-badge status-pending">Pending</span>';
    }
}

function updatePublisherSuggestionStats(suggestions) {
    const total = suggestions.length;
    const interested = suggestions.filter(s => s.publisherAction === 'INTERESTED').length;
    const uploaded = suggestions.filter(s => s.publisherAction === 'UPLOADED').length;

    document.getElementById('totalPublisherSuggestions').textContent = total;
    document.getElementById('interestedPublisherSuggestions').textContent = interested;
    document.getElementById('uploadedPublisherSuggestions').textContent = uploaded;
}

async function expressInterest(suggestionId) {
    if (!confirm('Are you interested in publishing this book? The user will be notified.')) {
        return;
    }

    showLoading(true);
    try {
        console.log('🎯 Expressing interest in suggestion:', suggestionId, 'by publisher:', currentUserId);

        const requestData = {
            publisherId: currentUserId,
            suggestionId: suggestionId,
            notes: 'Interested in publishing this book'
        };

        console.log('📤 Sending interest request:', requestData);

        const response = await authFetch(`${SUGGESTION_API.EXPRESS_INTEREST}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Interest expressed successfully:', result);

            showNotification('Interest expressed successfully! User has been notified.', 'success');

            setTimeout(() => {
                loadPublisherSuggestions();
            }, 1000);

        } else {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to express interest');
        }

    } catch (error) {
        console.error('❌ Error expressing interest:', error);
        showNotification('Error expressing interest: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function uploadForSuggestion(suggestionId) {
    try {
        const suggestionContext = {
            suggestionId: suggestionId,
            timestamp: new Date().toISOString(),
            publisherId: currentUserId
        };

        sessionStorage.setItem('uploadForSuggestion', JSON.stringify(suggestionContext));

        showNotification('Redirecting to upload form...', 'info');

        showSection('addBook');

        setTimeout(() => {
            prefillBookFormWithSuggestion(suggestionId);
        }, 500);

    } catch (error) {
        console.error('❌ Error preparing upload for suggestion:', error);
        showNotification('Error preparing upload form', 'error');
    }
}

async function prefillBookFormWithSuggestion(suggestionId) {
    try {
        const response = await authFetch(`${SUGGESTION_API.GET_DETAILS}/${suggestionId}`);

        if (response.ok) {
            const suggestion = await response.json();

            if (suggestion.suggestedTitle) {
                document.getElementById('bookTitle').value = suggestion.suggestedTitle;
            }
            if (suggestion.author) {
                document.getElementById('bookAuthor').value = suggestion.author;
            }
            if (suggestion.suggestionReason) {
                document.getElementById('bookDescription').value = `Based on user suggestion: ${suggestion.suggestionReason}`;
            }

            showToast('Form pre-filled with suggestion details', 'info');
        }
    } catch (error) {
        console.log('Could not pre-fill form, continuing normally...');
    }
}

async function viewSuggestionDetails(suggestionId) {
    showLoading(true);
    try {
        console.log('🔍 Viewing suggestion details:', suggestionId);

        if (!suggestionId || isNaN(suggestionId)) {
            throw new Error('Invalid suggestion ID');
        }

        const response = await authFetch(`${SUGGESTION_API.GET_DETAILS}/${suggestionId}`);

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Suggestion details loaded:', result);

            if (result.success && result.suggestion) {
                showSuggestionDetailsModal(result.suggestion);
            } else {
                throw new Error(result.message || 'Failed to load suggestion details');
            }
        } else {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to load suggestion details');
        }

    } catch (error) {
        console.error('❌ Error loading suggestion details:', error);
        showNotification('Error loading suggestion details: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function showSuggestionDetailsModal(suggestion) {
    const modalHtml = `
        <div class="modal" id="suggestionModal">
            <div class="modal-content large">
                <span class="close" onclick="closeModal('suggestionModal')">&times;</span>
                <h2>Suggestion Details</h2>
                <div class="suggestion-details">
                    <h3>${suggestion.suggestedTitle}</h3>
                    <p><strong>Author:</strong> ${suggestion.author}</p>
                    <p><strong>Suggested by:</strong> ${suggestion.userName}</p>
                    <p><strong>Reason:</strong> ${suggestion.suggestionReason}</p>
                    <p><strong>Upvotes:</strong> ${suggestion.upvoteCount || 0}</p>
                    <p><strong>Publisher Interest:</strong> ${suggestion.publisherInterestCount || 0}</p>
                    <p><strong>Date Suggested:</strong> ${formatDate(suggestion.createdAt)}</p>
                </div>
                <div class="modal-actions">
                    <button class="btn-primary" onclick="expressInterest(${suggestion.id})">Express Interest</button>
                    <button class="btn-secondary" onclick="closeModal('suggestionModal')">Close</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = document.getElementById('suggestionModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function searchPublisherSuggestions() {
    const searchTerm = document.getElementById('suggestionSearch').value.toLowerCase().trim();

    if (!searchTerm) {
        loadPublisherSuggestions();
        return;
    }

    const allRows = document.querySelectorAll('#suggestionTableBody tr');
    let hasResults = false;

    allRows.forEach(row => {
        const titleText = row.cells[0]?.textContent?.toLowerCase() || '';
        const authorText = row.cells[0]?.querySelector('.book-title div')?.textContent?.toLowerCase() || '';
        const userText = row.cells[1]?.textContent?.toLowerCase() || '';
        const reasonText = row.cells[2]?.textContent?.toLowerCase() || '';

        const matches = titleText.includes(searchTerm) ||
                       authorText.includes(searchTerm) ||
                       userText.includes(searchTerm) ||
                       reasonText.includes(searchTerm);

        row.style.display = matches ? '' : 'none';
        if (matches) hasResults = true;
    });

    if (!hasResults) {
        showNotification('No suggestions found matching your search', 'warning');
    }
}

function filterPublisherSuggestions() {
    const filterValue = document.getElementById('suggestionFilter').value;

    const allRows = document.querySelectorAll('#suggestionTableBody tr');

    allRows.forEach(row => {
        if (row.classList.contains('loading-cell') || row.classList.contains('no-data')) {
            return;
        }

        const actionBadge = row.cells[5]?.querySelector('.status-badge')?.textContent?.toLowerCase() || '';

        let shouldShow = true;

        switch(filterValue) {
            case 'interested':
                shouldShow = actionBadge.includes('interested');
                break;
            case 'uploaded':
                shouldShow = actionBadge.includes('uploaded');
                break;
            case 'trending':
                const upvotes = parseInt(row.cells[3]?.textContent) || 0;
                shouldShow = upvotes > 20;
                break;
            case 'all':
            default:
                shouldShow = true;
        }

        row.style.display = shouldShow ? '' : 'none';
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

// =============================================
// ✅ AUTO-REFRESH & REAL-TIME UPDATES
// =============================================

function startSuggestionsAutoRefresh() {
    if (suggestionsRefreshInterval) {
        clearInterval(suggestionsRefreshInterval);
    }

    suggestionsRefreshInterval = setInterval(() => {
        if (isSuggestionsSectionActive()) {
            console.log('🔄 Auto-refreshing suggestions...');
            loadPublisherSuggestions();
        }
    }, 2 * 60 * 1000);

    console.log('✅ Suggestions auto-refresh started');
}

function isSuggestionsSectionActive() {
    const suggestionsSection = document.getElementById('suggestions');
    return suggestionsSection && suggestionsSection.classList.contains('active');
}

function stopSuggestionsAutoRefresh() {
    if (suggestionsRefreshInterval) {
        clearInterval(suggestionsRefreshInterval);
        suggestionsRefreshInterval = null;
        console.log('✅ Suggestions auto-refresh stopped');
    }
}

function refreshSuggestions() {
    showLoading(true);
    loadPublisherSuggestions()
        .finally(() => {
            setTimeout(() => showLoading(false), 500);
        });
}

// =============================================
// ✅ PAGE INITIALIZATION
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded - initializing dashboard...');

    try {
        if (!initializeUserFromURL()) {
            if (!initializeUser()) {
                return;
            }
        }

        initializeDashboard();
        setupEventListeners();
        loadPublisherData();
        loadCategories();
        loadBooksFromAPI();

        startSuggestionsAutoRefresh();

        const favicon = document.querySelector('link[rel="icon"]');
        if (!favicon) {
            const newFavicon = document.createElement('link');
            newFavicon.rel = 'icon';
            newFavicon.href = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📚</text></svg>';
            document.head.appendChild(newFavicon);
        }

        console.log('✅ Application initialized successfully with LIVE data');
    } catch (error) {
        console.error('❌ Error initializing application:', error);
        showToast('Error initializing application', 'error');
    }
});

window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    showToast('An unexpected error occurred', 'error');
});

window.addEventListener('beforeunload', function() {
    showLoading(false);
    stopSuggestionsAutoRefresh();
});