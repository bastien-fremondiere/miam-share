// hooks/use-require-auth.ts — Soft auth prompt for write actions
// Shows an alert asking the user to sign in when they try a write action while unauthenticated.

import { useAuth } from '@/context/auth-context';
import { Alert } from 'react-native';

/**
 * Returns a guard function that checks auth before executing an action.
 * If not signed in, shows an alert with a sign-in option.
 *
 * Usage:
 *   const requireAuth = useRequireAuth();
 *   const handleDelete = () => requireAuth(() => deleteRecipe(id));
 */
export function useRequireAuth() {
  const { user, signIn } = useAuth();

  return (action: () => void | Promise<void>) => {
    if (user) {
      action();
      return;
    }

    Alert.alert(
      'Connexion requise',
      'Connectez-vous avec Google pour modifier vos recettes.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se connecter', onPress: signIn },
      ],
    );
  };
}
