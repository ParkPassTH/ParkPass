import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { MapPin, Car, Wifi, Camera, Shield } from 'lucide-react';
import { useParkingSpots } from '../hooks/useSupabase';
import { ParkingSpot } from '../services/supabaseService';
import { SearchFilters } from '../components/SearchFilters';
import { MapPicker } from '../components/MapPicker';

export const HomePage = () => {
  const { spots, loading, error } = useParkingSpots();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSpots, setFilteredSpots] = useState<ParkingSpot[]>([]);
  const [showMap, setShowMap] = useState(true);
  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.0060 });
  const navigate = useNavigate();

  useEffect(() => {
    if (spots.length > 0) {
      setFilteredSpots(spots);
    }
  }, [spots]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    filterSpots(query, spots);
  };

  const handleFilter = (filters: any) => {
    filterSpots(searchQuery, spots, filters);
  };

  const handleFindNearMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMapCenter({ lat: latitude, lng: longitude });
          // Sort spots by distance from user location
          const sortedSpots = [...spots].sort((a, b) => {
            const distA = calculateDistance(latitude, longitude, a.latitude || 0, a.longitude || 0);
            const distB = calculateDistance(latitude, longitude, b.latitude || 0, b.longitude || 0);
            return distA - distB;
          });
          setFilteredSpots(sortedSpots);
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const filterSpots = (query: string, spotsToFilter: ParkingSpot[], filters?: any) => {
    let filtered = spotsToFilter;

    if (query) {
      filtered = filtered.filter(spot => 
        spot.title.toLowerCase().includes(query.toLowerCase()) ||
        spot.address.toLowerCase().includes(query.toLowerCase())
      );
    }

    if (filters) {
      // Apply price filter
      if (filters.priceRange && filters.priceRange[1] < 500) {
        filtered = filtered.filter(spot => 
          spot.hourly_rate <= filters.priceRange[1]
        );
      }

      // Apply availability filter
      if (filters.availableOnly) {
        filtered = filtered.filter(spot => spot.is_available);
      }

      // Apply amenities filter
      if (filters.amenities && filters.amenities.length > 0) {
        filtered = filtered.filter(spot => 
          filters.amenities.some((amenity: string) => 
            spot.amenities?.includes(amenity)
          )
        );
      }

      // Apply sorting
      if (filters.sortBy) {
        switch (filters.sortBy) {
          case 'price_low':
            filtered.sort((a, b) => a.hourly_rate - b.hourly_rate);
            break;
          case 'price_high':
            filtered.sort((a, b) => b.hourly_rate - a.hourly_rate);
            break;
          default:
            break;
        }
      }
    }

    setFilteredSpots(filtered);
  };

  const displaySpots = filteredSpots.length > 0 ? filteredSpots : spots;

  const getSpotTypeIcon = (type: string) => {
    switch (type) {
      case 'garage': return '🏠';
      case 'driveway': return '🚗';
      case 'street': return '🛣️';
      case 'lot': return '🅿️';
      case 'covered': return '☂️';
      default: return '🅿️';
    }
  };

  const getAmenityIcon = (amenity: string) => {
    switch (amenity.toLowerCase()) {
      case 'wifi': return <Wifi className="w-4 h-4" />;
      case 'security camera': return <Camera className="w-4 h-4" />;
      case 'cctv': return <Camera className="w-4 h-4" />;
      case 'security': return <Shield className="w-4 h-4" />;
      default: return <Car className="w-4 h-4" />;
    }
  };

  const handleBookNow = (spotId: string) => {
    navigate(`/book/${spotId}`);
  };

  const handleSpotClick = (spotId: string) => {
    navigate(`/spot/${spotId}`);
  };

  const handleLocationChange = (lat: number, lng: number) => {
    setMapCenter({ lat, lng });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading parking spots...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-red-600">Error loading parking spots: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Find Your Perfect Parking Spot
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              Book private parking spaces from local hosts in your area
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-6 -mt-8 relative z-10">
        <SearchFilters
          onSearch={handleSearch}
          onFilter={handleFilter}
          onFindNearMe={handleFindNearMe}
        />
      </div>

      {/* Map Section */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            Parking Spots Near You
          </h2>
          <Button
            variant="outline"
            onClick={() => setShowMap(!showMap)}
          >
            {showMap ? 'Hide Map' : 'Show Map'}
          </Button>
        </div>
        
        {showMap && (
          <div className="mb-8">
            <MapPicker
              latitude={mapCenter.lat}
              longitude={mapCenter.lng}
              onLocationChange={handleLocationChange}
              height="400px"
            />
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Available Parking Spots
          </h2>
          <p className="text-gray-600">
            {displaySpots.length} spot{displaySpots.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {/* Parking Spots Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displaySpots.map((spot: ParkingSpot) => (
            <Card key={spot.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
              <div className="relative" onClick={() => handleSpotClick(spot.id)}>
                {spot.images && spot.images.length > 0 ? (
                  <img
                    src={spot.images[0]}
                    alt={spot.title}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                    <span className="text-4xl">{getSpotTypeIcon(spot.spot_type)}</span>
                  </div>
                )}
                {spot.is_available ? (
                  <Badge className="absolute top-2 right-2 bg-green-500">
                    Available
                  </Badge>
                ) : (
                  <Badge className="absolute top-2 right-2 bg-red-500">
                    Unavailable
                  </Badge>
                )}
              </div>
              
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div onClick={() => handleSpotClick(spot.id)}>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {spot.title}
                    </h3>
                    <div className="flex items-center text-gray-600 mb-2">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span className="text-sm">{spot.address}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl font-bold text-blue-600">
                        ${spot.hourly_rate}
                      </span>
                      <span className="text-gray-600">/hour</span>
                    </div>
                    {spot.daily_rate && (
                      <div className="text-sm text-gray-600">
                        ${spot.daily_rate}/day
                      </div>
                    )}
                  </div>

                  {spot.description && (
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {spot.description}
                    </p>
                  )}

                  {/* Amenities */}
                  {spot.amenities && spot.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {spot.amenities.slice(0, 3).map((amenity, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          <span className="mr-1">{getAmenityIcon(amenity)}</span>
                          {amenity}
                        </Badge>
                      ))}
                      {spot.amenities.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{spot.amenities.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}

                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={!spot.is_available}
                    onClick={() => handleBookNow(spot.id)}
                  >
                    {spot.is_available ? 'Book Now' : 'Unavailable'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {displaySpots.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <MapPin className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No parking spots found
            </h3>
            <p className="text-gray-600">
              Try adjusting your search criteria or check back later for new listings.
            </p>
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600 text-white py-16">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h2 className="text-3xl font-bold mb-4">
            Have a parking space to rent?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Start earning money by sharing your unused parking space with others.
          </p>
          <Button 
            size="lg" 
            variant="secondary" 
            className="bg-white text-blue-600 hover:bg-gray-100"
            onClick={() => navigate('/admin/add-spot')}
          >
            List Your Space
          </Button>
        </div>
      </div>
    </div>
  );
};