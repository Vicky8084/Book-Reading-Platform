let currentUser = null;
let allBooks = [];
let allCategories = [];
let activeCategory = 'all';
let currentSlideIndex = 0;
const slidesPerView = 5;

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
        loadCategories();
        loadBooks();
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

/* ===================== CATEGORIES ===================== */

async function loadCategories() {
    try {
        const response = await fetch(`${window.location.origin}/api/v1/category/findAll`, {
            credentials: 'include'
        });
        allCategories = response.ok ? await response.json() : [];
    } catch (error) {
        console.error('Error loading categories:', error);
        allCategories = [];
    }
    renderTags();
}

function renderTags() {
    const tagsContainer = document.getElementById('tags');
    if (!tagsContainer) return;

    tagsContainer.innerHTML = `<div class="tag highlight" data-category="all">All Books</div>`;

    allCategories.forEach(cat => {
        const tag = document.createElement('div');
        tag.className = 'tag';
        tag.dataset.category = String(cat.id);
        tag.textContent = cat.categoryName;
        tagsContainer.appendChild(tag);
    });

    tagsContainer.querySelectorAll('.tag').forEach(tag => {
        tag.addEventListener('click', () => filterByCategory(tag.dataset.category));
    });
}

function filterByCategory(categoryId) {
    activeCategory = String(categoryId);

    document.querySelectorAll('.tag').forEach(tag => {
        tag.classList.toggle('highlight', tag.dataset.category === activeCategory);
    });

    const filtered = activeCategory === 'all'
        ? allBooks
        : allBooks.filter(b => String(b.categoryId) === activeCategory);

    renderBooks(filtered);
}

/* ===================== BOOKS (MAIN GRID) ===================== */

async function loadBooks() {
    showLoading(true);
    try {
        const response = await fetch(`${window.location.origin}/api/v1/book/public/all`, {
            credentials: 'include'
        });
        allBooks = response.ok ? await response.json() : [];
    } catch (error) {
        console.error('Error loading books:', error);
        allBooks = [];
    }

    renderBooks(allBooks);
    renderRecommended(allBooks);
    showLoading(false);
    openBookFromQueryParam();
}

function renderBooks(books) {
    const main = document.getElementById('main');
    const pagination = document.getElementById('pagination');
    if (!main) return;

    if (!books || books.length === 0) {
        main.innerHTML = `
            <div class="no-results">
                <h3>No books found</h3>
                <p>Please check back later for new additions!</p>
            </div>
        `;
        if (pagination) pagination.innerHTML = '';
        return;
    }

    main.innerHTML = books.map(book => `
        <div class="book" data-book-id="${book.id}">
            <img src="${escapeHtml(book.coverImagePath)}" alt="${escapeHtml(book.title)}">
            <div class="book-info">
                <h3>${escapeHtml(book.title)}</h3>
                <p>${escapeHtml(book.author)}</p>
                <span>${escapeHtml(book.categoryName || '')}</span>
            </div>
            <div class="book-tooltip">
                <h4>${escapeHtml(book.title)}</h4>
                <p>${escapeHtml(truncate(book.description, 100))}</p>
            </div>
        </div>
    `).join('');

    main.querySelectorAll('.book').forEach(card => {
        card.addEventListener('click', () => {
            const book = allBooks.find(b => b.id == card.dataset.bookId);
            if (book) showBookModal(book);
        });
    });

    if (pagination) pagination.innerHTML = '';
}

/* ===================== RECOMMENDED SLIDER ===================== */

function renderRecommended(books) {
    const slider = document.getElementById('recommendedSlider');
    const dotsContainer = document.getElementById('dotsContainer');
    if (!slider) return;

    if (!books || books.length === 0) {
        slider.innerHTML = `
            <div style="text-align: center; padding: 40px; width: 100%; color: #666;">
                <p style="font-size: 1.1rem;">No books available yet. Check back later for new additions!</p>
            </div>
        `;
        if (dotsContainer) dotsContainer.innerHTML = '';
        return;
    }

    const recommended = books.slice(0, 10);

    slider.innerHTML = recommended.map(book => `
        <div class="book-card" data-book-id="${book.id}">
            <img class="book-cover" src="${escapeHtml(book.coverImagePath)}" alt="${escapeHtml(book.title)}">
            <div class="book-info">
                <h3>${escapeHtml(book.title)}</h3>
                <p class="author">${escapeHtml(book.author)}</p>
                <p class="description">${escapeHtml(truncate(book.description, 80))}</p>
            </div>
        </div>
    `).join('');

    slider.querySelectorAll('.book-card').forEach(card => {
        card.addEventListener('click', () => {
            const book = allBooks.find(b => b.id == card.dataset.bookId);
            if (book) showBookModal(book);
        });
    });

    renderDots(recommended.length);
}

function renderDots(totalItems) {
    const dotsContainer = document.getElementById('dotsContainer');
    if (!dotsContainer) return;

    const totalDots = Math.max(1, Math.ceil(totalItems / slidesPerView));
    currentSlideIndex = 0;

    dotsContainer.innerHTML = '';
    for (let i = 0; i < totalDots; i++) {
        const dot = document.createElement('div');
        dot.className = 'dot' + (i === 0 ? ' active' : '');
        dot.addEventListener('click', () => goToSlide(i));
        dotsContainer.appendChild(dot);
    }
}

function goToSlide(index) {
    const slider = document.getElementById('recommendedSlider');
    const dots = document.querySelectorAll('.dot');
    if (!slider || dots.length === 0) return;

    currentSlideIndex = Math.max(0, Math.min(index, dots.length - 1));

    const card = slider.querySelector('.book-card');
    const cardWidth = card ? card.offsetWidth + 25 : 225;
    slider.scrollTo({ left: currentSlideIndex * cardWidth * slidesPerView, behavior: 'smooth' });

    dots.forEach((dot, i) => dot.classList.toggle('active', i === currentSlideIndex));
}

function slideDirection(direction) {
    const dots = document.querySelectorAll('.dot');
    if (dots.length === 0) return;
    const next = currentSlideIndex + direction;
    goToSlide(((next % dots.length) + dots.length) % dots.length);
}

/* ===================== BOOK DETAILS MODAL ===================== */

function showBookModal(book) {
    const modal = document.getElementById('bookModal');
    const modalBody = document.getElementById('modalBody');
    if (!modal || !modalBody) return;

    modalBody.innerHTML = `
        <img class="modal-cover" src="${escapeHtml(book.coverImagePath)}" alt="${escapeHtml(book.title)}">
        <div class="modal-info">
            <h2>${escapeHtml(book.title)}</h2>
            <h4>by ${escapeHtml(book.author)}</h4>
            <p>${escapeHtml(book.description || '')}</p>
            <p><strong>Language:</strong> ${escapeHtml(book.language || '-')}</p>
            <p><strong>Category:</strong> ${escapeHtml(book.categoryName || '-')}</p>
            <p><strong>Publisher:</strong> ${escapeHtml(book.publisherName || '-')}</p>
            <a href="/read/${book.id}" class="read-more">
                <i class='bx bx-book-open'></i> Read Now
            </a>
        </div>
    `;

    modal.classList.add('active');

    const url = new URL(window.location);
    url.searchParams.set('bookId', book.id);
    window.history.replaceState({}, '', url);
}

function closeBookModal() {
    const modal = document.getElementById('bookModal');
    if (modal) modal.classList.remove('active');

    const url = new URL(window.location);
    url.searchParams.delete('bookId');
    window.history.replaceState({}, '', url);
}

function openBookFromQueryParam() {
    const params = new URLSearchParams(window.location.search);
    const bookId = params.get('bookId');
    if (!bookId) return;

    const book = allBooks.find(b => b.id == bookId);
    if (book) {
        showBookModal(book);
    } else {
        showNotification('Requested book was not found', 'error');
    }
}

/* ===================== SEARCH ===================== */

function searchBooks(query) {
    const term = (query || '').trim().toLowerCase();
    const base = activeCategory === 'all'
        ? allBooks
        : allBooks.filter(b => String(b.categoryId) === activeCategory);

    const filtered = term
        ? base.filter(b =>
            (b.title || '').toLowerCase().includes(term) ||
            (b.author || '').toLowerCase().includes(term))
        : base;

    renderBooks(filtered);
}

/* ===================== HELPERS ===================== */

function truncate(text, length) {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
}

function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(value);
    return div.innerHTML;
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

/* ===================== EVENT LISTENERS ===================== */

function setupEventListeners() {
    const headerSearchForm = document.getElementById('headerSearchForm');
    const headerSearchInput = document.getElementById('header-search');

    if (headerSearchForm && headerSearchInput) {
        headerSearchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            searchBooks(headerSearchInput.value);
        });
    }

    const slideLeft = document.getElementById('slideLeft');
    const slideRight = document.getElementById('slideRight');
    if (slideLeft) slideLeft.addEventListener('click', () => slideDirection(-1));
    if (slideRight) slideRight.addEventListener('click', () => slideDirection(1));

    const closeModalBtn = document.getElementById('closeModal');
    const bookModal = document.getElementById('bookModal');
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeBookModal);
    if (bookModal) {
        bookModal.addEventListener('click', (e) => {
            if (e.target === bookModal) closeBookModal();
        });
    }

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