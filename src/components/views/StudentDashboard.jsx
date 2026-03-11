import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const StudentDashboard = ({ onNavigate, onShowNotifications }) => {
    const [profile, setProfile] = useState(null);
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            // 1. Fetch Profile
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('*, routes!route_id(name, bus_number)')
                    .eq('id', session.user.id)
                    .single();

                setProfile({
                    fullName: profileData?.full_name || session.user.user_metadata?.full_name || 'Student',
                    admissionNumber: profileData?.admission_number || session.user.user_metadata?.admission || '2024CS001',
                    avatarUrl: profileData?.avatar_url || session.user.user_metadata?.avatar,
                    route: profileData?.routes ? {
                        routeId: profileData.route_id,
                        routeName: profileData.routes.name,
                        busNumber: profileData.routes.bus_number
                    } : null
                });
            }

            // 2. Fetch Actual Routes
            const { data: routesData } = await supabase
                .from('routes')
                .select('*')
                .order('name');

            setRoutes(routesData || []);

        } catch (err) {
            console.error("Dashboard data fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div id="view-student-dashboard" className="view active">
            <header className="student-dash-header">
                <div className="user-identity">
                    <div className="avatar-box" id="dashboard-avatar">
                        {profile?.avatarUrl ? (
                            <img src={profile.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                        ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-teal)', color: 'white', fontSize: '1.2rem', borderRadius: '50%' }}>
                                {profile?.fullName?.charAt(0) || 'S'}
                            </div>
                        )}
                    </div>
                    <div className="user-meta">
                        <h3 id="dashboard-student-name" style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>{profile?.fullName || 'Loading...'}</h3>
                        <p id="dashboard-student-id" style={{ fontWeight: 500, opacity: 0.8 }}>{profile?.admissionNumber || '...'}</p>
                    </div>
                </div>
                <button className="notification-btn" onClick={onShowNotifications}>
                    <i className="ph ph-bell"></i>
                    <span className="dot" id="student-notification-badge" style={{ display: 'none' }}></span>
                </button>
            </header>

            <div className="page-content">
                <div className="map-section-v2" onClick={() => onNavigate('tracking', profile?.route)}>
                    <div className="map-card-v2">
                        <div className="map-grid"></div>
                        <img src="/map1.jpeg" className="map-img" alt="Map" />
                        <div className="location-overlay">
                            <i className="ph-fill ph-map-pin" style={{ fontSize: '24px' }}></i>
                        </div>
                    </div>
                </div>

                <div className="section-container">
                    <h4 className="section-title" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem' }}>Choose Your Bus Route</h4>
                    <div className="route-list-v2" id="dashboard-route-grid">
                        {loading ? (
                            <div className="loader-placeholder">
                                <i className="ph ph-spinner ph-spin"></i>
                                <p>Loading routes...</p>
                            </div>
                        ) : (
                            routes.map((route, index) => (
                                <div key={route.id} className="route-card-v2" onClick={() => onNavigate('tracking', { routeId: route.id, routeName: route.name, busNumber: route.bus_number })}>
                                    <div className="illustration-box">
                                        <img src="/bus1.jpg" alt="Bus" />
                                    </div>
                                    <div className="route-meta">
                                        <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>Route {index + 1}</h4>
                                        <p style={{ fontWeight: 600, color: 'var(--color-teal)' }}>{route.name}</p>
                                        <div className="stats" style={{ fontSize: '0.8rem', opacity: 0.7 }}>{route.bus_number} Bus • Active</div>
                                    </div>
                                    <div className="chevron-box">
                                        <i className="ph ph-caret-right"></i>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
