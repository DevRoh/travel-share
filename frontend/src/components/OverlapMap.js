import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default icon issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

// Custom Icons for markers
const startIcon1 = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const endIcon1 = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const startIcon2 = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const endIcon2 = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function MapBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

export default function OverlapMap({ origin1, dest1, origin2, dest2, height = "350px" }) {
  const [route1, setRoute1] = useState([]);
  const [route2, setRoute2] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!origin1 || !dest1 || !origin2 || !dest2) return;

    const fetchRoutes = async () => {
      setLoading(true);
      try {
        // Fetch Route 1
        const res1 = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${origin1.lng},${origin1.lat};${dest1.lng},${dest1.lat}?overview=full&geometries=geojson`
        );
        const data1 = await res1.json();
        if (data1.routes && data1.routes.length > 0) {
          const coords1 = data1.routes[0].geometry.coordinates.map((c) => [c[1], c[0]]);
          setRoute1(coords1);
        }

        // Fetch Route 2
        const res2 = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${origin2.lng},${origin2.lat};${dest2.lng},${dest2.lat}?overview=full&geometries=geojson`
        );
        const data2 = await res2.json();
        if (data2.routes && data2.routes.length > 0) {
          const coords2 = data2.routes[0].geometry.coordinates.map((c) => [c[1], c[0]]);
          setRoute2(coords2);
        }
      } catch (err) {
        console.error("Failed to fetch routes for overlap visualizer", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoutes();
  }, [origin1, dest1, origin2, dest2]);

  if (!origin1 || !dest1 || !origin2 || !dest2) return null;

  // Compile all points to calculate fitBounds
  const bounds = [];
  if (route1.length > 0) bounds.push(...route1);
  else {
    bounds.push([origin1.lat, origin1.lng]);
    bounds.push([dest1.lat, dest1.lng]);
  }
  if (route2.length > 0) bounds.push(...route2);
  else {
    bounds.push([origin2.lat, origin2.lng]);
    bounds.push([dest2.lat, dest2.lng]);
  }

  return (
    <div style={{ position: "relative", height, borderRadius: "12px", overflow: "hidden", border: "1px solid var(--border)", zIndex: 1, marginTop: "16px" }}>
      {loading && (
        <div style={{ position: "absolute", top: 10, right: 10, zIndex: 1000, background: "rgba(0,0,0,0.7)", color: "white", padding: "4px 8px", borderRadius: "4px", fontSize: "12px" }}>
          Tracing routes...
        </div>
      )}
      <MapContainer style={{ height: "100%", width: "100%" }} bounds={bounds}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        {/* Trip 1 Markers */}
        <Marker position={[origin1.lat, origin1.lng]} icon={startIcon1}>
          <Popup><strong>Trip 1 Start</strong></Popup>
        </Marker>
        <Marker position={[dest1.lat, dest1.lng]} icon={endIcon1}>
          <Popup><strong>Trip 1 End</strong></Popup>
        </Marker>

        {/* Trip 2 Markers */}
        <Marker position={[origin2.lat, origin2.lng]} icon={startIcon2}>
          <Popup><strong>Trip 2 Start</strong></Popup>
        </Marker>
        <Marker position={[dest2.lat, dest2.lng]} icon={endIcon2}>
          <Popup><strong>Trip 2 End</strong></Popup>
        </Marker>

        {/* Trip 1 Route */}
        {route1.length > 0 && (
          <Polyline
            positions={route1}
            pathOptions={{ color: "#0084ff", weight: 5, opacity: 0.8 }}
          />
        )}

        {/* Trip 2 Route */}
        {route2.length > 0 && (
          <Polyline
            positions={route2}
            pathOptions={{ color: "#ff6b35", weight: 5, opacity: 0.8 }}
          />
        )}

        <MapBounds bounds={bounds} />
      </MapContainer>
    </div>
  );
}
