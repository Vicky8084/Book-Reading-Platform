const API_BASE_URL = window.location.origin;
let allBooks = [];
let filteredBooks = [];
let categories = [];
let currentPage = 1;
const booksPerPage = 15;
let currentCategory = 'all';
let currentSearchQuery = '';
let currentUser = null;
let currentSlide = 0;
let isLoading = false;
let recommendedSliderScrollTimeout = null;

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('year').textContent = new Date().getFullYear();
    initializePage();
    setupEventListeners();
});

async function initializePage() {
    showLoading(true);
    try {
        const user = await getCurrentUser();
        if (!user) {
            showNotification('Please login for full functionality', 'info');
        }

        await loadCategories();
        await loadBooks();
        setupCategoryFilters();
        initializeSlider();

    } catch (error) {
        showError('Failed to load books. Please try again later.');
    } finally {
        showLoading(false);
    }
}

async function getCurrentUser() {
    try {
        const userData = localStorage.getItem('user');
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        const currentUserId = localStorage.getItem('currentUserId');

        if (isLoggedIn !== 'true') {
            return null;
        }

        if (userData) {
            const user = JSON.parse(userData);
            let userId = user.id;

            if (!userId && currentUserId) {
                userId = parseInt(currentUserId);
                user.id = userId;
                localStorage.setItem('user', JSON.stringify(user));
            }

            if (!userId) {
                const urlParams = new URLSearchParams(window.location.search);
                const urlUserId = urlParams.get('userId');
                if (urlUserId) {
                    userId = parseInt(urlUserId);
                    user.id = userId;
                    localStorage.setItem('currentUserId', userId.toString());
                    localStorage.setItem('user', JSON.stringify(user));
                }
            }

            if (!userId) {
                const userFromServer = await fetchCurrentUserFromServer();
                if (userFromServer) {
                    currentUser = userFromServer;
                    localStorage.setItem('user', JSON.stringify(userFromServer));
                    localStorage.setItem('currentUserId', userFromServer.id.toString());

                    const usernameElement = document.getElementById('username');
                    if (usernameElement) {
                        usernameElement.textContent = userFromServer.name || userFromServer.email || userFromServer.username || 'User';
                    }
                    return userFromServer;
                }
            }

            const usernameElement = document.getElementById('username');
            if (usernameElement) {
                usernameElement.textContent = user.name || user.email || user.username || 'User';
            }

            currentUser = user;
            return user;
        }

        return null;
    } catch (error) {
        return null;
    }
}

async function fetchCurrentUserFromServer() {
    try {
        const response = await fetch(`${API_BASE_URL}/user/apies/current`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include'
        });

        if (response.ok) {
            const userData = await response.json();
            return userData;
        } else {
            return null;
        }
    } catch (error) {
        return null;
    }
}

async function loadBooks() {
    if (isLoading) return;
    isLoading = true;

    try {
        const response = await fetch(`${API_BASE_URL}/book/apies/published`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const booksData = await response.json();

        allBooks = booksData.map(book => ({
            id: book.id,
            title: book.title,
            author: book.author,
            description: book.description,
            language: book.language,
            coverImagePath: book.coverImagePath,
            status: book.status,
            uploadedAt: book.uploadedAt,
            category: book.category ? {
                id: book.category.id,
                categoryName: book.category.categoryName
            } : null
        }));

        filteredBooks = [...allBooks];
        renderBooks();
        updatePagination();

    } catch (error) {
        showError('Failed to load books from server.');
    } finally {
        isLoading = false;
    }
}

async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/category/apies/findAll`);

        if (response.ok) {
            const categoriesData = await response.json();
            categories = categoriesData.map(cat => ({
                id: cat.id,
                categoryName: cat.categoryName,
                description: cat.description
            }));
        } else {
            categories = [
                { id: 1, categoryName: "FICTION" },
                { id: 2, categoryName: "NON_FICTION" },
                { id: 3, categoryName: "SCIENCE_FICTION" },
                { id: 4, categoryName: "MYSTERY" },
                { id: 5, categoryName: "BIOGRAPHY" }
            ];
        }
    } catch (error) {
        categories = [
            { id: 1, categoryName: "FICTION" },
            { id: 2, categoryName: "NON_FICTION" },
            { id: 3, categoryName: "SCIENCE_FICTION" },
            { id: 4, categoryName: "MYSTERY" },
            { id: 5, categoryName: "BIOGRAPHY" }
        ];
    }
}

function setupCategoryFilters() {
    const tagsContainer = document.getElementById('tags');
    const allBooksTag = tagsContainer.querySelector('[data-category="all"]');
    tagsContainer.innerHTML = '';
    tagsContainer.appendChild(allBooksTag);

    categories.forEach(category => {
        const tag = document.createElement('div');
        tag.classList.add('tag');
        tag.textContent = category.categoryName;
        tag.dataset.category = category.id;
        tag.addEventListener('click', () => filterByCategory(category.id));
        tagsContainer.appendChild(tag);
    });

    allBooksTag.addEventListener('click', () => filterByCategory('all'));
}

async function filterByCategory(categoryId) {
    if (isLoading) return;

    currentCategory = categoryId;
    currentPage = 1;

    document.querySelectorAll('.tag').forEach(tag => {
        tag.classList.remove('highlight');
    });

    const activeTag = document.querySelector(`[data-category="${categoryId}"]`);
    if (activeTag) {
        activeTag.classList.add('highlight');
    }

    showLoading(true);
    isLoading = true;

    try {
        if (categoryId === 'all') {
            await loadBooks();
        } else {
            const response = await fetch(`${API_BASE_URL}/book/apies/published/category/${categoryId}`);

            if (response.ok) {
                const categoryBooks = await response.json();
                filteredBooks = categoryBooks.map(book => ({
                    id: book.id,
                    title: book.title,
                    author: book.author,
                    description: book.description,
                    language: book.language,
                    coverImagePath: book.coverImagePath,
                    status: book.status,
                    uploadedAt: book.uploadedAt,
                    category: book.category ? {
                        id: book.category.id,
                        categoryName: book.category.categoryName
                    } : null
                }));

                renderBooks();
                updatePagination();
            } else {
                throw new Error('Failed to load category books');
            }
        }
    } catch (error) {
        showError('Failed to load category books. Showing all books instead.');
        await loadBooks();
    } finally {
        showLoading(false);
        isLoading = false;
    }
}

async function searchBooks(query) {
    if (isLoading) return;

    currentSearchQuery = query;
    currentPage = 1;

    if (!query.trim()) {
        await loadBooks();
        return;
    }

    showLoading(true);
    isLoading = true;

    try {
        const response = await fetch(`${API_BASE_URL}/book/apies/published/search?query=${encodeURIComponent(query)}`);

        if (response.ok) {
            const searchResults = await response.json();
            filteredBooks = searchResults;
            renderBooks();
            updatePagination();
        } else {
            throw new Error('Search failed');
        }
    } catch (error) {
        filteredBooks = allBooks.filter(book =>
            book.title.toLowerCase().includes(query.toLowerCase()) ||
            book.author.toLowerCase().includes(query.toLowerCase()) ||
            (book.category && book.category.categoryName.toLowerCase().includes(query.toLowerCase()))
        );
        renderBooks();
        updatePagination();
    } finally {
        showLoading(false);
        isLoading = false;
    }
}

function renderBooks() {
    const main = document.getElementById('main');

    if (!filteredBooks || filteredBooks.length === 0) {
        main.innerHTML = `
            <div class="no-results">
                <h3>No books found</h3>
                <p>Try adjusting your search or filter criteria</p>
            </div>
        `;
        return;
    }

    const startIndex = (currentPage - 1) * booksPerPage;
    const endIndex = startIndex + booksPerPage;
    const booksToShow = filteredBooks.slice(startIndex, endIndex);

    let html = '';

    booksToShow.forEach(book => {
        const coverUrl = book.coverImagePath ?
            `${API_BASE_URL}/uploads/${book.coverImagePath}` :
            generatePlaceholderSvg(book.title);

        const categoryName = book.category ?
            book.category.categoryName : 'Uncategorized';

        html += `
            <div class="book" onclick="openBookDetails(${book.id})">
                <img src="${coverUrl}" alt="${book.title}"
                     onerror="this.src='${generatePlaceholderSvg(book.title)}'">
                <div class="book-info">
                    <h3>${book.title}</h3>
                    <p>${book.author}</p>
                    <span>${categoryName}</span>
                </div>
                <div class="book-tooltip">
                    <h4>${book.title}</h4>
                    <p><strong>Author:</strong> ${book.author}</p>
                    <p><strong>Category:</strong> ${categoryName}</p>
                    <p><strong>Language:</strong> ${book.language || 'English'}</p>
                    ${book.description ? `<p>${book.description.substring(0, 100)}...</p>` : ''}
                </div>
            </div>
        `;
    });

    main.innerHTML = html;
}

function openBookDetails(bookId) {
    const user = currentUser;

    if (!user) {
        showNotification('Please login to view book details', 'info');
        localStorage.setItem('redirectAfterLogin', `/book-details?bookId=${bookId}`);
        setTimeout(() => {
            window.location.href = '/login';
        }, 2000);
        return;
    }

    window.location.href = `/book-details?bookId=${bookId}`;
}

async function addToReadingList(bookId) {
    if (isLoading) return;
    isLoading = true;

    try {
        const user = currentUser;
        if (!user || !user.id) {
            showNotification('Please login to add books to reading list', 'error');
            window.location.href = '/login';
            isLoading = false;
            return;
        }

        const response = await fetch(`${API_BASE_URL}/reading/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: user.id,
                bookId: bookId
            })
        });

        const result = await response.json();

        if (response.ok) {
            showNotification('Book added to reading list!', 'success');
        } else {
            showNotification(result.error || 'Failed to add to reading list', 'error');
        }
    } catch (error) {
        showNotification('Error adding to reading list', 'error');
    } finally {
        isLoading = false;
    }
}

function openBookReader(bookId) {
    const readerUrl = `/book-reader?bookId=${bookId}`;
    window.open(readerUrl, '_blank', 'width=1400,height=800,resizable=yes,scrollbars=yes');
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

function updatePagination() {
    const pagination = document.getElementById('pagination');
    const totalPages = Math.ceil(filteredBooks.length / booksPerPage);

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let html = `
        <button id="prev" ${currentPage === 1 ? 'disabled' : ''}>⬅ Prev</button>
        <span>Page ${currentPage} of ${totalPages}</span>
        <button id="next" ${currentPage === totalPages ? 'disabled' : ''}>Next ➡</button>
    `;

    pagination.innerHTML = html;

    document.getElementById('prev').addEventListener('click', () => {
        if (currentPage > 1 && !isLoading) {
            currentPage--;
            renderBooks();
            updatePagination();
        }
    });

    document.getElementById('next').addEventListener('click', () => {
        if (currentPage < totalPages && !isLoading) {
            currentPage++;
            renderBooks();
            updatePagination();
        }
    });
}

function initializeSlider() {
    const slider = document.getElementById('recommendedSlider');

    if (allBooks.length === 0) {
        slider.innerHTML = `
            <div style="text-align: center; padding: 40px; width: 100%; color: #666;">
                <p style="font-size: 1.1rem;">
                    No books available yet. Check back later for new additions!
                </p>
            </div>
        `;
        document.getElementById('dotsContainer').innerHTML = '';
        return;
    }

    slider.innerHTML = allBooks.map(book => {
        const coverUrl = book.coverImagePath ?
            `${API_BASE_URL}/uploads/${book.coverImagePath}` :
            generatePlaceholderSvg(book.title);

        return `
            <div class="book-card" onclick="openBookDetails(${book.id})">
                <img src="${coverUrl}" alt="${book.title}" class="book-cover"
                     onerror="this.src='${generatePlaceholderSvg(book.title)}'">
                <div class="book-info">
                    <h3>${book.title}</h3>
                    <p class="author">by ${book.author}</p>
                    <p class="description">${book.description ? book.description.substring(0, 100) + '...' : 'A wonderful book worth reading.'}</p>
                </div>
            </div>
        `;
    }).join('');

    updateDots();

    // Setup scroll event listener for recommended slider
    setupRecommendedSliderScrollListener();
}

function updateDots() {
    const dotsContainer = document.getElementById('dotsContainer');
    const booksPerSlide = 4;
    const totalSlides = Math.ceil(allBooks.length / booksPerSlide);

    dotsContainer.innerHTML = Array.from({length: totalSlides}, (_, i) => `
        <div class="dot ${i === currentSlide ? 'active' : ''}"
             onclick="goToSlide(${i})"></div>
    `).join('');
}

function goToSlide(slideIndex) {
    if (isLoading) return;

    const slider = document.getElementById('recommendedSlider');
    const slideWidth = 225;
    currentSlide = slideIndex;

    slider.scrollTo({
        left: slideIndex * slideWidth * 4,
        behavior: 'smooth'
    });

    updateDots();
}

// NEW FUNCTION: Setup scroll event listener for recommended slider
function setupRecommendedSliderScrollListener() {
    const slider = document.getElementById('recommendedSlider');

    // Clear any existing listener
    slider.removeEventListener('scroll', handleRecommendedSliderScroll);

    // Add new listener
    slider.addEventListener('scroll', handleRecommendedSliderScroll);

    console.log('Recommended slider scroll event listener setup complete');
}

// NEW FUNCTION: Handle recommended slider scroll (touchpad/mouse wheel)
function handleRecommendedSliderScroll() {
    // Debounce the scroll event
    if (recommendedSliderScrollTimeout) {
        clearTimeout(recommendedSliderScrollTimeout);
    }

    recommendedSliderScrollTimeout = setTimeout(() => {
        updateActiveSlideFromRecommendedScroll();
    }, 100); // 100ms delay to detect scroll end
}

// NEW FUNCTION: Update active slide from scroll position for recommended slider
function updateActiveSlideFromRecommendedScroll() {
    const slider = document.getElementById('recommendedSlider');
    const slideWidth = 225; // card width + gap
    const booksPerSlide = 4;
    const currentScroll = slider.scrollLeft;

    // Calculate which slide we're currently on
    const newSlide = Math.round(currentScroll / (slideWidth * booksPerSlide));
    const totalSlides = Math.ceil(allBooks.length / booksPerSlide);

    // Only update if slide changed and within bounds
    if (newSlide !== currentSlide && newSlide >= 0 && newSlide < totalSlides) {
        currentSlide = newSlide;
        updateDots();
        console.log('Recommended slider slide updated from scroll:', currentSlide);
    }
}

function generatePlaceholderSvg(title) {
    const initials = title ? title.charAt(0).toUpperCase() : 'B';
    const svg = `
        <svg width="280" height="320" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#667eea"/>
            <text x="50%" y="50%" font-family="Arial" font-size="48" fill="white"
                  text-anchor="middle" dy=".3em">${initials}</text>
        </svg>
    `;
    return 'data:image/svg+xml;base64,' + btoa(svg);
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

function showError(message) {
    const main = document.getElementById('main');
    main.innerHTML = `
        <div class="no-results">
            <h3>Error</h3>
            <p>${message}</p>
            <button onclick="initializePage()" class="action-btn" style="margin-top: 15px;">
                Try Again
            </button>
        </div>
    `;
}

function navigateToDashboard() {
    const user = currentUser;
    const isLoggedIn = localStorage.getItem('isLoggedIn');

    if (user && isLoggedIn === 'true') {
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
            const query = headerSearchInput.value.trim();
            if (query && !isLoading) {
                searchBooks(query);
            }
        });
    }

    const slideLeft = document.getElementById('slideLeft');
    const slideRight = document.getElementById('slideRight');

    if (slideLeft) {
        slideLeft.addEventListener('click', () => {
            if (currentSlide > 0 && !isLoading) {
                goToSlide(currentSlide - 1);
            }
        });
    }

    if (slideRight) {
        slideRight.addEventListener('click', () => {
            const booksPerSlide = 4;
            const totalSlides = Math.ceil(allBooks.length / booksPerSlide);
            if (currentSlide < totalSlides - 1 && !isLoading) {
                goToSlide(currentSlide + 1);
            }
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

    // Auto-logout on 401 unauthorized
    document.addEventListener('unauthorized', function() {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('user');
        localStorage.removeItem('currentUserId');
        localStorage.removeItem('jwtToken');
        window.location.href = '/login';
    });
}

function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('redirectAfterLogin');

    showNotification('Logged out successfully', 'info');

    setTimeout(() => {
        window.location.href = '/login';
    }, 1000);
}

// Add dashboard link override
setTimeout(() => {
    const dashboardLinks = document.querySelectorAll('a[href*="Dashboard"]');
    dashboardLinks.forEach(link => {
        link.removeAttribute('href');
        link.setAttribute('onclick', 'navigateToDashboard(); return false;');
    });
}, 1000);