import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Spinner } from '../ui/Spinner';

/**
 * Listens to Firebase's persisted auth state on mount. When a session
 * exists (page reload, returning user), it grabs a fresh ID token,
 * calls /auth/me to restore the Vivid user, and populates the store.
 * Until resolution, children see a loading spinner.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [initialising, setInitialising] = useState(true);
  const setUser = useAuthStore((s) => s.setUser);
  const setIdToken = useAuthStore((s) => s.setIdToken);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          setIdToken(token);

          const { data } = await api.get('/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          setUser(data.user);
        } catch {
          setIdToken(null);
          setUser(null);
        }
      } else {
        setIdToken(null);
        setUser(null);
      }
      setInitialising(false);
    });

    return unsubscribe;
  }, [setUser, setIdToken]);

  if (initialising) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-base">
        <Spinner />
      </div>
    );
  }

  return <>{children}</>;
}
