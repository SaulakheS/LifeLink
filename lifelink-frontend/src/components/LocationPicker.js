import { MapContainer, TileLayer, useMapEvents, Marker } from "react-leaflet";
import { useState } from "react";

export default function LocationPicker({ setLat, setLon }) {
  const [position, setPosition] = useState(null);

  function LocationMarker() {
    useMapEvents({
      click(e) {
        setPosition(e.latlng);
        setLat(e.latlng.lat);
        setLon(e.latlng.lng);
      },
    });
    return position ? <Marker position={position} /> : null;
  }

  return (
    // FIX: overflow hidden prevents map from breaking out of auth-box width
    <div style={{ width: "100%", overflow: "hidden", borderRadius: "8px", marginTop: "10px" }}>
      <MapContainer
        center={[18.5204, 73.8567]}
        zoom={13}
        style={{ height: "260px", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <LocationMarker />
      </MapContainer>
    </div>
  );
}