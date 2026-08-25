// ===== INSTANT NAVIGATION SYSTEM =====

// Page initialization
document.addEventListener('DOMContentLoaded', function() {
    // Set current year
    document.getElementById('currentYear').textContent = new Date().getFullYear();

    // Pre-fetch pages in background for instant loading
    preloadCriticalPages();

});

// ===== PRELOAD SYSTEM =====
function preloadCriticalPages() {
    // Create invisible iframes to preload pages
    const pagesToPreload = ['/login', '/books', '/bookscreen'];

    pagesToPreload.forEach(page => {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = page;
        document.body.appendChild(iframe);

        // Remove after short time to save resources
        setTimeout(() => {
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
        }, 3000);
    });
}

// ===== INSTANT NAVIGATION FUNCTIONS =====

// ✅ ULTRA-FAST LOGIN REDIRECT (0.05 seconds)
function goToLoginInstant() {

    // Immediate visual feedback
    const btn = event.target.closest('button');
    if (btn) {
        btn.style.opacity = '0.7';
        btn.disabled = true;
    }

    // Instant redirect with minimal delay
    setTimeout(() => {
        window.location.href = '/login';
    }, 50); // 0.05 seconds - virtually instant
}

// ✅ OPTIMIZED EXPLORE BOOKS (0.05 seconds)
function handleExploreBooks(event) {

    // Prevent default if needed, but allow normal navigation
    if (event) {
        event.preventDefault();
    }

    // Immediate visual feedback
    const link = event.target;
    link.style.opacity = '0.7';
    link.style.pointerEvents = 'none';

    // Instant redirect
    setTimeout(() => {
        window.location.href = '/books';
    }, 50); // 0.05 seconds
}

// ✅ LOGO CLICK HANDLER (0.05 seconds)
function handleLogoClick(event) {

    // If already on home page, prevent navigation
    if (window.location.pathname === '/') {
        event.preventDefault();
        return;
    }

    // Immediate visual feedback
    const logo = event.target.closest('a');
    if (logo) {
        logo.style.opacity = '0.7';
    }

    // Instant redirect to home
    setTimeout(() => {
        window.location.href = '/';
    }, 50); // 0.05 seconds
}

// ===== ENHANCED USER EXPERIENCE =====

// Add instant hover effects for better feedback
document.addEventListener('DOMContentLoaded', function() {
    const interactiveElements = document.querySelectorAll('a, button, .explore-btn');

    interactiveElements.forEach(element => {
        // Add instant hover feedback
        element.addEventListener('mouseover', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.transition = 'all 0.1s ease';
        });

        element.addEventListener('mouseout', function() {
            this.style.transform = 'translateY(0)';
        });

        // Add touch feedback for mobile
        element.addEventListener('touchstart', function() {
            this.style.opacity = '0.8';
        });

        element.addEventListener('touchend', function() {
            this.style.opacity = '1';
        });
    });
});

// ===== PERFORMANCE MONITORING =====

// Monitor navigation performance
const originalPushState = history.pushState;
history.pushState = function() {
    return originalPushState.apply(this, arguments);
};

// Log page load performance
window.addEventListener('load', function() {
    const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
});

// ===== FALLBACK SYSTEM =====

// If instant navigation fails, fallback to normal navigation
function fallbackNavigation(url) {
    window.location.href = url;
}

// Global error handler for navigation
window.addEventListener('error', function(e) {
    if (e.message.includes('navigation')) {
    }
});

// Legacy function for backward compatibility
function exploreBooks() {
    handleExploreBooks();
}