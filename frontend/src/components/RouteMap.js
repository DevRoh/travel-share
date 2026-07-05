import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default icons if missing
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

// Custom icons
const startIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
const endIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
const joinerIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
const passengerIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
const stopIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png",
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

export default function RouteMap({ origin, destination, joiners = [], passengerLocation = null, height = "350px", onStopCalculated }) {
  const [suggestedStop, setSuggestedStop] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [passengerRouteCoords, setPassengerRouteCoords] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!origin || !destination) return;

    const fetchRoute = async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`);
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          setRouteCoords(coords);
        }
      } catch (err) {
        console.error("Failed to fetch route", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRoute();
  }, [origin, destination]);

  useEffect(() => {
    if (!passengerLocation || !origin) {
      setPassengerRouteCoords([]);
      setSuggestedStop(null);
      if (onStopCalculated) onStopCalculated(null);
      return;
    }

    let targetLat = origin.lat;
    let targetLng = origin.lng;
    let stopPt = null;

    if (routeCoords.length > 0) {
      let minDist = Infinity;
      for (const coord of routeCoords) {
        const latDiff = coord[0] - passengerLocation.lat;
        const lngDiff = coord[1] - passengerLocation.lng;
        const dist = latDiff * latDiff + lngDiff * lngDiff;
        if (dist < minDist) {
          minDist = dist;
          stopPt = { lat: coord[0], lng: coord[1] };
        }
      }
    }

    if (stopPt) {
      targetLat = stopPt.lat;
      targetLng = stopPt.lng;
      setSuggestedStop(stopPt);
    } else {
      setSuggestedStop(null);
    }

    const fetchPassengerRoute = async () => {
      try {
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${passengerLocation.lng},${passengerLocation.lat};${targetLng},${targetLat}?overview=full&geometries=geojson`);
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          setPassengerRouteCoords(coords);
          
          if (onStopCalculated) {
            onStopCalculated({
              distanceMeters: data.routes[0].distance,
              durationSeconds: data.routes[0].duration,
              lat: targetLat,
              lng: targetLng
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch passenger connection route", err);
      }
    };
    fetchPassengerRoute();
  }, [passengerLocation, origin, routeCoords, onStopCalculated]);

  if (!origin || !destination) return null;

  const bounds = routeCoords.length > 0 
    ? (passengerLocation ? [...routeCoords, [passengerLocation.lat, passengerLocation.lng]] : routeCoords)
    : [
        [origin.lat, origin.lng],
        [destination.lat, destination.lng],
        ...(passengerLocation ? [[passengerLocation.lat, passengerLocation.lng]] : [])
      ];

  return (
    <div style={{ position: "relative", height, borderRadius: "12px", overflow: "hidden", border: "1px solid var(--border)", zIndex: 1 }}>
      {loading && (
        <div style={{ position: "absolute", top: 10, right: 10, zIndex: 1000, background: "rgba(0,0,0,0.7)", color: "white", padding: "4px 8px", borderRadius: "4px", fontSize: "12px" }}>
          Calculating route...
        </div>
      )}
      <MapContainer style={{ height: "100%", width: "100%" }} bounds={bounds}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <Marker position={[origin.lat, origin.lng]} icon={startIcon} />
        <Marker position={[destination.lat, destination.lng]} icon={endIcon} />
        
        {passengerLocation && passengerLocation.lat && passengerLocation.lng && (
          <Marker position={[passengerLocation.lat, passengerLocation.lng]} icon={passengerIcon} />
        )}

        {suggestedStop && (
          <Marker position={[suggestedStop.lat, suggestedStop.lng]} icon={stopIcon}>
            <Popup>
              <strong>Suggested Pickup Stop</strong><br />
              Meet the host at this point along their route.
            </Popup>
          </Marker>
        )}
        
        {joiners.map((j, i) => {
          if (j.lat && j.lng) {
            return <Marker key={i} position={[j.lat, j.lng]} icon={joinerIcon} />;
          }
          return null;
        })}

        {routeCoords.length > 0 && (
          <Polyline 
            positions={routeCoords} 
            pathOptions={{ color: "#0084ff", weight: 5, opacity: 0.8 }} 
          />
        )}

        {passengerRouteCoords.length > 0 && (
          <Polyline 
            positions={passengerRouteCoords} 
            pathOptions={{ color: "#ef4444", weight: 4, dashArray: "5, 8", opacity: 0.9 }} 
          />
        )}
        <MapBounds bounds={bounds} />
      </MapContainer>
    </div>
  );
}
