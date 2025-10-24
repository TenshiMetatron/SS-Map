// Elements
const menuBtn = document.getElementById("menu-btn");
const sidebar = document.getElementById("sidebar");
const mapSidebar = document.getElementById("map-sidebar");
const overlay = document.getElementById("overlay");
const mainContent = document.getElementById("main-content");

// Global variables to track zoom level and position for drag/zoom functionality
let currentZoomScale = 1.0; // 1.0 = 100%
let currentTranslateX = 0;
let currentTranslateY = 0;

// Drag state
let isDragging = false;
let startX = 0; // Mouse/Touch coordinates when drag started
let startY = 0;
let pendingUpdate = false; // Flag for requestAnimationFrame

// Pinch zoom state
let lastDist = null; 

const ZOOM_STEP = 0.2; // Increase/decrease by 20%
const MAX_ZOOM = 3.0;
const MIN_ZOOM = 1.0;

// --- Global Initialization & Setup ---

// Visitor counter logic (Run once on script load)
let count = parseInt(localStorage.getItem("visitorCount") || 0);
count++;
localStorage.setItem("visitorCount", count);

// Preload map images for smooth floor switching 
// NOTE: Ensure your map images are named MapCampus.jpg, Map1.jpg through Map8.jpg
const mapImages = {
  'campus': new Image(), // Campus Map
  '1': new Image(),
  '2': new Image(),
  '3': new Image(),
  '4': new Image(), 
  '5': new Image(), 
  '6': new Image(), 
  '7': new Image(), 
  '8': new Image()  
};
mapImages['campus'].src = "MapCampus.jpg"; 
mapImages['1'].src = "Map1.jpg";
mapImages['2'].src = "Map2.jpg";
mapImages['3'].src = "Map3.jpg";
mapImages['4'].src = "Map4.jpg";
mapImages['5'].src = "Map5.jpg";
mapImages['6'].src = "Map6.jpg";
mapImages['7'].src = "Map7.jpg";
mapImages['8'].src = "Map8.jpg";


// --- Utility Functions ---

/**
 * Applies the current scale and translate values to the map image.
 * This is the ONLY function that should directly modify the map's transform style.
 */
function applyTransform() {
    const mapImage = document.getElementById("campus-map");
    if (mapImage) {
        mapImage.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${currentZoomScale})`;
    }
    
    // Update pending flag
    pendingUpdate = false;
}

/**
 * Triggers a visual update, prioritizing requestAnimationFrame for smoothness.
 */
function updateZoomView() {
    const zoomDisplay = document.getElementById("zoom-percent");

    // Only queue a new animation frame if one isn't already pending
    if (!pendingUpdate) {
        requestAnimationFrame(applyTransform);
        pendingUpdate = true;
    }

    // Update zoom percentage and buttons immediately
    if (zoomDisplay) {
        zoomDisplay.textContent = `${Math.round(currentZoomScale * 100)}%`;
    }
    
    const zoomInBtn = document.getElementById("zoom-in");
    const zoomOutBtn = document.getElementById("zoom-out");
    if (zoomInBtn) zoomInBtn.disabled = currentZoomScale >= MAX_ZOOM;
    if (zoomOutBtn) zoomOutBtn.disabled = currentZoomScale <= MIN_ZOOM;
}

/**
 * Resets the zoom and position of the map.
 */
function resetMapView() {
    currentZoomScale = 1.0;
    currentTranslateX = 0;
    currentTranslateY = 0;
    lastDist = null; 
    updateZoomView();
}

/**
 * Sets the active navigation link and closes sidebars/overlay.
 * @param {HTMLElement} tab - The navigation link element.
 */
function setActiveTab(tab) {
  document.querySelectorAll("#sidebar nav a").forEach(link => link.classList.remove("active"));
  tab.classList.add("active");
  
  // Close all sidebars and overlay
  sidebar.classList.remove("active");
  mapSidebar.classList.remove("active");
  overlay.classList.remove("active");
}

/**
 * Clears the main content area for new tab content.
 */
function clearMainContent() {
    mainContent.innerHTML = '';
}


// --- Global Event Listeners (Sidebar, Overlay) ---

// 1. Main Sidebar & Overlay Toggle
menuBtn.addEventListener("click", () => {
  const isOpening = !sidebar.classList.contains("active");
  sidebar.classList.toggle("active", isOpening);
  mapSidebar.classList.remove("active");
  overlay.classList.toggle("active", isOpening);
});

// 2. Close All on Overlay Click
overlay.addEventListener("click", () => {
  sidebar.classList.remove("active");
  mapSidebar.classList.remove("active");
  overlay.classList.remove("active");
});

// 3. Map Level Switching (Floor Buttons)
document.querySelectorAll("#map-sidebar nav a").forEach(link => {
    // Skip if the element is not a link (e.g., the PPKS Map header)
    if (link.tagName !== 'A') return;
    
    link.addEventListener("click", e => {
        e.preventDefault();
        
        if (document.getElementById("campus-map")) {
            // 1. Update active state
            document.querySelectorAll("#map-sidebar nav a").forEach(l => l.classList.remove("active"));
            link.classList.add("active");

            // 2. Determine the correct map file name (handles 'campus' and 'levelX' etc.)
            const levelId = link.id.replace("map-", "");
            
            let newSrc;
            let lookupId;

            if (levelId === 'campus') {
                newSrc = "MapCampus.jpg";
                lookupId = 'campus';
            } else if (levelId.startsWith('level')) {
                lookupId = levelId.replace('level', '');
                newSrc = `Map${lookupId}.jpg`; 
            } else {
                return;
            }
            
            // 3. Get dynamically added elements
            const mapImage = document.getElementById("campus-map");
            const spinner = document.getElementById("map-spinner");

            if (spinner && mapImage) {
                // Reset zoom and position when switching floors
                resetMapView(); 
                
                spinner.style.display = "block";
                mapImage.style.opacity = 0;

                const tempImg = mapImages[lookupId];
                
                const imageLoadHandler = () => {
                    mapImage.src = newSrc;
                    
                    setTimeout(() => {
                        spinner.style.display = "none";
                        mapImage.style.opacity = 1;
                    }, 100);
                };

                // Handle image loading
                if (tempImg && tempImg.complete) {
                    imageLoadHandler();
                } else if (tempImg) {
                    tempImg.onload = imageLoadHandler; 
                } else {
                    mapImage.src = newSrc;
                    spinner.style.display = "none";
                    mapImage.style.opacity = 1;
                }
            }
            
            // 4. Close map sidebar and overlay
            mapSidebar.classList.remove("active");
            overlay.classList.remove("active");
        }
    });
});


// --- Interactive Map Functionality (Zoom and Drag) ---

function handleMapInteraction() {
    const mapImage = document.getElementById("campus-map");
    const mapWrapper = document.getElementById("map-wrapper");
    
    if (!mapImage || !mapWrapper) return;

    // --- DRAG LOGIC ---
    
    const startDrag = (e) => {
        // Only start drag if it's a single touch/mouse click
        if ((e.type === 'touchstart' && e.touches.length === 1) || e.type === 'mousedown') {
            e.preventDefault(); 
            
            isDragging = true;
            mapImage.classList.add('is-dragging');
            
            const clientX = e.clientX || e.touches[0].clientX;
            const clientY = e.clientY || e.touches[0].clientY;
            
            // Calculate the offset to maintain smooth dragging from the point clicked
            startX = clientX - currentTranslateX;
            startY = clientY - currentTranslateY;
        }
    };

    const drag = (e) => {
        // Handle drag only if dragging is active AND map is zoomed in
        if (!isDragging || currentZoomScale === MIN_ZOOM) return;
        
        // Handle drag only if it's a mousemove or single touchmove
        if ((e.type === 'touchmove' && e.touches.length === 1) || e.type === 'mousemove') {
            const clientX = e.clientX || e.touches[0].clientX;
            const clientY = e.clientY || e.touches[0].clientY;
            
            currentTranslateX = clientX - startX;
            currentTranslateY = clientY - startY;

            // Use the optimized update function
            updateZoomView();
        }
    };

    const endDrag = () => {
        if (isDragging) {
            isDragging = false;
            mapImage.classList.remove('is-dragging');
            lastDist = null; // Reset pinch state
        }
    };
    
    // --- SCROLL ZOOM LOGIC ---
    const scrollZoom = (e) => {
        e.preventDefault();
        
        const delta = e.deltaY;
        let newScale = currentZoomScale;

        if (delta < 0) {
            // Zoom In (scroll up)
            newScale = Math.min(MAX_ZOOM, currentZoomScale + ZOOM_STEP);
        } else {
            // Zoom Out (scroll down)
            newScale = Math.max(MIN_ZOOM, currentZoomScale - ZOOM_STEP);
        }

        if (newScale !== currentZoomScale) {
            currentZoomScale = newScale;
            if (currentZoomScale === MIN_ZOOM) {
                resetMapView();
            } else {
                updateZoomView();
            }
        }
    };
    
    // --- PINCH ZOOM LOGIC ---
    
    const pinchZoom = (e) => {
        if (e.touches.length < 2) {
            lastDist = null; 
            return;
        }
        e.preventDefault(); 
        
        // Calculate the distance between the two touch points
        const dist = Math.hypot(
            e.touches[0].pageX - e.touches[1].pageX,
            e.touches[0].pageY - e.touches[1].pageY
        );

        if (lastDist) {
            const delta = dist - lastDist;
            let newScale = currentZoomScale;
            
            // Adjust sensitivity for touch
            const touchStep = 0.05; 

            if (delta > 0) {
                // Pinch Out (Zoom In)
                newScale = Math.min(MAX_ZOOM, currentZoomScale + touchStep); 
            } else if (delta < 0) {
                // Pinch In (Zoom Out)
                newScale = Math.max(MIN_ZOOM, currentZoomScale - touchStep);
            }
            
            if (newScale !== currentZoomScale) {
                currentZoomScale = newScale;
                if (currentZoomScale === MIN_ZOOM) {
                    resetMapView();
                } else {
                    updateZoomView();
                }
            }
        }
        
        lastDist = dist; 
    };

    // Attach all event listeners
    mapImage.addEventListener('mousedown', startDrag);
    mapImage.addEventListener('touchstart', startDrag);
    
    mapWrapper.addEventListener('mousemove', drag);
    mapWrapper.addEventListener('wheel', scrollZoom); 
    
    // Touchscreen-specific events
    mapWrapper.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
            drag(e); // Handle single-finger drag
        } else if (e.touches.length === 2) {
            pinchZoom(e); // Handle two-finger pinch
        }
    });

    window.addEventListener('mouseup', endDrag); 
    window.addEventListener('touchend', endDrag);
}


// --- Tab Handlers (unchanged) ---

document.getElementById("home-tab").addEventListener("click", e => {
  e.preventDefault();
  setActiveTab(e.target.closest("a"));
  clearMainContent();
  mainContent.innerHTML = `
    <h2>Welcome to the Campus Dashboard</h2>
    <p>This page shows total visitor count and access to the map.</p>
    <div class="stat-card">
        <h3>Total Visitors</h3>
        <p class="stat-number">${count}</p>
    </div>
  `;
});


document.getElementById("feedback-tab").addEventListener("click", e => {
  e.preventDefault();
  setActiveTab(e.target.closest("a"));
  clearMainContent();
  mainContent.innerHTML = `
    <h2 style="text-align:center; margin-bottom: 20px;">Feedback Form</h2>
    <div class="feedback-form-wrapper">
      <form class="feedback-form">
        <input type="text" placeholder="Your Name" required />
        <input type="email" placeholder="Your Email" required />
        <textarea rows="5" placeholder="Your Message" required></textarea>
        <button type="submit">Submit Feedback</button>
      </form>
    </div>
  `;
  mainContent.querySelector("form").addEventListener("submit", e => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;

    setTimeout(() => {
        alert("Thank you for your feedback! Your message has been recorded.");
        e.target.reset();
        
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }, 1500);
  });
});


document.getElementById("map-tab").addEventListener("click", e => {
  e.preventDefault();
  setActiveTab(e.target.closest("a"));
  clearMainContent();

  // 1. Reset zoom/position state and load the map HTML structure
  resetMapView(); 
    
  mainContent.innerHTML = `
    <h2>Interactive Campus Map</h2>
    <p>Use the 'Change Level' button to switch floors. Use the buttons, **mouse scroll wheel**, or **pinch** on mobile to zoom. Click and drag to pan.</p>
    <div class="map-controls">
      <button id="toggle-map-sidebar"><i class="fa-solid fa-layer-group"></i> Change Level</button>
      <button id="zoom-in"><i class="fa-solid fa-plus"></i> Zoom In</button>
      <button id="zoom-out"><i class="fa-solid fa-minus"></i> Zoom Out</button>
      <button id="reset-view"><i class="fa-solid fa-rotate-left"></i> Reset</button>
      <span class="zoom-display">Zoom: <span id="zoom-percent">100%</span></span>
    </div>
    <div class="map-wrapper" id="map-wrapper">
      <div class="spinner" id="map-spinner" style="display:none;"></div>
      <img id="campus-map" src="MapCampus.jpg" alt="Campus Map" /> </div>
  `;
  
  // Initialize zoom/position display and button states
  updateZoomView();

  // 2. Map Controls (Zoom In/Out/Reset) event listeners
  document.getElementById("zoom-in").addEventListener("click", () => {
    if (currentZoomScale < MAX_ZOOM) {
        currentZoomScale = Math.min(MAX_ZOOM, currentZoomScale + ZOOM_STEP);
        updateZoomView();
    }
  });

  document.getElementById("zoom-out").addEventListener("click", () => {
    if (currentZoomScale > MIN_ZOOM) {
        currentZoomScale = Math.max(MIN_ZOOM, currentZoomScale - ZOOM_STEP);
        if (currentZoomScale === MIN_ZOOM) resetMapView();
        else updateZoomView();
    }
  });

  document.getElementById("reset-view").addEventListener("click", resetMapView);


  // 3. Toggle map sidebar ("Change Level" button) event listener
  document.getElementById("toggle-map-sidebar").addEventListener("click", () => {
    const isOpening = !mapSidebar.classList.contains("active");
    mapSidebar.classList.toggle("active", isOpening);
    sidebar.classList.remove("active");
    overlay.classList.toggle("active", isOpening);
  });

  // 4. Attach Drag, Scroll, and Pinch Functionality
  handleMapInteraction();

  // 5. Ensure the current floor link is active
  if (!document.querySelector('#map-sidebar nav a.active')) {
      document.getElementById("map-campus").classList.add("active"); // SET DEFAULT ACTIVE LINK TO CAMPUS MAP
  }

});

// Trigger home tab on load to initialize content
document.getElementById("home-tab").click();
