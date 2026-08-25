const API_BASE_URL = window.location.origin;
    let currentUser = null;
    let currentPage = 'dashboard';
    let userBooks = [];
    let userReviews = [];
    let userSuggestions = [];
    let allSuggestions = [];
    let currentUserSuggestionsPage = 1;
    let currentAllSuggestionsPage = 1;
    const SUGGESTIONS_PER_PAGE = 3;

    document.addEventListener('DOMContentLoaded', function() {
        document.getElementById('year').textContent = new Date().getFullYear();
        initializePage();
    });

    async function initializePage() {
        showLoading(true);

        try {
            await new Promise(resolve => setTimeout(resolve, 100));

            const user = await getCurrentUser();
            if (!user) {
                window.location.href = '/login';
                return;
            }
            updateDashboard(user);
            setupEventListeners();
            await loadUserData();
            await loadPageData(currentPage);

        } catch (error) {
            showError('Failed to load dashboard. Please try again.');
        } finally {
            showLoading(false);
        }
    }
    async function getCurrentUser() {
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

    async function loadUserData() {
        try {
            if (!currentUser || !currentUser.id) {
                return;
            }

            await loadUserBooks();
            await loadUserReviews();
            await loadUserSuggestions();
            await loadAllSuggestions();

        } catch (error) {
        }
    }

    async function loadUserBooks() {
        try {
            if (!currentUser || !currentUser.id) {
                return;
            }

            const response = await fetch(`${API_BASE_URL}/book/apies/user/${currentUser.id}`);

            if (response.ok) {
                userBooks = await response.json();
            } else {
                userBooks = [];
            }
        } catch (error) {
            userBooks = [];
        }
    }

    async function loadUserReviews() {
        try {
            if (!currentUser || !currentUser.id) {
                return;
            }

            const response = await fetch(`${API_BASE_URL}/review/apies/user/${currentUser.id}`);

            if (response.ok) {
                userReviews = await response.json();
            } else {
                userReviews = [];
            }
        } catch (error) {
            userReviews = [];
        }
    }

    async function loadUserSuggestions() {
        try {
            if (!currentUser || !currentUser.id) {
                userSuggestions = [];
                return;
            }

            const response = await fetch(`${API_BASE_URL}/suggestion/apis/user/${currentUser.id}`);

            if (response.ok) {
                userSuggestions = await response.json();
            } else {
                await loadAllSuggestionsAndFilter();
            }
        } catch (error) {
            await loadAllSuggestionsAndFilter();
        }
    }

    async function loadAllSuggestionsAndFilter() {
        try {
            const response = await fetch(`${API_BASE_URL}/suggestion/apis/findAll`);

            if (response.ok) {
                const allSuggestions = await response.json();
                userSuggestions = allSuggestions.filter(suggestion =>
                    suggestion.user && suggestion.user.id === currentUser.id
                );
            } else {
                userSuggestions = [];
            }
        } catch (error) {
            userSuggestions = [];
        }
    }

    async function loadAllSuggestions() {
        try {
            if (!currentUser || !currentUser.id) {
                allSuggestions = [];
                return;
            }

            const response = await fetch(`${API_BASE_URL}/user/suggestions/all?userId=${currentUser.id}`);

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    allSuggestions = data.suggestions || [];
                } else {
                    allSuggestions = [];
                }
            } else {
                await loadBasicSuggestions();
            }
        } catch (error) {
            allSuggestions = [];
        }
    }

    async function loadBasicSuggestions() {
        try {
            const response = await fetch(`${API_BASE_URL}/suggestion/apis/findAll`);

            if (response.ok) {
                allSuggestions = await response.json();
                allSuggestions = allSuggestions.map(suggestion => ({
                    ...suggestion,
                    upvoteCount: suggestion.upvoteCount || 0,
                    publisherInterestCount: suggestion.publisherInterestCount || 0,
                    userHasUpvoted: suggestion.userHasUpvoted || false
                }));
            } else {
                allSuggestions = [];
            }
        } catch (error) {
            allSuggestions = [];
        }
    }

    async function loadPageData(page) {
        try {
            switch(page) {
                case 'dashboard':
                    await loadDashboardData();
                    break;
                case 'my-library':
                    await loadLibraryData();
                    break;
                case 'reading-history':
                    await loadHistoryData();
                    break;
                case 'reviews':
                    await loadReviewsData();
                    break;
                case 'suggestions':
                    await loadSuggestionsData();
                    break;
                case 'settings':
                    await loadSettingsData();
                    break;
            }
        } catch (error) {
        }
    }

    async function loadDashboardData() {
        try {
            const booksRead = userBooks.filter(book =>
                book.status === 'COMPLETED' || book.status === 'READ'
            ).length;

            document.getElementById('booksReadCount').textContent = booksRead;
            document.getElementById('readingTime').textContent = '12h';
            document.getElementById('reviewsCount').textContent = userReviews.length;
            document.getElementById('achievementsCount').textContent = '5';

            await updateCurrentlyReading();
            await updateRecentlyAdded();
            await updateRecentActivity();

        } catch (error) {
        }
    }

    async function updateCurrentlyReading() {
        const currentlyReadingGrid = document.getElementById('currentlyReadingGrid');
        if (!currentlyReadingGrid) return;

        const currentlyReadingBooks = userBooks.filter(book =>
            book.status === 'READING' || book.status === 'IN_PROGRESS'
        );

        if (currentlyReadingBooks.length > 0) {
            currentlyReadingGrid.innerHTML = currentlyReadingBooks.slice(0, 6).map(book => `
                <div class="book-card" onclick="openBookDetails(${book.id})">
                    <div class="book-cover">
                        ${book.coverImagePath ?
                            `<img src="${API_BASE_URL}/uploads/${book.coverImagePath}" alt="${book.title}">` :
                            `<i class='bx bx-book'></i>`
                        }
                    </div>
                    <div class="book-info">
                        <div class="book-title">${book.title}</div>
                        <div class="book-author">${book.author}</div>
                        <div class="book-progress">
                            <div class="book-progress-bar" style="width: 30%"></div>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            currentlyReadingGrid.innerHTML = `
                <div class="empty-state">
                    <i class='bx bx-book-open'></i>
                    <p>No books currently being read</p>
                    <p>Start reading to see your progress here</p>
                </div>
            `;
        }
    }

    async function updateRecentlyAdded() {
        const recentlyAddedGrid = document.getElementById('recentlyAddedGrid');
        if (!recentlyAddedGrid) return;

        const recentBooks = [...userBooks].sort((a, b) =>
            new Date(b.uploadedAt || b.createdAt) - new Date(a.uploadedAt || a.createdAt)
        ).slice(0, 6);

        if (recentBooks.length > 0) {
            recentlyAddedGrid.innerHTML = recentBooks.map(book => `
                <div class="book-card" onclick="openBookDetails(${book.id})">
                    <div class="book-cover">
                        ${book.coverImagePath ?
                            `<img src="${API_BASE_URL}/uploads/${book.coverImagePath}" alt="${book.title}">` :
                            `<i class='bx bx-book'></i>`
                        }
                    </div>
                    <div class="book-info">
                        <div class="book-title">${book.title}</div>
                        <div class="book-author">${book.author}</div>
                    </div>
                </div>
            `).join('');
        } else {
            recentlyAddedGrid.innerHTML = `
                <div class="empty-state">
                    <i class='bx bx-book-add'></i>
                    <p>No books added recently</p>
                    <p>Add books to your library to see them here</p>
                </div>
            `;
        }
    }

    async function updateRecentActivity() {
        const recentActivityList = document.getElementById('recentActivityList');
        if (!recentActivityList) return;

        const activities = [
            { type: 'reading', title: 'Started reading "The Great Gatsby"', time: '2 hours ago' },
            { type: 'review', title: 'Reviewed "To Kill a Mockingbird"', time: '1 day ago' },
            { type: 'added', title: 'Added "1984" to your library', time: '2 days ago' }
        ];

        if (activities.length > 0) {
            recentActivityList.innerHTML = activities.map(activity => `
                <li class="activity-item">
                    <div class="activity-icon">
                        <i class='bx bx-${activity.type === 'reading' ? 'book-open' : activity.type === 'review' ? 'star' : 'book-add'}'></i>
                    </div>
                    <div class="activity-details">
                        <div class="activity-title">${activity.title}</div>
                        <div class="activity-time">${activity.time}</div>
                    </div>
                </li>
            `).join('');
        } else {
            recentActivityList.innerHTML = `
                <div class="empty-state">
                    <i class='bx bx-time'></i>
                    <p>No recent activity</p>
                    <p>Your reading activity will appear here</p>
                </div>
            `;
        }
    }

    async function loadLibraryData() {
        try {
            document.getElementById('totalBooks').textContent = userBooks.length;
            document.getElementById('readingBooks').textContent = userBooks.filter(book =>
                book.status === 'READING' || book.status === 'IN_PROGRESS'
            ).length;
            document.getElementById('completedBooks').textContent = userBooks.filter(book =>
                book.status === 'COMPLETED' || book.status === 'READ'
            ).length;
            document.getElementById('favoriteBooks').textContent = userBooks.filter(book =>
                book.isFavorite
            ).length;

            const libraryBooksGrid = document.getElementById('libraryBooksGrid');
            if (libraryBooksGrid) {
                if (userBooks.length > 0) {
                    libraryBooksGrid.innerHTML = userBooks.map(book => `
                        <div class="book-card" onclick="openBookDetails(${book.id})">
                            <div class="book-cover">
                                ${book.coverImagePath ?
                                    `<img src="${API_BASE_URL}/uploads/${book.coverImagePath}" alt="${book.title}">` :
                                    `<i class='bx bx-book'></i>`
                                }
                            </div>
                            <div class="book-info">
                                <div class="book-title">${book.title}</div>
                                <div class="book-author">${book.author}</div>
                                <div class="book-status">${book.status || 'Not Started'}</div>
                            </div>
                        </div>
                    `).join('');
                } else {
                    libraryBooksGrid.innerHTML = `
                        <div class="empty-state">
                            <i class='bx bx-book'></i>
                            <p>No books in your library</p>
                            <p>Add books to start building your collection</p>
                        </div>
                    `;
                }
            }
        } catch (error) {
        }
    }

    async function loadHistoryData() {
        try {
            document.getElementById('readingDays').textContent = '24';
            document.getElementById('pagesRead').textContent = '1,245';
            document.getElementById('avgReadingTime').textContent = '45m';
            document.getElementById('completionRate').textContent = '68%';
        } catch (error) {
        }
    }

    async function loadReviewsData() {
        try {
            document.getElementById('totalReviews').textContent = userReviews.length;
            document.getElementById('helpfulReviews').textContent = userReviews.filter(review =>
                review.helpfulCount > 0
            ).length;
            document.getElementById('reviewComments').textContent = userReviews.reduce((sum, review) =>
                sum + (review.commentCount || 0), 0
            );

            const avgRating = userReviews.length > 0 ?
                (userReviews.reduce((sum, review) => sum + review.rating, 0) / userReviews.length).toFixed(1) : '0.0';
            document.getElementById('avgRating').textContent = avgRating;

            const reviewsList = document.getElementById('reviewsList');
            if (reviewsList) {
                if (userReviews.length > 0) {
                    reviewsList.innerHTML = userReviews.map(review => `
                        <div class="review-card">
                            <div class="review-header">
                                <div class="review-book">${review.book ? review.book.title : 'Unknown Book'}</div>
                                <div class="review-rating">
                                    ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
                                </div>
                            </div>
                            <div class="review-text">${review.reviewText}</div>
                        </div>
                    `).join('');
                } else {
                    reviewsList.innerHTML = `
                        <div class="empty-state">
                            <i class='bx bx-comment-detail'></i>
                            <p>No reviews written yet</p>
                            <p>Share your thoughts on the books you've read</p>
                        </div>
                    `;
                }
            }
        } catch (error) {
        }
    }

    async function loadSuggestionsData() {
        try {
            document.getElementById('totalSuggestions').textContent = userSuggestions.length;
            document.getElementById('acceptedSuggestions').textContent = userSuggestions.filter(s =>
                s.suggestionStatus === 'ACCEPTED' || s.suggestionStatus === 'APPROVED'
            ).length;
            document.getElementById('pendingSuggestions').textContent = userSuggestions.filter(s =>
                s.suggestionStatus === 'PENDING' || !s.suggestionStatus
            ).length;
            document.getElementById('addedFromSuggestions').textContent = userSuggestions.filter(s =>
                s.suggestionStatus === 'ACCEPTED' || s.suggestionStatus === 'APPROVED'
            ).length;

            await displayUserSuggestions();
            await displayAllSuggestions();
            await loadSuggestedBooks();

        } catch (error) {
        }
    }

    function changeUserSuggestionsPage(page) {
        const totalPages = Math.ceil(userSuggestions.length / SUGGESTIONS_PER_PAGE);
        if (page < 1 || page > totalPages) return;

        currentUserSuggestionsPage = page;
        displayUserSuggestions();
    }

    async function displayUserSuggestions() {
        const userSuggestionsList = document.getElementById('userSuggestionsList');
        if (!userSuggestionsList) {
            return;
        }

        if (userSuggestions.length > 0) {
            const startIndex = (currentUserSuggestionsPage - 1) * SUGGESTIONS_PER_PAGE;
            const endIndex = startIndex + SUGGESTIONS_PER_PAGE;
            const paginatedSuggestions = userSuggestions.slice(startIndex, endIndex);
            const totalPages = Math.ceil(userSuggestions.length / SUGGESTIONS_PER_PAGE);

            userSuggestionsList.innerHTML = paginatedSuggestions.map(suggestion => `
                <div class="suggestion-item">
                    <div class="suggestion-header">
                        <div class="suggestion-title">${suggestion.suggestedTitle || 'Untitled'}</div>
                        <div class="suggestion-status ${(suggestion.suggestionStatus || 'PENDING').toLowerCase()}">
                            ${suggestion.suggestionStatus || 'PENDING'}
                        </div>
                    </div>
                    <div class="suggestion-author">by ${suggestion.author || 'Unknown Author'}</div>
                    <div class="suggestion-reason">${suggestion.suggestionReason || 'No reason provided'}</div>
                    <div class="suggestion-stats">
                        <span class="upvote-count">${suggestion.upvoteCount || 0} 👍</span>
                        <span class="interest-count">${suggestion.publisherInterestCount || 0} 👁️</span>
                    </div>
                    <div class="suggestion-date">
                        Suggested on: ${new Date(suggestion.createdAt || Date.now()).toLocaleDateString()}
                    </div>
                    ${suggestion.adminNotes ? `
                        <div class="admin-notes">
                            <strong>Admin Notes:</strong> ${suggestion.adminNotes}
                        </div>
                    ` : ''}
                </div>
            `).join('');

            if (userSuggestions.length > SUGGESTIONS_PER_PAGE) {
                userSuggestionsList.innerHTML += `
                    <div class="pagination-controls">
                        <button class="pagination-btn" onclick="changeUserSuggestionsPage(${currentUserSuggestionsPage - 1})"
                            ${currentUserSuggestionsPage === 1 ? 'disabled' : ''}>
                            <i class='bx bx-chevron-left'></i> Previous
                        </button>
                        <span class="pagination-info">Page ${currentUserSuggestionsPage} of ${totalPages}</span>
                        <button class="pagination-btn" onclick="changeUserSuggestionsPage(${currentUserSuggestionsPage + 1})"
                            ${currentUserSuggestionsPage === totalPages ? 'disabled' : ''}>
                            Next <i class='bx bx-chevron-right'></i>
                        </button>
                    </div>
                `;
            }

        } else {
            userSuggestionsList.innerHTML = `
                <div class="empty-state">
                    <i class='bx bx-bulb'></i>
                    <p>No suggestions submitted yet</p>
                    <p>Your submitted suggestions will appear here</p>
                </div>
            `;
        }
    }

    function changeAllSuggestionsPage(page) {
        const totalPages = Math.ceil(allSuggestions.length / SUGGESTIONS_PER_PAGE);
        if (page < 1 || page > totalPages) return;

        currentAllSuggestionsPage = page;
        displayAllSuggestions();
    }

    async function displayAllSuggestions() {
        const allSuggestionsContainer = document.getElementById('allSuggestionsList');
        if (!allSuggestionsContainer) {
            return;
        }

        if (allSuggestions.length > 0) {
            const startIndex = (currentAllSuggestionsPage - 1) * SUGGESTIONS_PER_PAGE;
            const endIndex = startIndex + SUGGESTIONS_PER_PAGE;
            const paginatedSuggestions = allSuggestions.slice(startIndex, endIndex);
            const totalPages = Math.ceil(allSuggestions.length / SUGGESTIONS_PER_PAGE);

            allSuggestionsContainer.innerHTML = paginatedSuggestions.map(suggestion => `
                <div class="suggestion-item">
                    <div class="suggestion-header">
                        <div class="suggestion-title">${suggestion.suggestedTitle || 'Untitled'}</div>
                        <div class="suggestion-status ${(suggestion.suggestionStatus || 'PENDING').toLowerCase()}">
                            ${suggestion.suggestionStatus || 'PENDING'}
                        </div>
                    </div>
                    <div class="suggestion-author">by ${suggestion.author || 'Unknown Author'}</div>
                    <div class="suggestion-reason">${suggestion.suggestionReason || 'No reason provided'}</div>
                    <div class="suggestion-stats">
                        <span class="upvote-count">${suggestion.upvoteCount || 0} 👍</span>
                        <span class="interest-count">${suggestion.publisherInterestCount || 0} 👁️</span>
                        <span class="user-count">Suggested by: ${suggestion.userName || 'Anonymous'}</span>
                    </div>
                    <div class="suggestion-actions">
                        <button class="upvote-btn ${suggestion.userHasUpvoted ? 'active' : ''}"
                                onclick="upvoteSuggestion(${suggestion.id})">
                            <i class='bx bx-up-arrow'></i>
                            ${suggestion.userHasUpvoted ? 'Upvoted' : 'Upvote'}
                        </button>
                        <button class="view-stats-btn" onclick="viewSuggestionStats(${suggestion.id})">
                            <i class='bx bx-stats'></i>
                            View Stats
                        </button>
                    </div>
                    <div class="suggestion-date">
                        Suggested on: ${new Date(suggestion.createdAt || Date.now()).toLocaleDateString()}
                    </div>
                </div>
            `).join('');

            if (allSuggestions.length > SUGGESTIONS_PER_PAGE) {
                allSuggestionsContainer.innerHTML += `
                    <div class="pagination-controls">
                        <button class="pagination-btn" onclick="changeAllSuggestionsPage(${currentAllSuggestionsPage - 1})"
                            ${currentAllSuggestionsPage === 1 ? 'disabled' : ''}>
                            <i class='bx bx-chevron-left'></i> Previous
                        </button>
                        <span class="pagination-info">Page ${currentAllSuggestionsPage} of ${totalPages}</span>
                        <button class="pagination-btn" onclick="changeAllSuggestionsPage(${currentAllSuggestionsPage + 1})"
                            ${currentAllSuggestionsPage === totalPages ? 'disabled' : ''}>
                            Next <i class='bx bx-chevron-right'></i>
                        </button>
                    </div>
                `;
            }

        } else {
            allSuggestionsContainer.innerHTML = `
                <div class="empty-state">
                    <i class='bx bx-message-square-x'></i>
                    <p>No suggestions available</p>
                    <p>Be the first to suggest a book!</p>
                </div>
            `;
        }
    }

    async function loadSuggestedBooks() {
        try {
            const suggestionsGrid = document.getElementById('suggestionsGrid');
            if (!suggestionsGrid) return;

            const acceptedSuggestions = userSuggestions.filter(suggestion =>
                suggestion.suggestionStatus === 'ACCEPTED' || suggestion.suggestionStatus === 'APPROVED'
            );

            if (acceptedSuggestions.length > 0) {
                suggestionsGrid.innerHTML = acceptedSuggestions.slice(0, 6).map(suggestion => `
                    <div class="book-card" onclick="viewSuggestionBook(${suggestion.id})">
                        <div class="book-cover">
                            <i class='bx bx-book'></i>
                        </div>
                        <div class="book-info">
                            <div class="book-title">${suggestion.suggestedTitle || 'Untitled Book'}</div>
                            <div class="book-author">by ${suggestion.author || 'Unknown Author'}</div>
                            <div class="book-status">Accepted</div>
                        </div>
                    </div>
                `).join('');
            } else {
                suggestionsGrid.innerHTML = `
                    <div class="empty-state">
                        <i class='bx bx-bulb'></i>
                        <p>No suggested books yet</p>
                        <p>Your accepted suggestions will appear here</p>
                    </div>
                `;
            }
        } catch (error) {
            const suggestionsGrid = document.getElementById('suggestionsGrid');
            suggestionsGrid.innerHTML = `
                <div class="empty-state">
                    <i class='bx bx-error'></i>
                    <p>Failed to load books</p>
                    <p>Please try again later</p>
                </div>
            `;
        }
    }

    function viewSuggestionBook(suggestionId) {
        showNotification('Book details will be available soon!', 'info');
    }

    async function loadSettingsData() {
        try {
            if (currentUser) {
                const userFullName = document.getElementById('userFullName');
                const userEmail = document.getElementById('userEmail');
                const userLanguage = document.getElementById('userLanguage');

                if (userFullName) userFullName.value = currentUser.name || '';
                if (userEmail) userEmail.value = currentUser.email || '';
                if (userLanguage) userLanguage.value = currentUser.preferredLanguage || 'en';
            }
        } catch (error) {
        }
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
        setupLibraryFilters();
        setupSuggestionActions();
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

    function setupLibraryFilters() {
        const librarySearch = document.getElementById('librarySearch');
        const libraryFilter = document.getElementById('libraryFilter');

        if (librarySearch) {
            librarySearch.addEventListener('input', (e) => {
                filterLibraryBooks(e.target.value, libraryFilter ? libraryFilter.value : 'all');
            });
        }

        if (libraryFilter) {
            libraryFilter.addEventListener('change', (e) => {
                filterLibraryBooks(librarySearch ? librarySearch.value : '', e.target.value);
            });
        }
    }

    function setupSuggestionActions() {
        const submitSuggestionBtn = document.getElementById('submitSuggestionBtn');
        if (submitSuggestionBtn) {
            submitSuggestionBtn.addEventListener('click', submitSuggestion);
        }

        const refreshSuggestionsBtn = document.getElementById('refreshSuggestionsBtn');
        if (refreshSuggestionsBtn) {
            refreshSuggestionsBtn.addEventListener('click', () => {
                loadUserSuggestions();
                loadAllSuggestions();
                loadSuggestionsData();
                showNotification('Suggestions refreshed!', 'success');
            });
        }
    }

    function setupSettingsActions() {
        const saveProfileBtn = document.getElementById('saveProfileBtn');
        const savePreferencesBtn = document.getElementById('savePreferencesBtn');
        const saveNotificationsBtn = document.getElementById('saveNotificationsBtn');

        if (saveProfileBtn) saveProfileBtn.addEventListener('click', saveProfile);
        if (savePreferencesBtn) savePreferencesBtn.addEventListener('click', savePreferences);
        if (saveNotificationsBtn) saveNotificationsBtn.addEventListener('click', saveNotifications);
    }

    function filterLibraryBooks(searchTerm, filter) {
        let filtered = userBooks;

        if (searchTerm) {
            filtered = filtered.filter(book =>
                book.title && book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                book.author && book.author.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (filter !== 'all') {
            filtered = filtered.filter(book => {
                switch(filter) {
                    case 'reading':
                        return book.status === 'READING' || book.status === 'IN_PROGRESS';
                    case 'completed':
                        return book.status === 'COMPLETED' || book.status === 'READ';
                    case 'favorites':
                        return book.isFavorite;
                    default:
                        return true;
                }
            });
        }

        const libraryBooksGrid = document.getElementById('libraryBooksGrid');
        if (libraryBooksGrid) {
            if (filtered.length > 0) {
                libraryBooksGrid.innerHTML = filtered.map(book => `
                    <div class="book-card" onclick="openBookDetails(${book.id})">
                        <div class="book-cover">
                            ${book.coverImagePath ?
                                `<img src="${API_BASE_URL}/uploads/${book.coverImagePath}" alt="${book.title}">` :
                                `<i class='bx bx-book'></i>`
                            }
                        </div>
                        <div class="book-info">
                            <div class="book-title">${book.title}</div>
                            <div class="book-author">${book.author}</div>
                            <div class="book-status">${book.status || 'Not Started'}</div>
                        </div>
                    </div>
                `).join('');
            } else {
                libraryBooksGrid.innerHTML = `
                    <div class="empty-state">
                        <i class='bx bx-search'></i>
                        <p>No books match your search</p>
                        <p>Try adjusting your search criteria</p>
                    </div>
                `;
            }
        }
    }

    async function submitSuggestion() {
        const title = document.getElementById('suggestionTitle');
        const author = document.getElementById('suggestionAuthor');
        const reason = document.getElementById('suggestionReason');

        if (!title || !author) {
            showNotification('Form elements not found', 'error');
            return;
        }

        const titleValue = title.value.trim();
        const authorValue = author.value.trim();
        const reasonValue = reason ? reason.value.trim() : '';

        if (!titleValue || !authorValue) {
            showNotification('Please fill in at least the title and author', 'error');
            return;
        }

        if (!currentUser || !currentUser.id) {
            showNotification('Please login to submit suggestions', 'error');
            return;
        }

        showLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/suggestion/apis/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    suggestedTitle: titleValue,
                    author: authorValue,
                    suggestionReason: reasonValue,
                    userId: currentUser.id
                })
            });

            if (response.ok) {
                const result = await response.text();
                showNotification('Suggestion submitted successfully!', 'success');

                title.value = '';
                author.value = '';
                if (reason) reason.value = '';

                await loadUserSuggestions();
                await loadAllSuggestions();
                await loadSuggestionsData();

            } else {
                const errorText = await response.text();
                showNotification('Failed to submit suggestion: ' + errorText, 'error');
            }
        } catch (error) {
            showNotification('Error submitting suggestion: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
    }

    async function upvoteSuggestion(suggestionId) {
        if (!currentUser || !currentUser.id) {
            showNotification('Please login to upvote suggestions', 'error');
            return;
        }

        showLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/user/suggestions/upvote?userId=${currentUser.id}&suggestionId=${suggestionId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const result = await response.json();
                showNotification(result.message || 'Upvoted successfully!', 'success');

                await loadAllSuggestions();
                await loadSuggestionsData();

            } else {
                const errorText = await response.text();
                showNotification('Failed to upvote: ' + errorText, 'error');
            }
        } catch (error) {
            showNotification('Error upvoting suggestion', 'error');
        } finally {
            showLoading(false);
        }
    }

    async function viewSuggestionStats(suggestionId) {
        showLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/user/suggestions/${suggestionId}/stats`);

            if (response.ok) {
                const stats = await response.json();

                let statsHtml = `
                    <div class="stats-popup">
                        <h3>Suggestion Statistics</h3>
                        <div class="stats-grid">
                            <div class="stat-item">
                                <i class='bx bx-up-arrow'></i>
                                <span class="stat-value">${stats.upvoteCount || 0}</span>
                                <span class="stat-label">Upvotes</span>
                            </div>
                            <div class="stat-item">
                                <i class='bx bx-user-voice'></i>
                                <span class="stat-value">${stats.publisherInterestCount || 0}</span>
                                <span class="stat-label">Publisher Interests</span>
                            </div>
                            <div class="stat-item">
                                <i class='bx bx-book'></i>
                                <span class="stat-value">${stats.booksUploadedCount || 0}</span>
                                <span class="stat-label">Books Uploaded</span>
                            </div>
                            <div class="stat-item">
                                <i class='bx bx-trending-up'></i>
                                <span class="stat-value">${stats.totalEngagement || 0}</span>
                                <span class="stat-label">Total Engagement</span>
                            </div>
                        </div>
                    </div>
                `;

                const popup = document.createElement('div');
                popup.className = 'custom-popup';
                popup.innerHTML = statsHtml;

                const closeBtn = document.createElement('button');
                closeBtn.className = 'popup-close';
                closeBtn.innerHTML = '<i class="bx bx-x"></i>';
                closeBtn.onclick = () => document.body.removeChild(popup);

                popup.appendChild(closeBtn);
                document.body.appendChild(popup);

                popup.onclick = (e) => {
                    if (e.target === popup) {
                        document.body.removeChild(popup);
                    }
                };

            } else {
                showNotification('Failed to load suggestion statistics', 'error');
            }
        } catch (error) {
            showNotification('Error loading statistics', 'error');
        } finally {
            showLoading(false);
        }
    }

    async function saveProfile() {
        const userFullName = document.getElementById('userFullName');
        const userEmail = document.getElementById('userEmail');
        const userLanguage = document.getElementById('userLanguage');

        if (!userFullName || !userEmail || !userLanguage) return;

        const newName = userFullName.value.trim();

        if (!newName) {
            showNotification('Name cannot be empty', 'error');
            return;
        }

        if (!currentUser || !currentUser.id) {
            showNotification('Please login again to update your profile', 'error');
            return;
        }

        showLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/user/update-user-name`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: newName })
            });

            if (response.ok) {
                const updatedUser = await response.json();

                // ✅ in-memory + localStorage dono update karo, taaki naam turant sab jagah reflect ho
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

    async function savePreferences() {
        try {
            showNotification('Preferences saved successfully!', 'success');
        } catch (error) {
            showNotification('Error saving preferences', 'error');
        }
    }

    async function saveNotifications() {
        try {
            showNotification('Notification settings saved!', 'success');
        } catch (error) {
            showNotification('Error saving notification settings', 'error');
        }
    }

    async function switchPage(page) {
        if (page === currentPage) return;

        const currentPageElement = document.getElementById(`${currentPage}-page`);
        const newPageElement = document.getElementById(`${page}-page`);

        if (currentPageElement) currentPageElement.classList.remove('active');
        if (newPageElement) newPageElement.classList.add('active');

        currentPage = page;

        showLoading(true);
        try {
            await loadPageData(page);
        } catch (error) {
        } finally {
            showLoading(false);
        }

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

    function showError(message) {
        showNotification(message, 'error');
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

    function logout() {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('user');
        localStorage.removeItem('jwtToken');
        window.location.href = '/login';
    }