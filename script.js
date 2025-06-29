document.addEventListener('DOMContentLoaded', function() {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('sidebar-toggle');
  if (toggle && sidebar) {
    toggle.addEventListener('click', function() {
      sidebar.classList.toggle('collapsed');
      if (sidebar.classList.contains('collapsed')) {
        toggle.textContent = '→';
      } else {
        toggle.textContent = '☰';
      }
    });
  }
  // Map zoom logic
  const map = document.getElementById('map');
  let mapScale = 1;
  const minScale = 0.5;
  const maxScale = 2.5;
  const zoomIn = document.getElementById('zoom-in');
  const zoomOut = document.getElementById('zoom-out');
  function updateMapScale() {
    map.style.transform = `scale(${mapScale})`;
  }
  if (zoomIn) {
    zoomIn.addEventListener('click', function() {
      mapScale = Math.min(mapScale + 0.2, maxScale);
      updateMapScale();
    });
  }
  if (zoomOut) {
    zoomOut.addEventListener('click', function() {
      mapScale = Math.max(mapScale - 0.2, minScale);
      updateMapScale();
    });
  }
  // Mouse wheel zoom
  map.addEventListener('wheel', function(e) {
    e.preventDefault();
    if (e.deltaY < 0) {
      mapScale = Math.min(mapScale + 0.1, maxScale);
    } else {
      mapScale = Math.max(mapScale - 0.1, minScale);
    }
    updateMapScale();
  }, { passive: false });
  // Pinch zoom for touch devices
  let lastDist = null;
  map.addEventListener('touchmove', function(e) {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastDist) {
        const delta = dist - lastDist;
        if (Math.abs(delta) > 2) {
          if (delta > 0) {
            mapScale = Math.min(mapScale + 0.04, maxScale);
          } else {
            mapScale = Math.max(mapScale - 0.04, minScale);
          }
          updateMapScale();
        }
      }
      lastDist = dist;
    }
  }, { passive: false });
  map.addEventListener('touchend', function(e) {
    if (e.touches.length < 2) lastDist = null;
  });

  // Floor button logic: show different map for each button
  const floorButtons = document.querySelectorAll('.floor-buttons button');
  const mapContainer = document.getElementById('map-container');
  const mapSVG = document.getElementById('map');

  // SVGs for each floor (simple demo, replace with real SVGs as needed)
  const floorSVGs = {
    campus: `<rect x="30" y="30" width="340" height="240" rx="30" fill="#e3f2fd" stroke="#1976d2" stroke-width="4"/>
      <text x="200" y="160" text-anchor="middle" font-size="32" fill="#1976d2">Campus Map</text>` ,
    'floor 1': `<rect x="50" y="50" width="300" height="200" rx="24" fill="#fffde7" stroke="#fbc02d" stroke-width="4"/>
      <text x="200" y="160" text-anchor="middle" font-size="28" fill="#fbc02d">Floor 1</text>` ,
    'floor 2': `<ellipse cx="200" cy="150" rx="140" ry="90" fill="#e8f5e9" stroke="#388e3c" stroke-width="4"/>
      <text x="200" y="160" text-anchor="middle" font-size="28" fill="#388e3c">Floor 2</text>` ,
    'floor 3': `<rect x="80" y="80" width="240" height="140" rx="18" fill="#f3e5f5" stroke="#8e24aa" stroke-width="4"/>
      <text x="200" y="160" text-anchor="middle" font-size="28" fill="#8e24aa">Floor 3</text>` ,
    'floor 4': `<polygon points="60,250 200,40 340,250" fill="#e1f5fe" stroke="#0288d1" stroke-width="4"/>
      <text x="200" y="220" text-anchor="middle" font-size="28" fill="#0288d1">Floor 4</text>` ,
    'floor 5': `<rect x="120" y="60" width="160" height="180" rx="12" fill="#ffebee" stroke="#c62828" stroke-width="4"/>
      <text x="200" y="160" text-anchor="middle" font-size="28" fill="#c62828">Floor 5</text>`
  };

  floorButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      let key = btn.textContent.trim().toLowerCase();
      if (key === 'campus') key = 'campus';
      if (floorSVGs[key]) {
        mapSVG.innerHTML = floorSVGs[key];
        mapScale = 1;
        updateMapScale();
      }
    });
  });
});
