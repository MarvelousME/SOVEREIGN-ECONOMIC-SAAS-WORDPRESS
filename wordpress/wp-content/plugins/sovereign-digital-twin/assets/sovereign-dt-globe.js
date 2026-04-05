/**
 * Leaflet + OpenTopoMap for Sovereign Digital Twin member globe.
 */
(function () {
  'use strict';

  function init() {
    var el = document.getElementById('sov-dt-map');
    if (!el || typeof L === 'undefined' || !window.sovDigitalTwin || !sovDigitalTwin.restMarkers) {
      return;
    }

    var map = L.map(el, {
      scrollWheelZoom: true,
      worldCopyJump: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 17,
      attribution:
        'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
    }).addTo(map);

    map.setView([20, 0], 2);

    fetch(sovDigitalTwin.restMarkers, { credentials: 'same-origin' })
      .then(function (r) {
        return r.json();
      })
      .then(function (markers) {
        if (!Array.isArray(markers) || markers.length === 0) {
          map.setView([20, 0], 2);
          return;
        }
        var group = [];
        markers.forEach(function (m) {
          if (typeof m.lat !== 'number' || typeof m.lng !== 'number') {
            return;
          }
          var icon = L.divIcon({
            className: 'sov-dt-map-marker',
            html:
              '<span class="sov-dt-map-marker-inner"><img src="' +
              String(m.image || '').replace(/"/g, '&quot;') +
              '" alt="" width="40" height="40" loading="lazy" decoding="async"/></span>',
            iconSize: [48, 48],
            iconAnchor: [24, 24],
            popupAnchor: [0, -20],
          });
          var marker = L.marker([m.lat, m.lng], { icon: icon });
          var label = (m.label || 'Member').replace(/</g, '&lt;');
          var city = (m.city || '').replace(/</g, '&lt;');
          marker.bindPopup('<strong>' + label + '</strong>' + (city ? '<br/>' + city : ''));
          marker.addTo(map);
          group.push(marker);
        });
        if (group.length) {
          map.fitBounds(L.featureGroup(group).getBounds().pad(0.15));
        }
      })
      .catch(function () {
        map.setView([20, 0], 2);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
