import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Star, 
  Phone, 
  Clock, 
  Car, 
  Heart, 
  Navigation,
  Zap,
  Shield,
  Umbrella,
  ArrowLeft,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ParkingSpot } from '../lib/supabase';
import { ParkingSpotCarousel } from '../components/ParkingSpotCarousel';

export const ParkingSpotDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isFavorited, setIsFavorited] = useState(false);
  const [spot, setSpot] = useState<ParkingSpot | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSpotDetails = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        // Fetch the parking spot details
        const { data: spotData, error: spotError } = await supabase
          .from('parking_spots')
          .select('*')
          .eq('id', id)
          .single();

        if (spotError) throw spotError;
        
        setSpot(spotData);
        
        // Fetch reviews for this spot
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select(`
            id,
            rating,
            comment,
            photos,
            is_anonymous,
            created_at,
            profiles:user_id (name)
          `)
          .eq('spot_id', id);
          
        if (reviewsError) throw reviewsError;
        
        setReviews(reviewsData || []);
      } catch (err: any) {
        console.error('Error fetching spot details:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSpotDetails();
  }, [id]);

  const handleBookNow = () => {
    if (spot) {
      navigate(`/book/${spot.id}`);
    }
  };

  const handleNavigate = () => {
    if (spot && spot.latitude && spot.longitude) {
      // Open in Google Maps
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${spot.latitude},${spot.longitude}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !spot) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Parking spot not found
          </h2>
          <Link to="/" className="text-blue-600 hover:text-blue-800">
            Return to home
          </Link>
        </div>
      </div>
    );
  }

  const formatPrice = (price: number, type: string) => {
    return `$${price}/${type}`;
  };

  const getAmenityIcon = (amenity: string) => {
    switch (amenity.toLowerCase()) {
      case 'ev charging': return <Zap className="h-5 w-5 text-green-600" />;
      case 'cctv security': return <Shield className="h-5 w-5 text-blue-600" />;
      case 'covered parking': return <Umbrella className="h-5 w-5 text-purple-600" />;
      default: return <Car className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Link to="/" className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors">
          <ArrowLeft className="h-5 w-5" />
          <span>Back to search</span>
        </Link>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Image Gallery */}
          <div className="relative">
            {spot.images && spot.images.length > 0 ? (
              <ParkingSpotCarousel images={spot.images} alt={spot.name} />
            ) : (
              <div className="w-full h-64 md:h-80 bg-gray-200 flex items-center justify-center">
                <Car className="h-16 w-16 text-gray-400" />
              </div>
            )}
            <div className="absolute top-4 right-4 bg-white px-3 py-2 rounded-full font-semibold text-lg">
              {formatPrice(spot.price, spot.price_type)}
            </div>
          </div>

          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {spot.name}
                </h1>
                <div className="flex items-center space-x-1 text-gray-600 mb-2">
                  <MapPin className="h-5 w-5" />
                  <span>{spot.address}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <Star className="h-5 w-5 text-yellow-400 fill-current" />
                    <span className="font-semibold">{spot.rating || '0.0'}</span>
                    <span className="text-gray-500">({spot.review_count || 0} reviews)</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsFavorited(!isFavorited)}
                className={`p-3 rounded-full transition-colors ${
                  isFavorited 
                    ? 'bg-red-100 text-red-600' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Heart className={`h-6 w-6 ${isFavorited ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* Quick Info */}
            <div className="grid md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-sm text-gray-600 mb-1">
                  <Clock className="h-4 w-4" />
                  <span>Opening & Closing Times</span>
                </div>
                <div className="font-semibold">
                  {typeof spot.operating_hours === 'string' 
                    ? spot.operating_hours 
                    : spot.operating_hours?.["24_7"] 
                      ? "24/7" 
                      : "Check details"}
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-sm text-gray-600 mb-1">
                  <Car className="h-4 w-4" />
                  <span>Available</span>
                </div>
                <div className="font-semibold">
                  {spot.available_slots} / {spot.total_slots} spots
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-sm text-gray-600 mb-1">
                  <Phone className="h-4 w-4" />
                  <span>Contact</span>
                </div>
                <div className="font-semibold">Contact Owner</div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                About this parking spot
              </h3>
              <p className="text-gray-600">{spot.description || 'No description provided.'}</p>
            </div>

            {/* Amenities */}
            {spot.amenities && spot.amenities.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Amenities
                </h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {spot.amenities.map((amenity, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      {getAmenityIcon(amenity)}
                      <span className="text-gray-700">{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Reviews
              </h3>
              <div className="space-y-4">
                {reviews.length > 0 ? (
                  reviews.map((review) => (
                    <div key={review.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-gray-900">
                            {review.is_anonymous ? 'Anonymous User' : review.profiles?.name || 'User'}
                          </span>
                          <div className="flex items-center space-x-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {review.comment && <p className="text-gray-700">{review.comment}</p>}
                      {review.photos && review.photos.length > 0 && (
                        <div className="flex space-x-2 mt-2">
                          {review.photos.map((photo: string, index: number) => (
                            <img
                              key={index}
                              src={photo}
                              alt={`Review photo ${index + 1}`}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <Star className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No reviews yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col md:flex-row gap-4">
              <button
                onClick={handleBookNow}
                disabled={spot.available_slots === 0}
                className="flex-1 bg-blue-600 text-white text-center py-4 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {spot.available_slots > 0 ? 'Book Now' : 'No Spots Available'}
              </button>
              <button 
                onClick={handleNavigate}
                className="flex items-center justify-center space-x-2 px-6 py-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
              >
                <Navigation className="h-5 w-5" />
                <span>Navigate</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};