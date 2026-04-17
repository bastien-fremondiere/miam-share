import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AuthProvider } from '@/context/auth-context';
import { RecipesProvider } from '@/context/recipes-context';
import { SettingsProvider } from '@/context/settings-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useShareIntent } from '@/hooks/use-share-intent';

export const unstable_settings = {
  anchor: '(tabs)',
};

function ShareIntentWatcher() {
  const router = useRouter();
  const { url, consumed, consume } = useShareIntent();

  useEffect(() => {
    if (url && !consumed) {
      consume();
      // Navigate to the share handler modal with the URL as a query param
      router.push(`/share-handler?url=${encodeURIComponent(url)}`);
    }
  }, [url, consumed, consume, router]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <SettingsProvider>
        <RecipesProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <ShareIntentWatcher />
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="share-handler"
                options={{ presentation: 'modal', title: 'Analyser une recette' }}
              />
              <Stack.Screen
                name="recipe/[id]"
                options={{ title: 'Recette', headerBackTitle: 'Retour' }}
              />
            </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
        </RecipesProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

