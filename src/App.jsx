import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

// Views
import LoadingView from './components/views/LoadingView';
import RoleSelectionView from './components/views/RoleSelectionView';
import StudentLoginView from './components/views/StudentLoginView';
import DriverLoginView from './components/views/DriverLoginView';
import AdminLoginView from './components/views/AdminLoginView';
import ForgotPasswordView from './components/views/ForgotPasswordView';
import UpdatePasswordView from './components/views/UpdatePasswordView';
import StudentDashboard from './components/views/StudentDashboard';
import TrackingView from './components/views/TrackingView';
import PaymentView from './components/views/PaymentView';
import ProfileView from './components/views/ProfileView';
import NotificationsView from './components/views/NotificationsView';
import DriverDashboard from './components/views/DriverDashboard';
import AdminDashboard from './components/views/AdminDashboard';

// Layout
import BottomNav from './components/layout/BottomNav';

function App() {
  const [currentView, setCurrentView] = useState('loading');
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [selectedRouteData, setSelectedRouteData] = useState(null);

  useEffect(() => {
    // Initial Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange(session);
    });

    // Auth Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        window.isPasswordRecovery = true; // Use a window flag to lock the view
        setCurrentView('update-password');
      } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (window.isPasswordRecovery) {
          setCurrentView('update-password');
        } else {
          handleAuthChange(session);
        }
      } else if (event === 'SIGNED_OUT') {
        window.isPasswordRecovery = false;
        handleAuthChange(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthChange = (session) => {
    setSession(session);
    if (session) {
      // Prioritize role from user_metadata, fallback to localStorage
      const role = session.user.user_metadata?.role || localStorage.getItem('nextstop_role');

      if (role) {
        localStorage.setItem('nextstop_role', role); // Sync metadata back to storage
        setUserRole(role);

        if (role === 'driver') setCurrentView('driver-dashboard');
        else if (role === 'admin') setCurrentView('admin-dashboard');
        else setCurrentView('student-dashboard');
      } else {
        // Fallback for students without metadata
        setUserRole('student');
        localStorage.setItem('nextstop_role', 'student');
        setCurrentView('student-dashboard');
      }
    } else {
      const persistedRole = localStorage.getItem('nextstop_role');
      setCurrentView('role-selection');
    }
  };

  const navigateTo = (view) => {
    window.scrollTo(0, 0);
    setCurrentView(view);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('nextstop_role');
    setSession(null);
    setUserRole(null);
    setCurrentView('role-selection');
  };

  const renderView = () => {
    switch (currentView) {
      case 'loading': return <LoadingView />;
      case 'role-selection': return <RoleSelectionView onSelectRole={(role) => navigateTo(`${role}-login`)} />;
      case 'student-login': return <StudentLoginView onBack={() => navigateTo('role-selection')} onLoginSuccess={() => navigateTo('student-dashboard')} onForgotPassword={() => navigateTo('forgot-password')} />;
      case 'driver-login': return <DriverLoginView onBack={() => navigateTo('role-selection')} onLoginSuccess={() => navigateTo('driver-dashboard')} />;
      case 'admin-login': return <AdminLoginView onBack={() => navigateTo('role-selection')} onLoginSuccess={() => navigateTo('admin-dashboard')} />;
      case 'forgot-password': return <ForgotPasswordView onBack={() => navigateTo('student-login')} />;
      case 'update-password': return <UpdatePasswordView onComplete={() => navigateTo('student-login')} />;

      // Student Views
      case 'student-dashboard': return <StudentDashboard onNavigate={(view, data) => {
        if (view === 'tracking') setSelectedRouteData(data);
        navigateTo(view);
      }} onShowNotifications={() => navigateTo('notifications')} />;
      case 'tracking': return <TrackingView onBack={() => navigateTo('student-dashboard')} routeData={selectedRouteData} />;
      case 'payment': return <PaymentView />;
      case 'profile': return <ProfileView onSignOut={handleSignOut} />;
      case 'notifications': return <NotificationsView onBack={() => navigateTo('student-dashboard')} currentRouteId={selectedRouteData?.routeId} />;

      // Driver Views
      case 'driver-dashboard': return <DriverDashboard onSignOut={handleSignOut} />;

      // Admin Views
      case 'admin-dashboard': return <AdminDashboard onSignOut={handleSignOut} />;

      default: return <RoleSelectionView onSelectRole={(role) => navigateTo(`${role}-login`)} />;
    }
  };

  const showBottomNav = ['student-dashboard', 'tracking', 'payment', 'profile', 'notifications'].includes(currentView);

  return (
    <div id="app-container">
      <main id="app-content">
        {renderView()}
      </main>
      {showBottomNav && <BottomNav activeView={currentView} onNavigate={navigateTo} />}
    </div>
  );
}

export default App;
