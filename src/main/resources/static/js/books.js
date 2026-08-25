const API_BASE_URL = 'http://localhost:8081';
let allBooks = [];
let filteredBooks = [];
let categories = [];
let currentPage = 1;
const booksPerPage = 15;
let currentCategory = 'all';
let currentSearchQuery = '';

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('year').textContent = new Date().getFullYear();
    initializePage();
    setupEventListeners();
});

async function initializePage() {
    showLoading(true);
    try {
        await loadCategories();
        await loadBooks();
        setupCategoryFilters();
    } catch (error) {
        console.error('Error initializing page:', error);
        showError('Failed to load books. Please try again later.');
    } finally {
        showLoading(false);
    }
}

async function loadBooks() {
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
        console.error('Error loading books:', error);
        showError('Failed to load books from server.');
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
        console.error('Error loading categories:', error);
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
        console.error('Error filtering by category:', error);
        showError('Failed to load category books. Showing all books instead.');
        await loadBooks();
    } finally {
        showLoading(false);
    }
}

async function searchBooks(query) {
    currentSearchQuery = query;
    currentPage = 1;
    if (!query.trim()) {
        await loadBooks();
        return;
    }
    showLoading(true);
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
        console.error('Error searching books:', error);
        filteredBooks = allBooks.filter(book =>
            book.title.toLowerCase().includes(query.toLowerCase()) ||
            book.author.toLowerCase().includes(query.toLowerCase()) ||
            (book.category && book.category.categoryName.toLowerCase().includes(query.toLowerCase()))
        );
        renderBooks();
        updatePagination();
    } finally {
        showLoading(false);
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
            <div class="book" onclick="redirectToBookDetails(${book.id})">
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

function redirectToBookDetails(bookId) {
    let url = `/book-details?bookId=${bookId}`;
    window.location.href = url;
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
        if (currentPage > 1) {
            currentPage--;
            renderBooks();
            updatePagination();
        }
    });
    document.getElementById('next').addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderBooks();
            updatePagination();
        }
    });
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
    const main = document.getElementById('main');
    if (spinner) {
        spinner.style.display = show ? 'block' : 'none';
    }
    if (main) {
        main.style.display = show ? 'none' : 'grid';
    }
}

function showError(message) {
    const main = document.getElementById('main');
    main.innerHTML = `
        <div class="no-results">
            <h3>❌ Error</h3>
            <p>${message}</p>
            <button onclick="initializePage()" class="read-more" style="margin-top: 15px;">
                Try Again
            </button>
        </div>
    `;
}

function setupEventListeners() {
    const headerSearchForm = document.getElementById('headerSearchForm');
    const headerSearchInput = document.getElementById('header-search');
    headerSearchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        searchBooks(headerSearchInput.value);
    });
}