
import { supabase } from '../lib/supabase';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  user_type: 'host' | 'guest' | 'both';
  avatar_url?: string | null;
  bio?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParkingSpot {
  id: string;
  owner_id: string;
  title: string;
  description?: string | null;
  spot_type: 'driveway' | 'garage' | 'street' | 'lot' | 'covered';
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  hourly_rate: number;
  daily_rate?: number | null;
  is_available: boolean;
  images: string[];
  amenities: string[];
  instructions?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  spot_id: string;
  guest_id: string;
  host_id: string;
  start_time: string;
  end_time: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  guest_notes?: string | null;
  host_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment?: string | null;
  is_host_review: boolean;
  created_at: string;
}

export interface Vehicle {
  id: string;
  user_id: string;
  make: string;
  model: string;
  license_plate: string;
  color: string;
  created_at: string;
}

class SupabaseService {
  private generateUUID(): string {
    return crypto.randomUUID();
  }

  // Profile methods
  async getCurrentUserProfile(): Promise<Profile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data as Profile;
  }

  async updateProfile(updates: Partial<Profile>): Promise<Profile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data as Profile;
  }

  // Vehicle methods
  async getMyVehicles(): Promise<Vehicle[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', user.id);

    if (error) throw error;
    return (data || []) as Vehicle[];
  }

  async createVehicle(vehicleData: Omit<Vehicle, 'id' | 'user_id' | 'created_at'>): Promise<Vehicle> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('vehicles')
      .insert({
        id: this.generateUUID(),
        ...vehicleData,
        user_id: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data as Vehicle;
  }

  async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle> {
    const { data, error } = await supabase
      .from('vehicles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Vehicle;
  }

  async deleteVehicle(id: string): Promise<void> {
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Parking spot methods
  async getParkingSpots(filters?: {
    location?: string;
    startDate?: string;
    endDate?: string;
    maxPrice?: number;
  }): Promise<ParkingSpot[]> {
    let query = supabase
      .from('parking_spots')
      .select('*')
      .eq('is_available', true);

    if (filters?.maxPrice) {
      query = query.lte('hourly_rate', filters.maxPrice);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as ParkingSpot[];
  }

  async getParkingSpotById(id: string): Promise<ParkingSpot | null> {
    const { data, error } = await supabase
      .from('parking_spots')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching parking spot:', error);
      return null;
    }

    return data as ParkingSpot;
  }

  async getMyParkingSpots(): Promise<ParkingSpot[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('parking_spots')
      .select('*')
      .eq('owner_id', user.id);

    if (error) throw error;
    return (data || []) as ParkingSpot[];
  }

  async createParkingSpot(spotData: Omit<ParkingSpot, 'id' | 'owner_id' | 'created_at' | 'updated_at'>): Promise<ParkingSpot> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('parking_spots')
      .insert({
        id: this.generateUUID(),
        ...spotData,
        owner_id: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data as ParkingSpot;
  }

  async updateParkingSpot(id: string, updates: Partial<ParkingSpot>): Promise<ParkingSpot> {
    const { data, error } = await supabase
      .from('parking_spots')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as ParkingSpot;
  }

  async deleteParkingSpot(id: string): Promise<void> {
    const { error } = await supabase
      .from('parking_spots')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Booking methods
  async createBooking(bookingData: {
    spot_id: string;
    host_id: string;
    start_time: string;
    end_time: string;
    total_amount: number;
    guest_notes?: string;
  }): Promise<Booking> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        id: this.generateUUID(),
        ...bookingData,
        guest_id: user.id,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return data as Booking;
  }

  async getMyBookings(): Promise<Booking[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .or(`guest_id.eq.${user.id},host_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Booking[];
  }

  async updateBookingStatus(id: string, status: Booking['status']): Promise<Booking> {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Booking;
  }

  // Review methods
  async getReviewsForSpot(spotId?: string): Promise<Review[]> {
    let query = supabase
      .from('reviews')
      .select('*');

    if (spotId) {
      // Get reviews for bookings related to this spot
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('spot_id', spotId);

      if (bookings && bookings.length > 0) {
        const bookingIds = bookings.map(b => b.id);
        query = query.in('booking_id', bookingIds);
      } else {
        return [];
      }
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Review[];
  }

  async createReview(reviewData: {
    booking_id: string;
    reviewee_id: string;
    rating: number;
    comment?: string;
    is_host_review: boolean;
  }): Promise<Review> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        id: this.generateUUID(),
        ...reviewData,
        reviewer_id: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data as Review;
  }

  // Authentication methods
  async signUp(email: string, password: string, fullName: string) {
    if (!fullName || !fullName.trim()) {
      throw new Error('Full name is required');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName.trim()
        }
      }
    });

    if (error) throw error;
    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  // Search and filter methods
  async searchParkingSpots(query: string, filters?: {
    spot_type?: string;
    max_hourly_rate?: number;
    amenities?: string[];
  }): Promise<ParkingSpot[]> {
    let supabaseQuery = supabase
      .from('parking_spots')
      .select('*')
      .eq('is_available', true);

    if (query) {
      supabaseQuery = supabaseQuery.or(`title.ilike.%${query}%,address.ilike.%${query}%,description.ilike.%${query}%`);
    }

    if (filters?.spot_type) {
      supabaseQuery = supabaseQuery.eq('spot_type', filters.spot_type);
    }

    if (filters?.max_hourly_rate) {
      supabaseQuery = supabaseQuery.lte('hourly_rate', filters.max_hourly_rate);
    }

    if (filters?.amenities && filters.amenities.length > 0) {
      supabaseQuery = supabaseQuery.contains('amenities', filters.amenities);
    }

    const { data, error } = await supabaseQuery.order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as ParkingSpot[];
  }
}

export const supabaseService = new SupabaseService();
