import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthError, User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authError: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  authError: null,
  login: async () => {},
  logout: async () => {},
  clearAuthError: () => {},
});

export const useAuth = () => useContext(AuthContext);

const getFriendlyAuthError = (error: unknown) => {
  const authError = error as Partial<AuthError> | undefined;

  if (authError?.code === 'auth/unauthorized-domain') {
    return `Le domaine ${window.location.hostname} n'est pas autorise dans Firebase Authentication. Ajoutez-le dans Firebase Console > Authentication > Settings > Authorized domains.`;
  }

  if (authError?.code === 'auth/popup-blocked') {
    return 'La fenetre de connexion a ete bloquee par le navigateur. Reessayez avec un clic utilisateur direct.';
  }

  if (authError?.code === 'auth/popup-closed-by-user') {
    return 'La fenetre de connexion a ete fermee avant la fin de l authentification.';
  }

  return 'Connexion impossible pour le moment.';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Create user doc if it doesn't exist
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: currentUser.uid,
            email: currentUser.email?.toLowerCase() || '',
            displayName: currentUser.displayName || 'User',
            photoURL: currentUser.photoURL || '',
            theme: 'cyan',
            stats: { movies: 0, episodes: 0, hours: 0 }
          });
        } else {
          // Update email if it changed or wasn't saved before
          if (currentUser.email && userSnap.data().email !== currentUser.email.toLowerCase()) {
            await setDoc(userRef, { email: currentUser.email.toLowerCase() }, { merge: true });
          }
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    if (isLoggingIn) return;

    const provider = new GoogleAuthProvider();
    setAuthError(null);
    setIsLoggingIn(true);

    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error logging in:", error);
      setAuthError(getFriendlyAuthError(error));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, authError, login, logout, clearAuthError: () => setAuthError(null) }}>
      {children}
    </AuthContext.Provider>
  );
};
