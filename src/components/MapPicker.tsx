
import React, { useEffect, useRef } from 'react';

// Dynamic import for leaflet to avoid SSR issues
let L: any = null;

const loadLeaflet = async () => {
  if (typeof window !== 'undefined' && !L) {
    try {
      const leafletModule = await import('leaflet');
      L = leafletModule.default;
      
      // Import CSS dynamically
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(cssLink);
      
      // Fix for default markers in Leaflet
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });
    } catch (error) {
      console.error('Failed to load Leaflet:', error);
      return null;
    }
  }
  return L;
};

interface MapPickerProps {
  latitude?: number;
  longitude?: number;
  onLocationChange: (lat: number, lng: number) => void;
  height?: string;
}

export const MapPicker: React.FC<MapPickerProps> = ({
  latitude = 40.7128,
  longitude = -74.0060,
  onLocationChange,
  height = '400px'
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current) return;
      
      const leaflet = await loadLeaflet();
      if (!leaflet) {
        console.error('Leaflet failed to load');
        return;
      }

      // Initialize map
      mapInstanceRef.current = leaflet.map(mapRef.current).setView([latitude, longitude], 13);

      // Add tile layer
      leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);

      // Add initial marker
      markerRef.current = leaflet.marker([latitude, longitude], {
        draggable: true
      }).addTo(mapInstanceRef.current);

      // Handle marker drag
      markerRef.current.on('dragend', (e: any) => {
        const marker = e.target;
        const position = marker.getLatLng();
        onLocationChange(position.lat, position.lng);
      });

      // Handle map click
      mapInstanceRef.current.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
          onLocationChange(lat, lng);
        }
      });
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
      mapInstanceRef.current.setView([latitude, longitude], 13);
    }
  }, [latitude, longitude]);

  return (
    <div className="space-y-2">
      <div 
        ref={mapRef} 
        style={{ height }} 
        className="w-full rounded-lg border border-gray-200"
      />
      <p className="text-sm text-gray-600">
        Click on the map or drag the marker to set your parking spot location
      </p>
    </div>
  );
};
