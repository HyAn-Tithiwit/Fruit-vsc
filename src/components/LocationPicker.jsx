import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet'; // Import L để sửa lỗi icon

// Sửa lỗi icon marker bị thiếu của Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Component con để xử lý sự kiện click
function LocationFinder({ onPositionChange }) {
  const map = useMapEvents({
    click(e) {
      onPositionChange(e.latlng); // Gửi tọa độ mới về
      map.flyTo(e.latlng, map.getZoom()); // Bay camera đến vị trí
    },
  });
  return null;
}

function DraggableMarker({ position, onPositionChange }) {
  const [draggable, setDraggable] = useState(true);
  const [currentPosition, setCurrentPosition] = useState(position);
  const markerRef = useRef(null);

  // Cập nhật vị trí nội bộ nếu prop từ cha thay đổi
  useEffect(() => {
    setCurrentPosition(position);
  }, [position]);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const newPos = marker.getLatLng();
          onPositionChange(newPos); // Gửi tọa độ mới về
          setCurrentPosition(newPos);
        }
      },
    }),
    [onPositionChange],
  );

  return (
    <Marker
      draggable={draggable}
      eventHandlers={eventHandlers}
      position={currentPosition}
      ref={markerRef}>
      <Popup>Kéo thả ghim, hoặc nhấp vào bản đồ<br /> để chọn vị trí chính xác.</Popup>
    </Marker>
  );
}

function LocationPicker({ initialPosition, onPositionChange }) {
  const [position, setPosition] = useState(initialPosition);

  // Cập nhật vị trí nội bộ khi prop thay đổi
  useEffect(() => {
    setPosition(initialPosition);
  }, [initialPosition]);

  const handlePositionChange = (newPos) => {
    setPosition(newPos); // Cập nhật vị trí trên bản đồ
    onPositionChange(newPos); // Gửi data về cho EditProfilePage
  };

  return (
    <MapContainer 
      center={position} 
      zoom={13} 
      scrollWheelZoom={true} 
      style={{ height: '300px', width: '100%', borderRadius: '8px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <DraggableMarker 
        position={position} 
        onPositionChange={handlePositionChange} 
      />
      <LocationFinder onPositionChange={handlePositionChange} />
    </MapContainer>
  );
}

export default LocationPicker;