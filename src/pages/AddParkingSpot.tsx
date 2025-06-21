import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { OpeningHours }  from '../components/OpeningHours';
import { 
  ArrowLeft, MapPin, Clock, DollarSign, Camera, Plus, X,
  Car, Zap, Shield, Umbrella, Wifi, Coffee, Wrench
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { MapPicker } from '../components/MapPicker';

export const AddParkingSpot: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    totalSlots: 1,
    priceType: 'hour' as 'hour' | 'day' | 'month',
    price: 0,
    phone: '',
    amenities: [] as string[],
    images: [] as string[],
    operatingHours: {
      monday: { open: '00:00', close: '23:59', closed: false },
      tuesday: { open: '00:00', close: '23:59', closed: false },
      wednesday: { open: '00:00', close: '23:59', closed: false },
      thursday: { open: '00:00', close: '23:59', closed: false },
      friday: { open: '00:00', close: '23:59', closed: false },
      saturday: { open: '00:00', close: '23:59', closed: false },
      sunday: { open: '00:00', close: '23:59', closed: false },
    },
    features: {
      allowExtensions: true,
      requireQREntry: true,
      plateRestriction: false,
      valetService: false,
      carWash: false,
    }
  });

  const [openingHours, setOpeningHours] = useState('');
  const [coordinates, setCoordinates] = useState({ lat: 40.7128, lng: -74.0060 });
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  const availableAmenities = [
    { id: 'ev-charging', name: 'EV Charging', icon: Zap },
    { id: 'cctv', name: 'CCTV Security', icon: Shield },
    { id: 'covered', name: 'Covered Parking', icon: Umbrella },
    { id: 'wifi', name: 'Free WiFi', icon: Wifi },
    { id: 'cafe', name: 'Cafe Nearby', icon: Coffee },
    { id: 'maintenance', name: 'Car Maintenance', icon: Wrench },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleAmenityToggle = (amenityId: string) => {
    const amenity = availableAmenities.find(a => a.id === amenityId);
    if (!amenity) return;
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity.name)
        ? prev.amenities.filter(a => a !== amenity.name)
        : [...prev.amenities, amenity.name]
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const imageUrls = files.map(file => URL.createObjectURL(file));
      setUploadedImages(imageUrls);
    }
  };

  const handleOperatingHoursChange = (day: string, field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: {
          ...prev.operatingHours[day as keyof typeof prev.operatingHours],
          [field]: value
        }
      }
    }));
  };

  const handleFeatureToggle = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [feature]: !prev.features[feature as keyof typeof prev.features]
      }
    }));
  };

  const handleLocationChange = (lat: number, lng: number, address?: string) => {
    setCoordinates({ lat, lng });
    if (address) {
      setFormData(prev => ({
        ...prev,
        address
      }));
    }
  };

  const addImageUrl = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, url]
      }));
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile) {
      alert('You must be logged in to add a parking spot.');
      return;
    }

    const newSpot = {
      owner_id: profile.id,
      name: formData.name,
      description: formData.description,
      address: formData.address,
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      total_slots: formData.totalSlots,
      available_slots: formData.totalSlots,
      price_type: formData.priceType,
      price: formData.price,
      amenities: formData.amenities,
      images: formData.images,
      operating_hours: formData.operatingHours,
      is_active: true,
      // Optionally, add features if you store them in DB
    };

    try {
      const { error } = await supabase
        .from('parking_spots')
        .insert([newSpot]);
      if (error) throw error;
      navigate('/admin');
    } catch (error: any) {
      console.error("Error adding parking spot:", error.message);
      alert("Failed to add parking spot: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button 
          onClick={() => navigate('/admin')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Dashboard</span>
        </button>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Add New Parking Spot
            </h1>
            <p className="text-gray-600">
              Fill in the details to create a new parking spot listing
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parking Spot Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Central Plaza Parking"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+1 (555) 123-4567"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Describe your parking spot, its features, and any important information..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Location on Map</label>
              <MapPicker
                latitude={coordinates.lat}
                longitude={coordinates.lng}
                onLocationChange={handleLocationChange}
              />
              <div className="text-sm text-gray-600">
                Current coordinates: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
              </div>
            </div>

            {/* Pricing & Capacity */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Pricing & Capacity
              </h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price *
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="25.00"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Type *
                  </label>
                  <select
                    name="priceType"
                    value={formData.priceType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="hour">Per Hour</option>
                    <option value="day">Per Day</option>
                    <option value="month">Per Month</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Parking Slots *
                  </label>
                  <input
                    type="number"
                    name="totalSlots"
                    value={formData.totalSlots}
                    onChange={handleInputChange}
                    min="1"
                    placeholder="50"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            <OpeningHours value={openingHours} onChange={setOpeningHours} />

            {/* Amenities */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Amenities</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableAmenities.map((amenity) => {
                  const Icon = amenity.icon;
                  const isSelected = formData.amenities.includes(amenity.name);
                  return (
                    <button
                      key={amenity.id}
                      type="button"
                      onClick={() => handleAmenityToggle(amenity.id)}
                      className={`flex items-center space-x-3 p-4 border-2 rounded-lg transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{amenity.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Images */}
            <div className="space-y-2">
              <Label htmlFor="images">Photos</Label>
              <Input
                id="images"
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
              />
              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                  {uploadedImages.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`Preview ${index + 1}`}
                      className="h-24 w-full object-cover rounded-md border"
                    />
                  ))}
                </div>
              )}
              <p className="text-sm text-gray-600">
                Upload clear photos of your parking spot to attract more bookings
              </p>
            </div>

            {/* Features */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Features & Settings</h3>
              <div className="space-y-4">
                {Object.entries(formData.features).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-gray-900">
                        {key === 'allowExtensions' && 'Allow Time Extensions'}
                        {key === 'requireQREntry' && 'Require QR Code Entry'}
                        {key === 'plateRestriction' && 'License Plate Restriction'}
                        {key === 'valetService' && 'Valet Service Available'}
                        {key === 'carWash' && 'Car Wash Service'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {key === 'allowExtensions' && 'Users can extend their parking time'}
                        {key === 'requireQREntry' && 'Entry requires QR code or PIN validation'}
                        {key === 'plateRestriction' && 'Restrict access to registered license plates only'}
                        {key === 'valetService' && 'Professional valet parking service'}
                        {key === 'carWash' && 'On-site car washing services'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={() => handleFeatureToggle(key)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-6">
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="flex-1 border border-gray-200 py-3 px-6 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Create Parking Spot
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};