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

/* async function deleteAllUsers() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;

  for (const user of data.users) {
    await supabase.auth.admin.deleteUser(user.id);
  }
}

deleteAllUsers();
 */

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
        setProfile(null); // <-- add this
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
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        setProfile(null);
        // Handle invalid session or JWT errors
        if (
          error.code === 'PGRST301' || // JWT expired/invalid
          (error.message && error.message.toLowerCase().includes('jwt'))
        ) {
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        if (error.code === 'PGRST116') {
          console.log('Profile not found, user may need to complete setup');
        } else {
          console.error('Error loading profile:', error);
        }
      } else {
        setProfile(profile);
      }
    } catch (error: any) {
      setProfile(null);
      // Handle fetch/network errors
      if (error.message && error.message.toLowerCase().includes('jwt')) {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
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
      throw error;
    } finally {
      /* setLoading(false); */
    }
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
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setLoading(false);
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