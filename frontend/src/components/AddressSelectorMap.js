import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default Leaflet icon paths in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

export default function AddressSelectorMap({ label, defaultLat, defaultLng, onLocationSelect }) {
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimer = useRef(null);

  useEffect(() => {
    // Initialize map only once
    if (!mapInstance.current) {
      const initialLat = defaultLat || 22.5726; // Default Kolkata
      const initialLng = defaultLng || 88.3639;

      const map = L.map(mapContainer.current).setView([initialLat, initialLng], 13);
      mapInstance.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      // Initialize marker if we have default coords
      if (defaultLat && defaultLng) {
        markerRef.current = L.marker([defaultLat, defaultLng]).addTo(map);
      }

      // Handle map clicks
      map.on("click", async (e) => {
        const { lat, lng } = e.latlng;
        updateMapAndMarker(lat, lng);
        
        setLoading(true);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const data = await res.json();
          const address = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          setQuery(address);
          onLocationSelect({
            lat: lat.toFixed(6),
            lng: lng.toFixed(6),
            address: address,
          });
        } catch (err) {
          const address = `Selected (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
          setQuery(address);
          onLocationSelect({
            lat: lat.toFixed(6),
            lng: lng.toFixed(6),
            address: address,
          });
        } finally {
          setLoading(false);
        }
      });
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []); // Empty dependency array to run once on mount

  const updateMapAndMarker = (lat, lng) => {
    if (mapInstance.current) {
      mapInstance.current.flyTo([lat, lng], 15);
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng]).addTo(mapInstance.current);
      }
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    
    if (val.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    debounceTimer.current = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5&countrycodes=in`, {
          headers: {
            "Accept-Language": "en"
          }
        });
        if (!res.ok) throw new Error("API Error");
        const data = await res.json();
        setSuggestions(data);
        setShowSuggestions(true);
      } catch (err) {
        console.error("Geocoding search error", err);
      } finally {
        setLoading(false);
      }
    }, 500);
  };

  const handleSuggestionSelect = (place) => {
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);
    
    setQuery(place.display_name);
    setShowSuggestions(false);
    updateMapAndMarker(lat, lng);
    
    onLocationSelect({
      lat: lat.toFixed(6),
      lng: lng.toFixed(6),
      address: place.display_name,
    });
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      updateMapAndMarker(lat, lng);
      
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await res.json();
        const address = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        setQuery(address);
        onLocationSelect({ lat: lat.toFixed(6), lng: lng.toFixed(6), address });
      } catch (err) {
        const address = `Selected (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        setQuery(address);
        onLocationSelect({ lat: lat.toFixed(6), lng: lng.toFixed(6), address });
      } finally {
        setLoading(false);
      }
    }, () => setLoading(false));
  };

  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
        <label style={{ fontSize: "14px", fontWeight: "600", color: "var(--text1)" }}>
          {label} Location
        </label>
        {loading && <span style={{ fontSize: "12px", color: "var(--accent)" }}>Loading...</span>}
      </div>

      <div style={{ position: "relative", marginBottom: "10px", zIndex: 10, display: "flex", gap: "8px" }}>
        <input
          type="text"
          value={query}
          onChange={handleSearchChange}
          placeholder={`Search for ${label.toLowerCase()}...`}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            fontSize: "14px",
            outline: "none",
            boxSizing: "border-box"
          }}
          onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
        />
        <button
          type="button"
          onClick={handleLocateMe}
          title="Fetch My Current Location"
          style={{
            padding: "0 14px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: "var(--surface2)",
            color: "var(--text)",
            cursor: "pointer",
            fontSize: "18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.2s"
          }}
          onMouseEnter={(e) => e.target.style.background = "var(--border)"}
          onMouseLeave={(e) => e.target.style.background = "var(--surface2)"}
        >
          📍
        </button>
        
        {showSuggestions && suggestions.length > 0 && (
          <div style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            maxHeight: "200px",
            overflowY: "auto",
            marginTop: "4px",
            zIndex: 9999
          }}>
            {suggestions.map((place, idx) => (
              <div 
                key={place.place_id || idx}
                onClick={() => handleSuggestionSelect(place)}
                style={{
                  padding: "10px 14px",
                  borderBottom: idx === suggestions.length - 1 ? "none" : "1px solid var(--border)",
                  cursor: "pointer",
                  fontSize: "13px",
                  color: "var(--text)",
                  backgroundColor: "var(--surface2)",
                  transition: "background 0.2s"
                }}
                onMouseEnter={(e) => e.target.style.background = "var(--border)"}
                onMouseLeave={(e) => e.target.style.background = "var(--surface2)"}
              >
                {place.display_name}
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        ref={mapContainer}
        style={{
          height: "250px",
          borderRadius: "12px",
          border: "1px solid var(--border)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          zIndex: 1, // Prevent overlap issues with other elements
        }}
      />
      <div style={{ fontSize: "12px", color: "var(--text3)", marginTop: "6px" }}>
        Search above or click on the map to pin the exact {label.toLowerCase()}.
      </div>
    </div>
  );
}
