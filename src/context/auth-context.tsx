
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
// NOTE: db.json replaced by server-side MySQL API. We now call /api/auth/findUser

// Types
export type User = {
  uid: string; // Corresponds to employe.id_employe or client.id_client
  personneId: string; // Corresponds to personne.id_personne
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'admin' | 'manager' | 'sales' | 'support' | 'client';
};

export type CustomerRequest = {
  name: string;
  email: string;
  requestDate: string;
  uid?: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signOut: () => void;
  signUp: (name: string, email: string, pass: string) => Promise<void>;
  getPendingRequests: () => CustomerRequest[];
  approveRequest: (request: CustomerRequest) => Promise<void>;
  rejectRequest: (request: CustomerRequest) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// In-memory store for sign-up requests
let pendingRequests: CustomerRequest[] = [];

// Server-side lookup replaced by /api/auth/findUser


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const storedUserEmail = localStorage.getItem('user_email');
        const storedAuthenticated = localStorage.getItem('user_authenticated');
        // Only bootstrap if the user explicitly authenticated previously.
        if (storedUserEmail && storedAuthenticated === '1') {
              const res = await fetch(`/api/auth/findUser?email=${encodeURIComponent(storedUserEmail)}`);
              if (res.ok) {
                const data = await res.json();
                setUser(data);
              } else {
                // clear stored email if user not found or server error
                localStorage.removeItem('user_email');
                setUser(null);
              }
        }
      } catch (e) {
        console.error('Could not bootstrap user from API', e);
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  useEffect(() => {
    if (!loading && !user && pathname !== '/login' && pathname !== '/signup') {
      router.push('/login');
    }
     if (!loading && user && (pathname === '/login' || pathname === '/signup')) {
      router.push('/');
    }
  }, [user, loading, pathname, router]);

  const signIn = async (email: string, pass: string) => {
    // Call server-side login route which validates email+password
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });
    if (res.status === 401) {
      const body = await res.json().catch(() => ({ error: 'Invalid credentials' }));
      throw new Error(body.error || 'Invalid email or password');
    }
    if (res.status === 400) {
      const body = await res.json().catch(() => ({ error: 'Bad request' }));
      throw new Error(body.error || 'Email and password required');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(err.error || 'Login failed');
    }
    const foundUser = await res.json();
    if (!foundUser) throw new Error('User not found');
    setUser(foundUser);
    localStorage.setItem('user_email', foundUser.email || email);
    // mark that the user successfully authenticated so bootstrap can restore session
    localStorage.setItem('user_authenticated', '1');
    router.push('/');
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_authenticated');
    router.push('/login');
  };

  const signUp = async (name: string, email: string, pass: string) => {
    if (pendingRequests.some(r => r.email === email)) {
      throw new Error('An account with this email is already pending approval.');
    }
    const newRequest: CustomerRequest = { name, email, requestDate: new Date().toISOString(), uid: `new_user_${Date.now()}` };
    pendingRequests.push(newRequest);
    // In this local version, we won't create a real user until approved.
  };

  const getPendingRequests = () => {
    return pendingRequests;
  };

  const approveRequest = async (request: CustomerRequest) => {
    console.log(`Approving ${request.name}. In a real app, you would now add them to db.json.`);
    pendingRequests = pendingRequests.filter(r => r.email !== request.email);
  };

  const rejectRequest = (request: CustomerRequest) => {
    pendingRequests = pendingRequests.filter(r => r.email !== request.email);
  };

  const value = { user, loading, signIn, signOut, signUp, getPendingRequests, approveRequest, rejectRequest };

  return (
    <AuthContext.Provider value={value}>
      {loading ? <div className="flex h-screen items-center justify-center">Chargement...</div> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
