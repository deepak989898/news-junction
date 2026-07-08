import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./AuthProvider";
import { ThemeProvider } from "./ThemeProvider";
import { I18nProvider } from "./I18nProvider";
import { NetworkProvider } from "./NetworkProvider";
import { NotificationProvider } from "./NotificationProvider";
import { ReaderSettingsProvider } from "./ReaderSettingsProvider";
import AppErrorBoundary from "./ErrorBoundaryProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
    },
  },
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppErrorBoundary>
            <ThemeProvider>
              <I18nProvider>
                <ReaderSettingsProvider>
                  <AuthProvider>
                    <NetworkProvider>
                      <NotificationProvider>{children}</NotificationProvider>
                    </NetworkProvider>
                  </AuthProvider>
                </ReaderSettingsProvider>
              </I18nProvider>
            </ThemeProvider>
          </AppErrorBoundary>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
