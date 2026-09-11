let allBooks = [];
let allCategories = [];
let activeCategory = 'all';

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('year').textContent = new Date().getFullYear();
    initializePage();
    setupEventListeners();
});

function initializePage() {
    showLoading(true);
    loadCategories();
    loadBooks();
}

async function loadCategories() {
    try {
        const response = await fetch(`${window.location.origin}/api/v1/category/findAll`);
        allCategories = response.ok ? await response.json() : [];
    } catch (error) {
        allCategories = [];
    }
    renderTags();
}

function renderTags() {
    const tagsContainer = document.getElementById('tags');
    tagsContainer.innerHTML = `<div class="tag highlight" data-category="all" onclick="filterByCategory('all')">All Books</div>`;
    allCategories.forEach(cat => {
        tagsContainer.innerHTML += `<div class="tag" data-category="${cat.id}" onclick="filterByCategory('${cat.id}')">${escapeHtml(cat.categoryName)}</div>`;
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

async function loadBooks() {
    try {
        const response = await fetch(`${window.location.origin}/api/v1/book/public/all`);
        allBooks = response.ok ? await response.json() : [];
    } catch (error) {
        allBooks = [];
    }
    renderBooks(allBooks);
    showLoading(false);
}

function renderBooks(books) {
    const main = document.getElementById('main');
    if (!books || books.length === 0) {
        main.innerHTML = `<div class="no-results"><h3>No books found</h3><p>Please check back later.</p></div>`;
        document.getElementById('pagination').innerHTML = '';
        return;
    }
    main.innerHTML = books.map(book => `
        <div class="book" onclick="window.location.href='/login'">
            <img src="${escapeHtml(book.coverImagePath)}" alt="${escapeHtml(book.title)}">
            <div class="book-info">
                <h3>${escapeHtml(book.title)}</h3>
                <p>${escapeHtml(book.author)}</p>
                <span>${escapeHtml(book.categoryName || '')}</span>
            </div>
            <div class="book-tooltip">
                <h4>${escapeHtml(book.title)}</h4>
                <p>${escapeHtml((book.description || '').substring(0, 100))}...</p>
            </div>
        </div>
    `).join('');
}

function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(value);
    return div.innerHTML;
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

function setupEventListeners() {
    const headerSearchForm = document.getElementById('headerSearchForm');
    const headerSearchInput = document.getElementById('header-search');
    headerSearchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = headerSearchInput.value.trim().toLowerCase();
        const filtered = query
            ? allBooks.filter(b => b.title.toLowerCase().includes(query) || b.author.toLowerCase().includes(query))
            : allBooks;
        renderBooks(filtered);
    });
}