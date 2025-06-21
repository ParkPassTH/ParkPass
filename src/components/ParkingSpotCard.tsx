import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Star, Car, Clock, Zap } from 'lucide-react';
import { ParkingSpot } from '../types';

interface ParkingSpotCardProps {
  spot: ParkingSpot;
}

export const ParkingSpotCard: React.FC<ParkingSpotCardProps> = ({ spot }) => {
  const navigate = useNavigate();
  
  const formatPrice = (price: number, type: string) => {
    return `$${price}/${type}`;
  };

  const handleBookNow = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent the card click from triggering
    e.stopPropagation(); // Stop event propagation
    navigate(`/book/${spot.id}`);
  };

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden">
      <Link to={`/spot/${spot.id}`} className="block">
        <div className="relative">
          <img
            src={spot.images[0]}
            alt={spot.name}
            className="w-full h-48 object-cover"
          />
          <div className="absolute top-3 right-3 bg-white px-2 py-1 rounded-full text-sm font-semibold text-gray-900">
            {formatPrice(spot.price, spot.priceType)}
          </div>
          <div className="absolute bottom-3 left-3 bg-black bg-opacity-70 text-white px-2 py-1 rounded-full text-xs">
            {spot.availableSlots} / {spot.totalSlots} available
          </div>
        </div>
        
        <div className="p-5">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
              {spot.name}
            </h3>
            <div className="flex items-center space-x-1 text-sm">
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              <span className="text-gray-700">{spot.rating}</span>
              <span className="text-gray-500">({spot.reviewCount})</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 text-gray-600 mb-3">
            <MapPin className="h-4 w-4" />
            <span className="text-sm line-clamp-1">{spot.address}</span>
          </div>

          <div className="flex items-center space-x-1 text-gray-600 mb-4">
            <Clock className="h-4 w-4" />
            <span className="text-sm">{spot.openingHours}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Car className="h-4 w-4 text-blue-600" />
              {spot.amenities.includes('EV Charging') && (
                <Zap className="h-4 w-4 text-green-600" />
              )}
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              spot.availableSlots > 10
                ? 'bg-green-100 text-green-800'
                : spot.availableSlots > 5
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {spot.availableSlots > 10 
                ? 'Available' 
                : spot.availableSlots > 0 
                ? 'Limited' 
                : 'Full'
              }
            </div>
          </div>
          
          <button
            onClick={handleBookNow}
            disabled={spot.availableSlots === 0}
            className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {spot.availableSlots > 0 ? 'Book Now' : 'Full'}
          </button>
        </div>
      </Link>
    </div>
  );
};