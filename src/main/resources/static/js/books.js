document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('year').textContent = new Date().getFullYear();
    initializePage();
    setupEventListeners();
});

function initializePage() {
    showLoading(false);
    renderCategoryPlaceholder();
    renderBooksUnavailable();
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
        renderBooksUnavailable();
        headerSearchInput.value = '';
    });
}