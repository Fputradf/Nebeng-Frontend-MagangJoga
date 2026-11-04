/**
 * Utility untuk memproses polyline rute jalan raya (GeoJSON LineString)
 * dari OSRM ke format koordinat Leaflet [lat, lng].
 */
export function parseRoutePolyline(mapsPolyline, fallbackOrigin, fallbackDest) {
  if (mapsPolyline) {
    try {
      let data = mapsPolyline;
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }

      // GeoJSON Feature or Object with geometry
      if (data && data.geometry) {
        data = data.geometry;
      }

      // GeoJSON LineString: { type: 'LineString', coordinates: [[lng, lat], ...] }
      if (data && Array.isArray(data.coordinates) && data.coordinates.length > 0) {
        const leafletCoords = data.coordinates
          .map(([lng, lat]) => {
            const numLat = Number(lat);
            const numLng = Number(lng);
            if (!isNaN(numLat) && !isNaN(numLng)) {
              return [numLat, numLng];
            }
            return null;
          })
          .filter(Boolean);

        if (leafletCoords.length > 0) {
          return leafletCoords;
        }
      }

      // Direct array format: [[lat, lng], ...]
      if (Array.isArray(data) && data.length > 0) {
        const validCoords = data
          .map((pt) => {
            if (Array.isArray(pt) && pt.length >= 2) {
              const numLat = Number(pt[0]);
              const numLng = Number(pt[1]);
              if (!isNaN(numLat) && !isNaN(numLng)) {
                return [numLat, numLng];
              }
            } else if (pt && typeof pt === 'object' && pt.lat != null && pt.lng != null) {
              return [Number(pt.lat), Number(pt.lng)];
            }
            return null;
          })
          .filter(Boolean);

        if (validCoords.length > 0) {
          return validCoords;
        }
      }
    } catch (err) {
      console.warn('Gagal mem-parsing mapsPolyline:', err);
    }
  }

  // Fallback: 2 titik pos asal & pos tujuan
  const oLat = Number(fallbackOrigin?.lat ?? fallbackOrigin?.latitude);
  const oLng = Number(fallbackOrigin?.lng ?? fallbackOrigin?.longitude);
  const dLat = Number(fallbackDest?.lat ?? fallbackDest?.latitude);
  const dLng = Number(fallbackDest?.lng ?? fallbackDest?.longitude);

  if (!isNaN(oLat) && !isNaN(oLng) && !isNaN(dLat) && !isNaN(dLng) && oLat !== 0 && dLat !== 0) {
    return [
      [oLat, oLng],
      [dLat, dLng],
    ];
  }

  return [];
}

