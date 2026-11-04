/**
 * Helper utilitas GeoJSON dan Poligon untuk Leaflet di Frontend
 */

/**
 * Validasi dan parse GeoJSON poligon menjadi format Leaflet atau GeoJSON object yang aman
 */
export function parseGeoJSON(data) {
  if (!data) return null;

  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;

    if (!parsed) return null;

    // Jika sudah FeatureCollection atau Feature
    if (parsed.type === 'FeatureCollection' || parsed.type === 'Feature') {
      return parsed;
    }

    // Jika Geometry Polygon atau MultiPolygon
    if (parsed.type === 'Polygon' || parsed.type === 'MultiPolygon') {
      return {
        type: 'Feature',
        properties: {},
        geometry: parsed,
      };
    }

    // Jika array koordinat [[lat, lng], ...]
    if (Array.isArray(parsed) && parsed.length >= 3) {
      // Periksa apakah format [lat, lng] atau [lng, lat]
      const isLngFirst = Math.abs(parsed[0][0]) > 60 && Math.abs(parsed[0][1]) <= 60;
      const coordinates = parsed.map((p) => (isLngFirst ? [p[0], p[1]] : [p[1], p[0]]));
      
      // Pastikan poligon tertutup
      const first = coordinates[0];
      const last = coordinates[coordinates.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        coordinates.push(first);
      }

      return {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [coordinates],
        },
      };
    }

    return null;
  } catch (err) {
    console.warn('[geoJsonUtil] Gagal mem-parse GeoJSON:', err);
    return null;
  }
}

/**
 * Generate poligon GeoJSON teratur mengelilingi titik pusat dengan radius km tertentu
 */
export function generateGeoJsonCircle(centerLat, centerLng, radiusKm, pointsCount = 24) {
  const coordinates = [];
  const earthRadius = 6371; // km

  for (let i = 0; i < pointsCount; i++) {
    const angle = (i * 360) / pointsCount;
    const rad = (angle * Math.PI) / 180;

    const latRad = (centerLat * Math.PI) / 180;
    const lngRad = (centerLng * Math.PI) / 180;

    const distRatio = radiusKm / earthRadius;

    const pointLatRad = Math.asin(
      Math.sin(latRad) * Math.cos(distRatio) +
        Math.cos(latRad) * Math.sin(distRatio) * Math.cos(rad)
    );

    const pointLngRad =
      lngRad +
      Math.atan2(
        Math.sin(rad) * Math.sin(distRatio) * Math.cos(latRad),
        Math.cos(distRatio) - Math.sin(latRad) * Math.sin(pointLatRad)
      );

    const pLat = Number(((pointLatRad * 180) / Math.PI).toFixed(6));
    const pLng = Number(((pointLngRad * 180) / Math.PI).toFixed(6));

    coordinates.push([pLng, pLat]); // GeoJSON standar: [longitude, latitude]
  }

  // Tutup poligon
  coordinates.push(coordinates[0]);

  return {
    type: 'Feature',
    properties: {
      generatedFrom: 'radius',
      radiusKm,
    },
    geometry: {
      type: 'Polygon',
      coordinates: [coordinates],
    },
  };
}

/**
 * Cek apakah titik [latitude, longitude] berada di dalam poligon
 */
export function isPointInPolygonClient(lat, lng, geoJsonData) {
  const feature = parseGeoJSON(geoJsonData);
  if (!feature || !feature.geometry) return true;

  const { coordinates, type } = feature.geometry;

  if (type === 'Polygon') {
    return rayCastingRing(lat, lng, coordinates[0]);
  } else if (type === 'MultiPolygon') {
    return coordinates.some((polyRings) => rayCastingRing(lat, lng, polyRings[0]));
  }

  return true;
}

function rayCastingRing(lat, lng, ring) {
  if (!ring || ring.length < 3) return true;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0]; // Longitude
    const yi = ring[i][1]; // Latitude
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}


/**
 * Membulatkan koordinat GeoJSON ke 6 desimal (~10cm) agar payload ringan dan cepat di-render
 */
export function cleanGeoJsonCoordinates(geom, precision = 6) {
  if (!geom) return null;
  const factor = Math.pow(10, precision);

  function roundCoords(coords) {
    if (!Array.isArray(coords)) return coords;
    if (typeof coords[0] === 'number') {
      return [
        Math.round(coords[0] * factor) / factor,
        Math.round(coords[1] * factor) / factor,
      ];
    }
    return coords.map(roundCoords);
  }

  const cloned = JSON.parse(JSON.stringify(geom));
  if (cloned.coordinates) {
    cloned.coordinates = roundCoords(cloned.coordinates);
  } else if (cloned.geometry && cloned.geometry.coordinates) {
    cloned.geometry.coordinates = roundCoords(cloned.geometry.coordinates);
  }
  return cloned;
}
