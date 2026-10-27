import React from 'react';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useLanguageSync } from '@/hooks/useLanguageSync';
import { NotificationProvider } from '@/providers/NotificationProvider';
import { ColorSchemeSync } from '@/providers/ColorSchemeSync';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { configureApiClient } from './config/apiClient';
import Account from './pages/Account';
import Auth from './pages/Auth';
import CalendarSettings from './pages/CalendarSettings';
import EditBook from './pages/EditBook';
import EditItem from './pages/EditItem';
import Favorites from './pages/Favorites';
import ItemDetail from './pages/ItemDetail';
import ItemBookingHistory from './pages/ItemBookingHistory';
import NotFound from './pages/NotFound';
import NotificationSettings from './pages/NotificationSettings';
import PersonalSettings from './pages/PersonalSettings';
import QuickRent from './pages/QuickRent';
import { AppUpdatePrompt } from './components/layout/AppUpdatePrompt';
import { OfflineIndicator } from './components/layout/OfflineIndicator';
import { ACCOUNT_PATH, BROWSE_PATH, FAVORITES_PATH } from './lib/routes';
import { localStorageColorSchemeManager, MantineProvider } from '@mantine/core';
import { mantineTheme } from './theme/mantine';
import { DemoLayout } from './components/demo/DemoLayout';
import BrowsePage from './pages/BrowsePage';
import GiveItemPage from './pages/GiveItemPage';
import ItemDetailsPage from './pages/ItemDetailsPage';
import MyActivityPage from './pages/MyActivityPage';
import ImpactPage from './pages/ImpactPage';

const queryClient = new QueryClient();

const colorSchemeManager = localStorageColorSchemeManager({ key: 'bubble-theme' });

// Configure the API client once at startup
configureApiClient();

// Make the Pass It On demo the app's entry point. Main Sharebubble navigation
// URLs redirect to their demo equivalents; the original page files remain in
// the repository so they can be restored if needed.
const RootRoute = () => <Navigate to="/demo/browse" replace />;

// Wraps routes that always require authentication, even when REQUIRE_LOGIN=false.
const AuthRequired = ({ children }: { children: React.ReactNode }) => {
  const { session } = useAuth();
  if (!session) {
    return <Auth />;
  }
  return <>{children}</>;
};

const ProtectedRoutes = () => {
  const { session, loading: authLoading } = useAuth();
  const { requireLogin, loading: configLoading } = useAppConfig();
  const location = useLocation();
  useLanguageSync();

  // Wait for both the session check and the config fetch to resolve
  if (authLoading || configLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // REQUIRE_LOGIN=true (default): gate everything behind login
  const isDemoRoute = location.pathname.startsWith('/demo');
  const isDemoEntry =
    location.pathname === '/' ||
    isDemoRoute ||
    location.pathname === BROWSE_PATH ||
    location.pathname === '/create-item' ||
    location.pathname === '/my-items' ||
    location.pathname.startsWith('/bookings') ||
    location.pathname.startsWith('/collections');
  if (requireLogin && !session && !isDemoEntry) {
    return <Auth />;
  }

  // REQUIRE_LOGIN=false or user is authenticated: render the app.
  // User-specific routes are individually guarded by <AuthRequired>.
  return (
    <div className="min-h-screen bg-background">
      <Routes>
        <Route path="/demo" element={<DemoLayout />}>
          <Route index element={<Navigate to="browse" replace />} />
          <Route path="browse" element={<BrowsePage />} />
          <Route path="give" element={<GiveItemPage />} />
          <Route path="item/:itemUuid" element={<ItemDetailsPage />} />
          <Route path="activity" element={<MyActivityPage />} />
          <Route path="impact" element={<ImpactPage />} />
        </Route>
        <Route path="/" element={<RootRoute />} />
        <Route path={BROWSE_PATH} element={<Navigate to="/demo/browse" replace />} />
        <Route path="/item/:itemUuid" element={<ItemDetail />} />
        <Route path="/item/:itemUuid/bookings" element={<ItemBookingHistory />} />
        <Route
          path="/item/:itemUuid/quick-rent"
          element={
            <AuthRequired>
              <QuickRent />
            </AuthRequired>
          }
        />
        <Route
          path={ACCOUNT_PATH}
          element={
            <AuthRequired>
              <Account />
            </AuthRequired>
          }
        />
        <Route
          path="/create-item"
          element={<Navigate to="/demo/give" replace />}
        />
        <Route
          path="/edit-item/:itemUuid"
          element={
            <AuthRequired>
              <EditItem />
            </AuthRequired>
          }
        />
        <Route
          path="/edit-book/:itemUuid"
          element={
            <AuthRequired>
              <EditBook />
            </AuthRequired>
          }
        />
        <Route
          path={FAVORITES_PATH}
          element={
            <AuthRequired>
              <Favorites />
            </AuthRequired>
          }
        />
        <Route
          path="/my-items"
          element={<Navigate to="/demo/activity" replace />}
        />
        <Route
          path="/profile"
          element={
            <AuthRequired>
              <PersonalSettings />
            </AuthRequired>
          }
        />
        <Route
          path="/profile/notifications"
          element={
            <AuthRequired>
              <NotificationSettings />
            </AuthRequired>
          }
        />
        <Route
          path="/profile/calendar"
          element={
            <AuthRequired>
              <CalendarSettings />
            </AuthRequired>
          }
        />
        <Route
          path="/bookings/:bookingId?"
          element={<Navigate to="/demo/activity" replace />}
        />
        <Route path="/collections" element={<Navigate to="/demo/browse" replace />} />
        <Route path="/collections/:collectionId" element={<Navigate to="/demo/browse" replace />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <MantineProvider
      theme={mantineTheme}
      defaultColorScheme="auto"
      colorSchemeManager={colorSchemeManager}
    >
      <ColorSchemeSync />
      <ModalsProvider>
        <LanguageProvider>
          <AuthProvider>
            <NotificationProvider>
              <Notifications />
              {/* Outside the router so both are shown on every route, including
                  the login screen and the auth/config loading states — being
                  offline is the likeliest reason to be stuck on those. */}
              <AppUpdatePrompt />
              <OfflineIndicator />
              <BrowserRouter>
                <ProtectedRoutes />
              </BrowserRouter>
            </NotificationProvider>
          </AuthProvider>
        </LanguageProvider>
      </ModalsProvider>
    </MantineProvider>
  </QueryClientProvider>
);

export default App;
