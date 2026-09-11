let bookId = null;
let pdfDoc = null;
let currentPage = 1;
let totalPages = 1;
let zoomScale = 1.5;
let progressSaveTimer = null;

document.addEventListener('DOMContentLoaded', function() {
    bookId = getBookIdFromUrl();
    if (!bookId) {
        showError('Book not found.');
        return;
    }

    // pdf.js internally makes its own network requests — tell it where its worker script is
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    setupEventListeners();
    initReader();
});

function getBookIdFromUrl() {
    const parts = window.location.pathname.split('/').filter(Boolean); // ["read", "12"]
    const id = parseInt(parts[1]);
    return isNaN(id) ? null : id;
}

async function initReader() {
    try {
        const [bookMeta, progress] = await Promise.all([
            fetchBookMeta(),
            fetchProgress()
        ]);

        document.getElementById('bookTitle').textContent = bookMeta.title;
        document.getElementById('bookAuthor').textContent = 'by ' + bookMeta.author;

        pdfDoc = await pdfjsLib.getDocument({
            url: `${window.location.origin}/api/v1/book/${bookId}/stream`,
            withCredentials: true
        }).promise;

        totalPages = pdfDoc.numPages;

        const slider = document.getElementById('pageSlider');
        slider.max = totalPages;

        currentPage = (progress && progress.lastPageRead > 0 && progress.lastPageRead <= totalPages)
            ? progress.lastPageRead
            : 1;
        slider.value = currentPage;

        document.getElementById('readerLoading').style.display = 'none';
        document.getElementById('pageStage').style.display = 'flex';
        document.getElementById('readerToolbar').style.display = 'flex';

        await renderPage(currentPage);
        trackRead();
    } catch (error) {
        console.error('Error opening book:', error);
        showError('Could not open this book. It may not be available anymore.');
    }
}

async function fetchBookMeta() {
    const response = await fetch(`${window.location.origin}/api/v1/book/public/${bookId}`, {
        credentials: 'include'
    });
    if (!response.ok) throw new Error('Book metadata not found');
    return response.json();
}

async function fetchProgress() {
    try {
        const response = await fetch(`${window.location.origin}/api/v1/book/${bookId}/progress`, {
            credentials: 'include'
        });
        return response.ok ? await response.json() : null;
    } catch (error) {
        return null;
    }
}

/* ===================== RENDERING ===================== */

async function renderPage(pageNumber) {
    const page = await pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: zoomScale });

    const canvas = document.getElementById('pdfCanvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport: viewport }).promise;

    document.getElementById('pageIndicator').textContent = `${pageNumber} / ${totalPages}`;
    document.getElementById('pageSlider').value = pageNumber;

    scheduleProgressSave();
}

function goToPage(pageNumber) {
    // Slider drag ke liye — direct jump, koi animation nahi (continuous drag pe flip glitchy lagega)
    const clamped = Math.max(1, Math.min(pageNumber, totalPages));
    if (clamped === currentPage) return;
    currentPage = clamped;
    renderPage(currentPage);
}

function turnPage(direction) {
    // direction: 1 = next (left fold), -1 = prev (right fold)
    const target = currentPage + direction;
    const clamped = Math.max(1, Math.min(target, totalPages));
    if (clamped === currentPage) return;

    const card = document.querySelector('.page-card');
    const flipClass = direction > 0 ? 'flip-next' : 'flip-prev';

    card.classList.remove('flip-next', 'flip-prev');
    void card.offsetWidth; // reflow — taaki turant dobara click karne pe animation restart ho
    card.classList.add(flipClass);

    // Fold ke bilkul beech (card edge-on / almost invisible) exactly tab page badlo —
    // taaki swap dikhe hi na, "flip hoke naya page aaya" jaisa lage
    setTimeout(() => {
        currentPage = clamped;
        renderPage(currentPage);
    }, 300); // 0.6s animation ka aadha

    card.addEventListener('animationend', function handler() {
        card.classList.remove(flipClass);
        card.removeEventListener('animationend', handler);
    });
}

/* ===================== PROGRESS TRACKING ===================== */

// Har page-change ke 2 second baad save hota hai — har single flip pe request nahi bhejni
function scheduleProgressSave() {
    clearTimeout(progressSaveTimer);
    progressSaveTimer = setTimeout(saveProgress, 2000);
}

async function saveProgress() {
    try {
        await fetch(`${window.location.origin}/api/v1/book/${bookId}/progress`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ pageNumber: currentPage })
        });
    } catch (error) {
        console.error('Error saving progress:', error);
    }
}

// Tab band hone se pehle bhi ek final save — taaki 2-second wait ka nuksaan na ho
// (sendBeacon hamesha POST bhejta hai, isliye /progress wale PUT endpoint se alag
// ek POST-only /progress/beacon endpoint use kiya hai)
window.addEventListener('beforeunload', () => {
    navigator.sendBeacon(
        `${window.location.origin}/api/v1/book/${bookId}/progress/beacon`,
        new Blob([JSON.stringify({ pageNumber: currentPage })], { type: 'application/json' })
    );
});

async function trackRead() {
    try {
        await fetch(`${window.location.origin}/api/v1/book/public/${bookId}/read`, {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Error tracking read:', error);
    }
}

/* ===================== CONTROLS ===================== */

function setupEventListeners() {
    document.getElementById('backBtn').addEventListener('click', () => {
        window.location.href = '/bookscreen';
    });

    document.getElementById('prevPageBtn').addEventListener('click', () => turnPage(-1));
    document.getElementById('nextPageBtn').addEventListener('click', () => turnPage(1));

    document.getElementById('pageSlider').addEventListener('input', (e) => {
        goToPage(parseInt(e.target.value));
    });

    document.getElementById('zoomInBtn').addEventListener('click', () => {
        zoomScale = Math.min(zoomScale + 0.25, 3);
        renderPage(currentPage);
    });
    document.getElementById('zoomOutBtn').addEventListener('click', () => {
        zoomScale = Math.max(zoomScale - 0.25, 0.75);
        renderPage(currentPage);
    });

    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => setColorMode(btn.dataset.mode, btn));
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') turnPage(1);
        if (e.key === 'ArrowLeft') turnPage(-1);
    });
}

function setColorMode(mode, activeBtn) {
    const card = document.querySelector('.page-card');
    card.classList.remove('mode-sepia', 'mode-dark');
    if (mode === 'sepia') card.classList.add('mode-sepia');
    if (mode === 'dark') card.classList.add('mode-dark');

    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    activeBtn.classList.add('active');
}

function showError(message) {
    const loading = document.getElementById('readerLoading');
    loading.innerHTML = `
        <i class='bx bx-error-circle' style="font-size: 2.5rem;"></i>
        <p style="margin-top: 10px;">${message}</p>
    `;
}