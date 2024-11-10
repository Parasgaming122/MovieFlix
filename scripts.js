// Constants
const TMDB_API_KEY = 'fb7bb23f03b6994dafc674c074d01761';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

// Navigation state
let currentRow = 0;
let currentCol = 0;
let rows = [];
let navSections = ['navbar', 'search', 'continue', 'trending', 'movies', 'tv'];
let isNavigating = false; // Prevent rapid navigation

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    loadContent();
    initializeScrollButtons();
});

// Initialize TV navigation
function initializeNavigation() {
    // Get all navigable rows
    rows = [
        document.querySelector('.navbar-nav'),
        document.querySelector('#searchContainer'),
        document.querySelector('[data-row="continue"]'),
        document.querySelector('[data-row="trending"]'),
        document.querySelector('[data-row="movies"]'),
        document.querySelector('[data-row="tv"]')
    ];

    // Initial focus
    currentRow = 2; // Start at Continue Watching
    currentCol = 0;

    // Add keyboard listeners
    document.addEventListener('keydown', handleKeyNavigation);
}

// Handle keyboard navigation
function handleKeyNavigation(event) {
    if (isNavigating) return; // Prevent rapid navigation
    isNavigating = true;

    switch (event.key) {
        case 'ArrowUp':
            navigateVertical(-1);
            break;
        case 'ArrowDown':
            navigateVertical(1);
            break;
        case 'ArrowLeft':
            navigateHorizontal(-1);
            break;
        case 'ArrowRight':
            navigateHorizontal(1);
            break;
        case 'Enter':
            handleEnter();
            break;
    }

    // Reset navigation state after a short delay
    setTimeout(() => {
        isNavigating = false;
    }, 200); // Adjust the delay as needed
}

// Vertical navigation
function navigateVertical(direction) {
    const oldRow = currentRow;
    currentRow = Math.max(0, Math.min(rows.length - 1, currentRow + direction));

    if (oldRow !== currentRow) {
        // Adjust currentCol based on the number of items in the new row
        const items = Array.from(rows[currentRow].children);
        currentCol = Math.min(currentCol, items.length - 1);

        // Focus the element
        focusElement(items[currentCol]);

        // Update navigation indicator
        updateNavigationIndicator();
    }
}

// Horizontal navigation
function navigateHorizontal(direction) {
    const items = Array.from(rows[currentRow].children);
    const oldCol = currentCol;
    currentCol = Math.max(0, Math.min(items.length - 1, currentCol + direction));

    if (oldCol !== currentCol) {
        const element = items[currentCol];
        focusElement(element);

        // Center the selected card in the viewport
        const row = rows[currentRow];
        const cardRect = element.getBoundingClientRect();
        const rowRect = row.getBoundingClientRect();

        // Calculate the offset to center the card
        const offset = cardRect.left - rowRect.left + (cardRect.width / 2) - (rowRect.width / 2);

        // Scroll the row to center the selected card
        row.scrollBy({
            left: offset,
            behavior: 'smooth'
        });

        // Ensure the row is fully visible in the viewport
        const viewportRect = row.getBoundingClientRect();
        const rowScrollLeft = row.scrollLeft;

        // Adjust scrolling based on the row's position in the viewport
        if (viewportRect.right < window.innerWidth) {
            // If the row is not fully visible, scroll it into view
            row.scrollTo({
                left: rowScrollLeft + (viewportRect.right - window.innerWidth),
                behavior: 'smooth'
            });
        } else if (viewportRect.left > 0) {
            // If the row is partially off the left side, scroll it into view
            row.scrollTo({
                left: rowScrollLeft + viewportRect.left,
                behavior: 'smooth'
            });
        }
    }
}

// Focus management
function focusElement(element) {
    if (element) {
        // Remove previous focus
        document.querySelectorAll('.focused').forEach(el => el.classList.remove('focused'));

        // Add focus to new element
        element.classList.add('focused');
        element.focus();

        // Show navigation indicator
        showNavigationIndicator();
    }
}

// Handle Enter key
function handleEnter() {
    const focusedElement = document.querySelector('.focused');
    if (focusedElement) {
        if (focusedElement.classList.contains('movie-card')) {
            const movieId = focusedElement.dataset.movieId;
            const type = focusedElement.dataset.type;
            openMovieDetails(movieId, type);
        } else if (focusedElement.classList.contains('nav-link')) {
            focusedElement.click();
        }
    }
}

// Show navigation indicator temporarily
function showNavigationIndicator() {
    const indicator = document.getElementById('navIndicator');
    indicator.classList.add('show');

    setTimeout(() => {
        indicator.classList.remove('show');
    }, 2000);
}

// API Functions
async function fetchFromTMDB(endpoint, params = {}) {
    const queryParams = new URLSearchParams({
        api_key: TMDB_API_KEY,
        ...params
    });

    const response = await fetch(`${TMDB_BASE_URL}${endpoint}?${queryParams}`);
    return response.json();
}

// Load content for each section
async function loadContent() {
    try {
        const [trending, movies, tvShows] = await Promise.all([
            fetchFromTMDB('/trending/all/day'),
            fetchFromTMDB('/movie/now_playing'),
            fetchFromTMDB('/tv/on_the_air')
        ]);

        populateRow('trending', trending.results);
        populateRow('movies', movies.results);
        populateRow('tv', tvShows.results);
    } catch (error) {
        console.error('Error loading content:', error);
    }
}

// Populate a row with content
function populateRow(rowId, items) {
    const row = document.querySelector(`[data-row="${rowId}"]`);
    row.innerHTML = items.map((item, index) => createMovieCard(item, index)).join('');
}

// Create movie card HTML
function createMovieCard(item, index) {
    const title = item.title || item.name;
    const type = item.first_air_date ? 'tv' : 'movie';
    const posterPath = item.poster_path ?
        `${TMDB_IMAGE_BASE}${item.poster_path}` :
        'placeholder.jpg';

    return `
        <div class="movie-card" 
             tabindex="0" 
             data-movie-id="${item.id}" 
             data-type="${type}"
             onclick="openDetails(${item.id}, '${type}')"
             aria-label="${title}">
            <img src="${posterPath}" alt="${title}" loading="lazy">
            <div class="movie-title">${title}</div>
        </div>
    `;
}

function openDetails(id, type) {
    window.location.href = `details.html?id=${id}&type=${type}`;
}

// Search functionality
let searchTimeout;
function handleSearch(event) {
    clearTimeout(searchTimeout);
    const query = event.target.value;

    searchTimeout = setTimeout(async () => {
        if (query.length >= 3) {
            const results = await fetchFromTMDB('/search/multi', { query });
            displaySearchResults(results.results);
        }
    }, 500);
}

// Toggle search
function toggleSearch(show) {
    isSearchActive = show;
    document.getElementById('searchContainer').classList.toggle('active', show);
    document.getElementById('mainContent').style.display = show ? 'none' : 'block';

    if (show) {
        document.getElementById('searchBox').focus();
    }
}

// Display search results
function displaySearchResults(results) {
    const container = document.getElementById('searchResults');
    container.innerHTML = results
        .map(item => createMovieCard(item))
        .join('');
}

// Movie details
async function openMovieDetails(id, type) {
    try {
        // Fetch movie/show details
        const details = await fetchFromTMDB(`/${type}/${id}`);

        // Fetch additional data
        const [credits, videos] = await Promise.all([
            fetchFromTMDB(`/${type}/${id}/credits`),
            fetchFromTMDB(`/${type}/${id}/videos`)
        ]);

        // Fetch streaming URL
        const streamingData = await fetchStreamingUrl(id, type);

        displayMovieDetails(details, credits, videos, streamingData, type);
    } catch (error) {
        console.error('Error fetching movie details:', error);
    }
}

// Fetch streaming URL from vidsrc API
async function fetchStreamingUrl(id, type, season = null, episode = null) {
    let url = `https://vidsrc-api-js-six.vercel.app/vidsrc/${id}`;
    if (type === 'tv' && season !== null && episode !== null) {
        url += `?s=${season}&e=${episode}`;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (!data.sources || data.sources.length === 0) {
            throw new Error('No video sources found');
        }
        return data;
    } catch (error) {
        console.error('Error fetching streaming URL:', error);
        throw error; // Rethrow to handle it in the calling function
    }
}

// Display movie details
function displayMovieDetails(details, credits, videos, streamingData, type) {
    const mainContent = document.getElementById('mainContent');
    const trailer = videos.results.find(v => v.type === 'Trailer');

    // Format release date or first air date
    const releaseDate = type === 'movie' ?
        details.release_date :
        `${details.first_air_date} (${details.number_of_seasons} seasons)`;

    // Create episodes section for TV shows
    const episodesSection = type === 'tv' ? `
        <div class="seasons-section mt-4">
            <h3>Seasons</h3>
            <select class="form-select bg-dark text-light" id="seasonSelect" onchange="loadEpisodes(${details.id}, this.value)">
                ${Array.from({ length: details.number_of_seasons }, (_, i) => i + 1)
                    .map(num => `<option value="${num}">Season ${num}</option>`)
                    .join('')}
            </select>
            <div id="episodesList" class="mt-3"></div>
        </div>
    ` : '';

    const detailsHTML = `
        <div class="movie-details">
            <div class="backdrop" style="background-image: url('${TMDB_IMAGE_BASE}${details.backdrop_path}')">
                <div class="overlay">
                    <div class="content">
                        <button class="btn btn-outline-light back-button" onclick="goBack()">
                            ← Back
                        </button>
                        <h1>${details.title || details.name}</h1>
                        <div class="meta">
                            <span>${releaseDate}</span>
                            <span>${details.vote_average.toFixed(1)}/10</span>
                        </div>
                        <p>${details.overview}</p>
                        <div class="buttons">
                            <button class="btn btn-danger" onclick="playContent('${streamingData.sources[0].url}')">
                                Play
                            </button>
                            <button class="btn btn-outline-light" onclick="toggleFavorite(${details.id})">
                                Add to Favorites
                            </button>
                        </div>
                        ${episodesSection}
                    </div>
                </div>
            </div>
        </div>
    `;

    mainContent.innerHTML = detailsHTML;

    // Load first season episodes for TV shows
    if (type === 'tv') {
        loadEpisodes(details.id, 1);
    }
}

// Play content
function playContent(streamUrl) {
    // Implementation for video player will be added later
    console.log('Playing:', streamUrl);
}

// Toggle favorite
function toggleFavorite(id) {
    // Implementation for favorites will be added later
    console.log('Toggle favorite:', id);
}

// Add this to your existing JavaScript
function initializeScrollButtons() {
    document.querySelectorAll('.row-container').forEach(container => {
        const row = container.querySelector('.movie-row');
        const leftBtn = container.querySelector('.scroll-left');
        const rightBtn = container.querySelector('.scroll-right');

        if (leftBtn && rightBtn) {
            leftBtn.addEventListener('click', () => {
                row.scrollBy({
                    left: -800,
                    behavior: 'smooth'
                });
            });

            rightBtn.addEventListener('click', () => {
                row.scrollBy({
                    left: 800,
                    behavior: 'smooth'
                });
            });
        }
    });
}

function updateNavigationIndicator() {
    const indicator = document.getElementById('navIndicator');
    const section = navSections[currentRow];
    indicator.textContent = `Currently in: ${section.charAt(0).toUpperCase() + section.slice(1)}`;

    // Show the indicator
    indicator.classList.add('show');

    // Hide after 2 seconds
    setTimeout(() => {
        indicator.classList.remove('show');
    }, 2000);
}

// Add function to load episodes
async function loadEpisodes(showId, seasonNumber) {
    try {
        const seasonDetails = await fetchFromTMDB(`/tv/${showId}/season/${seasonNumber}`);
        const episodesList = document.getElementById('episodesList');

        const episodesHTML = seasonDetails.episodes.map(episode => `
            <div class="episode-item p-2 mb-2 bg-dark rounded" 
                 onclick="playEpisode(${showId}, ${seasonNumber}, ${episode.episode_number})">
                <div class="d-flex align-items-center">
                    <img src="${episode.still_path ? TMDB_IMAGE_BASE + episode.still_path : 'placeholder.jpg'}" 
                         alt="Episode ${episode.episode_number}"
                         style="width: 160px; height: 90px; object-fit: cover; margin-right: 15px;">
                    <div>
                        <h5 class="mb-1">Episode ${episode.episode_number}: ${episode.name}</h5>
                        <p class="mb-0 text-muted">${episode.overview.substring(0, 100)}...</p>
                    </div>
                </div>
            </div>
        `).join('');

        episodesList.innerHTML = episodesHTML;
    } catch (error) {
        console.error('Error loading episodes:', error);
    }
}

// Add function to play episodes
async function playEpisode(showId, season, episode) {
    try {
        const streamingData = await fetchStreamingUrl(showId, 'tv', season, episode);
        playContent(streamingData.sources[0].url);
    } catch (error) {
        console.error('Error playing episode:', error);
    }
}

// Add back button functionality
function goBack() {
    window.history.back(); // Use browser's back functionality
}