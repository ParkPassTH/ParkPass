import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: any) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      console.log('Loading profile for user:', userId);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile loading timeout')), 5000);
      });

      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const { data: profile, error } = await Promise.race([profilePromise, timeoutPromise]) as any;

      console.log('Profile query result:', { profile, error });

      if (error) {
        console.error('Error loading profile:', error);
        
        // Handle invalid session or JWT errors
        if (
          error.code === 'PGRST301' || // JWT expired/invalid
          (error.message && error.message.toLowerCase().includes('jwt'))
        ) {
          console.log('JWT error detected, signing out');
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        
        // For other errors or no profile found, create a basic profile
        console.log('Profile not found or error occurred, creating basic profile');
        await createBasicProfile(userId);
        return;
      } else if (!profile) {
        console.log('No profile found, creating basic profile');
        await createBasicProfile(userId);
        return;
      } else {
        console.log('Profile loaded successfully:', profile);
        setProfile(profile);
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      
      // Handle timeout or other errors
      if (error.message === 'Profile loading timeout') {
        console.log('Profile loading timed out, creating basic profile');
        await createBasicProfile(userId);
        return;
      }
      
      // Handle fetch/network errors
      if (error.message && error.message.toLowerCase().includes('jwt')) {
        console.log('JWT error in catch, signing out');
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      
      // Try to create a basic profile for other errors
      console.log('Error loading profile, attempting to create basic profile');
      await createBasicProfile(userId);
    } finally {
      setLoading(false);
    }
  };

  const createBasicProfile = async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found when creating profile');
        setProfile(null);
        return;
      }

      console.log('Creating basic profile for user:', user.email);
      
      // Create a basic profile with available user data
      const basicProfile: Partial<Profile> = {
        id: userId,
        email: user.email || '',
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        phone: user.user_metadata?.phone || null,
        role: user.user_metadata?.role || 'user',
        avatar_url: user.user_metadata?.avatar_url || null,
        business_name: user.user_metadata?.business_name || null,
        business_address: user.user_metadata?.business_address || null,
      };

      console.log('Attempting to insert profile:', basicProfile);

      // Add timeout for insert operation
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile creation timeout')), 5000);
      });

      const insertPromise = supabase
        .from('profiles')
        .insert(basicProfile)
        .select()
        .single();

      const { data: newProfile, error } = await Promise.race([insertPromise, timeoutPromise]) as any;

      console.log('Profile insert result:', { newProfile, error });

      if (error || !newProfile) {
        console.error('Error creating basic profile:', error);
        // If we can't create a profile, create a mock one for the session
        const mockProfile: Profile = {
          id: userId,
          email: user.email || '',
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          phone: user.user_metadata?.phone || null,
          role: (user.user_metadata?.role as 'user' | 'owner' | 'admin') || 'user',
          avatar_url: user.user_metadata?.avatar_url || null,
          business_name: user.user_metadata?.business_name || null,
          business_address: user.user_metadata?.business_address || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setProfile(mockProfile);
        console.log('Using mock profile:', mockProfile);
      } else {
        console.log('Basic profile created successfully:', newProfile);
        setProfile(newProfile as Profile);
      }
    } catch (error) {
      console.error('Error in createBasicProfile:', error);
      // Create a minimal mock profile as fallback
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const fallbackProfile: Profile = {
          id: userId,
          email: user.email || '',
          name: user.email?.split('@')[0] || 'User',
          phone: null,
          role: 'user',
          avatar_url: null,
          business_name: null,
          business_address: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setProfile(fallbackProfile);
        console.log('Using fallback profile:', fallbackProfile);
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Handle specific error cases
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Please check your email and click the confirmation link before signing in. Check your spam folder if you don\'t see the email.');
        }
        throw error;
      }

      // For mock mode, simulate successful login
      if (data.user) {
        setUser(data.user);
        await loadProfile(data.user.id);
        console.log('✅ Sign in successful:', data.user.email);
      }
    } catch (error: any) {
      console.error('❌ Sign in error:', error.message);
      setLoading(false);
      throw error;
    }
    // Note: Don't set loading to false here as loadProfile will handle it
  };

  const signUp = async (email: string, password: string, userData: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: userData.name,
            role: userData.role || 'user',
            phone: userData.phone,
            business_name: userData.businessName,
            business_address: userData.businessAddress
          },
        },
      });

      if (error) throw error;

      console.log('✅ Sign up successful:', data.user?.email);
      
      // For mock mode, automatically sign in the user
      if (data.user && !data.session) {
        console.log('📧 Please check your email and click the confirmation link to complete your registration');
      }
    } catch (error: any) {
      console.error('❌ Sign up error:', error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in');

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) throw error;

    // Reload profile
    await loadProfile(user.id);
  };

  const resendConfirmation = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });

    if (error) throw error;
    console.log('✅ Confirmation email resent');
  };

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    resendConfirmation,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};