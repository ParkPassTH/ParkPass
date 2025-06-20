import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart3, 
  QrCode, 
  MapPin, 
  Calendar, 
  Star, 
  DollarSign,
  Users,
  Car,
  Plus,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  ToggleLeft,
  ToggleRight,
  Bell,
  Download,
  Search,
  Filter,
  MoreHorizontal,
  Settings,
  FileText,
  PieChart,
  CalendarDays,
  Save,
  CreditCard,
  Building2,
  Upload,
  Copy
} from 'lucide-react';
import { QRScanner } from '../components/QRScanner';
import { supabaseService } from '../services/supabaseService';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'dashboard' | 'spots' | 'bookings' | 'reviews' | 'reports' | 'settings'>('home');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [parkingSpots, setParkingSpots] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();

  // Payment methods state
  const [paymentMethods, setPaymentMethods] = useState({
    qr_code: {
      enabled: false,
      qr_code_url: '',
      account_name: ''
    },
    bank_account: {
      enabled: false,
      bank_name: '',
      account_number: '',
      account_name: ''
    }
  });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [qrImageFile, setQrImageFile] = useState<File | null>(null);
  const [qrImagePreview, setQrImagePreview] = useState<string>('');

  useEffect(() => {
    loadData();
    loadPaymentMethods();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [spotsData, bookingsData] = await Promise.all([
        supabaseService.getMyParkingSpots(),
        supabaseService.getMyBookings()
      ]);
      setParkingSpots(spotsData);
      setBookings(bookingsData);
      
      // Load reviews for all owner's spots
      if (spotsData.length > 0) {
        const allReviews = [];
        for (const spot of spotsData) {
          const spotReviews = await supabaseService.getReviewsForSpot(spot.id);
          allReviews.push(...spotReviews);
        }
        setReviews(allReviews);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      // Load existing payment methods from database
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('owner_id', profile?.id)
        .eq('is_active', true);

      if (error) throw error;

      if (data && data.length > 0) {
        const qrMethod = data.find(pm => pm.type === 'qr_code');
        const bankMethod = data.find(pm => pm.type === 'bank_transfer');

        setPaymentMethods({
          qr_code: {
            enabled: !!qrMethod,
            qr_code_url: qrMethod?.qr_code_url || '',
            account_name: qrMethod?.account_name || ''
          },
          bank_account: {
            enabled: !!bankMethod,
            bank_name: bankMethod?.bank_name || '',
            account_number: bankMethod?.account_number || '',
            account_name: bankMethod?.account_name || ''
          }
        });
      }
    } catch (err) {
      console.error('Error loading payment methods:', err);
    }
  };

  const handleQrImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      setQrImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setQrImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadQrImage = async (file: File): Promise<string> => {
    try {
      const fileName = `qr-${profile?.id}-${Date.now()}.${file.name.split('.').pop()}`;
      const filePath = `payment-qr-codes/${fileName}`;

      const { data, error } = await supabase.storage
        .from('payment-qr-codes')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('payment-qr-codes')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading QR image:', error);
      throw new Error('Failed to upload QR code image');
    }
  };

  const handlePaymentMethodToggle = (method: 'qr_code' | 'bank_account') => {
    setPaymentMethods(prev => ({
      ...prev,
      [method]: {
        ...prev[method],
        enabled: !prev[method].enabled
      }
    }));
  };

  const handlePaymentMethodSave = async (method: 'qr_code' | 'bank_transfer') => {
    if (!profile?.id) {
      alert('User profile not found');
      return;
    }

    setPaymentLoading(true);
    try {
      let qrCodeUrl = paymentMethods.qr_code.qr_code_url;
      
      // Upload new QR image if provided
      if (method === 'qr_code' && qrImageFile) {
        qrCodeUrl = await uploadQrImage(qrImageFile);
      }

      // Prepare payment method data
      const paymentMethodData = {
        owner_id: profile.id,
        type: method,
        qr_code_url: method === 'qr_code' ? qrCodeUrl : null,
        account_name: method === 'qr_code' ? paymentMethods.qr_code.account_name : paymentMethods.bank_account.account_name,
        bank_name: method === 'bank_transfer' ? paymentMethods.bank_account.bank_name : null,
        account_number: method === 'bank_transfer' ? paymentMethods.bank_account.account_number : null,
        is_active: paymentMethods[method === 'qr_code' ? 'qr_code' : 'bank_account'].enabled
      };

      // Check if payment method already exists
      const { data: existingMethod } = await supabase
        .from('payment_methods')
        .select('id')
        .eq('owner_id', profile.id)
        .eq('type', method)
        .single();

      if (existingMethod) {
        // Update existing payment method
        const { error } = await supabase
          .from('payment_methods')
          .update(paymentMethodData)
          .eq('id', existingMethod.id);

        if (error) throw error;
      } else {
        // Create new payment method
        const { error } = await supabase
          .from('payment_methods')
          .insert(paymentMethodData);

        if (error) throw error;
      }
      
      // Update local state
      if (method === 'qr_code') {
        setPaymentMethods(prev => ({
          ...prev,
          qr_code: {
            ...prev.qr_code,
            qr_code_url: qrCodeUrl
          }
        }));
      }
      
      alert(`${method === 'qr_code' ? 'QR Code' : 'Bank Account'} payment method saved successfully!`);
      setQrImageFile(null);
      setQrImagePreview('');
    } catch (err: any) {
      console.error('Error saving payment method:', err);
      alert(`Failed to save payment method: ${err.message}`);
    } finally {
      setPaymentLoading(false);
    }
  };

  const copyQRCode = () => {
    if (paymentMethods.qr_code.qr_code_url) {
      navigator.clipboard.writeText(paymentMethods.qr_code.qr_code_url);
      alert('QR Code URL copied to clipboard!');
    }
  };

  // Calculate real average rating from reviews
  const calculateAverageRating = () => {
    if (reviews.length === 0) return '0.0';
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    return (totalRating / reviews.length).toFixed(1);
  };

  const stats = [
    { 
      label: 'Today\'s Revenue', 
      value: `$${bookings.filter(b => new Date(b.created_at).toDateString() === new Date().toDateString()).reduce((sum, b) => sum + b.total_cost, 0)}`, 
      change: '+15%', 
      icon: DollarSign, 
      color: 'text-green-600' 
    },
    { 
      label: 'Active Bookings', 
      value: bookings.filter(b => b.status === 'active' || b.status === 'confirmed').length.toString(), 
      change: '+8%', 
      icon: Calendar, 
      color: 'text-blue-600' 
    },
    { 
      label: 'Total Spots', 
      value: parkingSpots.length.toString(), 
      change: '0%', 
      icon: MapPin, 
      color: 'text-purple-600' 
    },
    { 
      label: 'Avg Rating', 
      value: calculateAverageRating(), 
      change: '+0.2', 
      icon: Star, 
      color: 'text-yellow-600' 
    },
  ];

  const todayBookings = bookings.filter(booking => 
    new Date(booking.created_at).toDateString() === new Date().toDateString()
  ).slice(0, 3);

  const handleQRScan = (data: string) => {
    setScanResult(data);
    setShowQRScanner(false);
    console.log('Scanned data:', data);
  };

  const HomeSection = () => (
    <div className="space-y-6">
      {/* QR Scanner Section */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <QrCode className="h-10 w-10 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Entry Validation
          </h3>
          <p className="text-gray-600 mb-6">
            Scan customer QR codes or enter PIN for parking entry validation
          </p>
          <button
            onClick={() => setShowQRScanner(true)}
            className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-lg"
          >
            Open Scanner
          </button>
          
          {scanResult && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-center space-x-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Entry Validated</span>
              </div>
              <p className="text-sm text-green-700 mt-1">Code: {scanResult}</p>
            </div>
          )}
        </div>
      </div>

      {/* Today's Summary */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Today's Bookings</h3>
          <span className="text-sm text-gray-500">{new Date().toLocaleDateString()}</span>
        </div>
        
        <div className="space-y-3">
          {todayBookings.length > 0 ? (
            todayBookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="font-medium text-gray-900">Booking #{booking.id.slice(-6)}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      booking.status === 'active' ? 'bg-green-100 text-green-800' :
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    ${booking.total_cost} • {new Date(booking.start_time).toLocaleTimeString()} - {new Date(booking.end_time).toLocaleTimeString()}
                  </div>
                </div>
                <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                  <MoreHorizontal className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500">
              No bookings today
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-4">
          <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <AlertTriangle className="h-6 w-6 text-orange-600" />
            <span className="font-medium">Report Issue</span>
          </button>
          <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Bell className="h-6 w-6 text-blue-600" />
            <span className="font-medium">Notifications</span>
          </button>
        </div>
      </div>
    </div>
  );

  const DashboardSection = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  stat.color === 'text-green-600' ? 'bg-green-100' :
                  stat.color === 'text-blue-600' ? 'bg-blue-100' :
                  stat.color === 'text-purple-600' ? 'bg-purple-100' :
                  'bg-yellow-100'
                }`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <span className={`text-sm font-medium ${
                  stat.change.startsWith('+') ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {stat.change}
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-gray-600">
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Revenue chart would be here</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Distribution</h3>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Booking distribution chart</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {bookings.slice(0, 4).map((booking, index) => (
            <div key={booking.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className={`w-2 h-2 rounded-full ${
                booking.status === 'confirmed' ? 'bg-blue-600' :
                booking.status === 'completed' ? 'bg-green-600' :
                booking.status === 'cancelled' ? 'bg-red-600' :
                'bg-yellow-600'
              }`}></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Booking #{booking.id.slice(-6)} - {booking.status}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(booking.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const SpotsSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">My Parking Spots</h3>
          <Link
            to="/admin/add-spot"
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Spot</span>
          </Link>
        </div>

        <div className="space-y-4">
          {parkingSpots.length > 0 ? (
            parkingSpots.map((spot) => (
              <div key={spot.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-semibold text-gray-900">{spot.name}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        spot.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {spot.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{spot.address}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>{spot.available_slots}/{spot.total_slots} available</span>
                      <span>•</span>
                      <span>${spot.price}/{spot.price_type}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-600 hover:text-blue-600 transition-colors">
                      <Eye className="h-4 w-4" />
                    </button>
                    <Link
                      to={`/admin/edit-spot/${spot.id}`}
                      className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </Link>
                    <Link
                      to={`/admin/availability/${spot.id}`}
                      className="p-2 text-gray-600 hover:text-purple-600 transition-colors"
                      title="Manage Availability"
                    >
                      <CalendarDays className="h-4 w-4" />
                    </Link>
                    <button className="p-2 text-gray-600 hover:text-blue-600 transition-colors">
                      {spot.is_active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No parking spots found</p>
              <Link
                to="/admin/add-spot"
                className="inline-flex items-center space-x-2 mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Your First Spot</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const BookingsSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Booking Management</h3>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search bookings..."
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <button className="flex items-center space-x-2 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              <Filter className="h-4 w-4" />
              <span>Filter</span>
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Booking ID</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Date & Time</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Amount</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-sm">#{booking.id.slice(-6)}</td>
                  <td className="py-3 px-4 text-gray-600">
                    <div>{new Date(booking.start_time).toLocaleDateString()}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(booking.start_time).toLocaleTimeString()} - {new Date(booking.end_time).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      booking.status === 'active' ? 'bg-green-100 text-green-800' :
                      booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-gray-900">${booking.total_cost}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-1">
                      <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                        <Eye className="h-4 w-4 text-gray-500" />
                      </button>
                      {booking.status === 'active' && (
                        <button className="p-1 hover:bg-red-100 rounded transition-colors">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const ReviewsSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Reviews & Feedback</h3>
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{calculateAverageRating()}</div>
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < Math.floor(parseFloat(calculateAverageRating())) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                ))}
              </div>
              <div className="text-sm text-gray-500">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
        </div>
        
        {reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold text-gray-900">
                        {review.is_anonymous ? 'Anonymous Customer' : 'Customer Review'}
                      </span>
                      <div className="flex items-center">
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
                      <span className="text-sm font-medium text-gray-700">
                        {review.rating}/5
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {review.comment && (
                  <p className="text-gray-700 mb-3">{review.comment}</p>
                )}
                {review.photos && review.photos.length > 0 && (
                  <div className="flex space-x-2 mb-3">
                    {review.photos.map((photo, index) => (
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
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Star className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No reviews yet</p>
            <p className="text-sm">Reviews will appear here once customers start rating your parking spots</p>
          </div>
        )}
      </div>
    </div>
  );

  const ReportsSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Reports & Analytics</h3>
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Download className="h-4 w-4" />
            <span>Export Report</span>
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-900">Revenue</span>
            </div>
            <div className="text-2xl font-bold text-green-900">
              ${bookings.reduce((sum, b) => sum + b.total_cost, 0)}
            </div>
            <div className="text-sm text-green-700">Total earned</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">Bookings</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">{bookings.length}</div>
            <div className="text-sm text-blue-700">Total bookings</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <MapPin className="h-5 w-5 text-purple-600" />
              <span className="font-medium text-purple-900">Spots</span>
            </div>
            <div className="text-2xl font-bold text-purple-900">{parkingSpots.length}</div>
            <div className="text-sm text-purple-700">Active spots</div>
          </div>
        </div>
      </div>
    </div>
  );

  const SettingsSection = () => (
    <div className="space-y-6">
      {/* Owner Information - Read Only */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Owner Information</h3>
          <div className="text-sm text-gray-500">
            Edit in <Link to="/profile" className="text-blue-600 hover:text-blue-800 font-medium">Profile Page</Link>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
              {profile?.name || 'Not set'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
              {profile?.email || 'Not set'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
              {profile?.phone || 'Not set'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
            <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
              {profile?.business_name || 'Not set'}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Business Address</label>
          <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
            {profile?.business_address || 'Not set'}
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Payment Methods</h3>
        
        <div className="space-y-6">
          {/* QR Code Payment */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <QrCode className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">QR Code Payment</h4>
                  <p className="text-sm text-gray-600">Accept payments via QR code (PromptPay, etc.)</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  paymentMethods.qr_code.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {paymentMethods.qr_code.enabled ? 'Active' : 'Inactive'}
                </span>
                <button
                  onClick={() => handlePaymentMethodToggle('qr_code')}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {paymentMethods.qr_code.enabled ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                </button>
              </div>
            </div>
            
            {paymentMethods.qr_code.enabled && (
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                  <input 
                    type="text" 
                    value={paymentMethods.qr_code.account_name}
                    onChange={(e) => setPaymentMethods(prev => ({
                      ...prev,
                      qr_code: { ...prev.qr_code, account_name: e.target.value }
                    }))}
                    placeholder="Your name or business name"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">QR Code Image</label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleQrImageUpload}
                        className="hidden"
                        id="qr-upload"
                      />
                      <label
                        htmlFor="qr-upload"
                        className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <Upload className="h-4 w-4" />
                        <span>Upload QR Code</span>
                      </label>
                      {(qrImagePreview || paymentMethods.qr_code.qr_code_url) && (
                        <button
                          type="button"
                          onClick={copyQRCode}
                          className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {(qrImagePreview || paymentMethods.qr_code.qr_code_url) && (
                      <div className="flex items-center space-x-3">
                        <img
                          src={qrImagePreview || paymentMethods.qr_code.qr_code_url}
                          alt="QR Code Preview"
                          className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                        />
                        <div className="text-sm text-gray-600">
                          <p>QR Code {qrImagePreview ? 'ready to upload' : 'uploaded successfully'}</p>
                          <p className="text-xs">Customers will see this QR code for payments</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => handlePaymentMethodSave('qr_code')}
                    disabled={paymentLoading}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {paymentLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>Save QR Payment</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bank Account Payment */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Bank Account Transfer</h4>
                  <p className="text-sm text-gray-600">Accept direct bank transfers (Coming Soon)</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Next Phase
                </span>
                <button
                  disabled
                  className="text-gray-400 cursor-not-allowed"
                >
                  <ToggleLeft className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <p className="text-sm text-yellow-800">
                    Bank account payment integration will be available in the next phase of development.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Notification Preferences</h3>
        <div className="space-y-3">
          {[
            { label: 'New Bookings', description: 'Get notified when customers make new bookings' },
            { label: 'Payment Received', description: 'Receive alerts when payments are processed' },
            { label: 'Customer Reviews', description: 'Be notified of new customer reviews' },
            { label: 'System Updates', description: 'Important system and feature updates' },
          ].map((item, index) => (
            <div key={index} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
              <div>
                <p className="font-medium text-gray-900">{item.label}</p>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
          <button 
            onClick={loadData}
            className="mt-2 text-red-600 hover:text-red-800 font-medium"
          >
            Try again
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'home': return <HomeSection />;
      case 'dashboard': return <DashboardSection />;
      case 'spots': return <SpotsSection />;
      case 'bookings': return <BookingsSection />;
      case 'reviews': return <ReviewsSection />;
      case 'reports': return <ReportsSection />;
      case 'settings': return <SettingsSection />;
      default: return <HomeSection />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Parking Owner Dashboard
          </h1>
          <p className="text-gray-600">
            Manage your parking spots and monitor performance
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-md mb-6">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {[
              { id: 'home', label: 'Home', icon: QrCode },
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'spots', label: 'My Spots', icon: MapPin },
              { id: 'bookings', label: 'Bookings', icon: Calendar },
              { id: 'reviews', label: 'Reviews', icon: Star },
              { id: 'reports', label: 'Reports', icon: FileText },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 px-6 font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        {renderContent()}

        {/* QR Scanner Modal */}
        {showQRScanner && (
          <QRScanner
            onScan={handleQRScan}
            onClose={() => setShowQRScanner(false)}
          />
        )}
      </div>
    </div>
  );
};