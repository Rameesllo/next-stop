import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

const DriverDashboard = ({ onSignOut }) => {
    const [tripStarted, setTripStarted] = useState(false);
    const [selectedRoute, setSelectedRoute] = useState('');
    const [routes, setRoutes] = useState([]);
    const [watchId, setWatchId] = useState(null);
    const [loading, setLoading] = useState(false);
    const channelRef = useRef(null);

    useEffect(() => {
        fetchRoutes();
    }, []);

    const fetchRoutes = async () => {
        const { data } = await supabase.from('routes').select('*').order('name');
        if (data) {
            setRoutes(data);

            // Try to default to the assigned route if it exists
            const assignedId = localStorage.getItem('driver_assigned_route');
            if (assignedId && data.some(r => r.id === assignedId)) {
                setSelectedRoute(assignedId);
            } else if (data.length > 0) {
                setSelectedRoute(data[0].id);
            }
        }
    };

    const handleToggleTrip = () => {
        if (tripStarted) {
            stopTrip();
        } else {
            startTrip();
        }
    };

    const startTrip = () => {
        setLoading(true);
        const channelName = `bus-tracking-${selectedRoute}`;
        const channel = supabase.channel(channelName);
        channelRef.current = channel;

        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                // 1. Initial Position Broadcast (Immediate)
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        broadcastLocation(latitude, longitude);
                    },
                    null,
                    { enableHighAccuracy: true }
                );

                // 2. Continuous Tracking
                const id = navigator.geolocation.watchPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        broadcastLocation(latitude, longitude);
                    },
                    (error) => {
                        console.warn("GPS Error, starting simulation:", error);
                        // Prevent multiple simulations
                        navigator.geolocation.clearWatch(id);
                        startSimulation();
                    },
                    { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
                );
                setWatchId({ type: 'watch', id: id });
                setTripStarted(true);
                setLoading(false);

                // Send Start Notification to all students on this route
                const notifyChannel = supabase.channel(`notify-${selectedRoute}`);
                notifyChannel.subscribe(async (s) => {
                    if (s === 'SUBSCRIBED') {
                        await notifyChannel.send({
                            type: 'broadcast',
                            event: 'tripStarted',
                            payload: { routeId: selectedRoute }
                        });
                        supabase.removeChannel(notifyChannel);
                    }
                });
            }
        });
    };

    const stopTrip = () => {
        if (watchId !== null) {
            if (watchId.type === 'watch') {
                navigator.geolocation.clearWatch(watchId.id);
            } else if (watchId.type === 'interval') {
                clearInterval(watchId.id);
            }
            setWatchId(null);
        }

        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }

        setTripStarted(false);
    };

    const broadcastLocation = (lat, lng) => {
        const channel = channelRef.current;
        if (channel && channel.state === 'joined') {
            channel.send({
                type: 'broadcast',
                event: 'location_update',
                payload: { lat, lng, routeId: selectedRoute }
            });
        }
    };

    const startSimulation = () => {
        // EMEA College (Kondotty) - 11.1271, 75.9602
        // Calicut University - 11.1348, 75.8943
        const isKondotty = routes.find(r => r.id === selectedRoute)?.name?.toLowerCase().includes('kondotty');

        let simLat = isKondotty ? 11.1271 : 11.1348;
        let simLng = isKondotty ? 75.9602 : 75.8943;

        // Broadcast initial simulation position immediately
        broadcastLocation(simLat, simLng);

        const id = setInterval(() => {
            // Slowly move towards the other point or just simulate movement
            simLat += 0.00008;
            simLng += 0.00008;
            broadcastLocation(simLat, simLng);
        }, 3000);
        setWatchId({ type: 'interval', id: id });
        setTripStarted(true);
        setLoading(false);
    };

    const triggerEmergency = async () => {
        const route = routes.find(r => r.id === selectedRoute);
        if (!window.confirm(`Trigger EMERGENCY breakdown alert for ${route.name} (Bus #${route.bus_number})?`)) return;

        try {
            const title = "🚨 Emergency Breakdown";
            const message = `Bus #${route.bus_number} on the ${route.name} route has experienced a breakdown. A replacement bus will be arranged shortly.`;

            await supabase.from('notifications').insert([{
                title,
                message,
                target_audience: selectedRoute
            }]);

            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'location_update',
                    payload: { emergency: true, title, message }
                });
            }
            alert('Emergency Alert Sent');
        } catch (err) {
            alert('Failed to send alert');
        }
    };

    return (
        <div id="view-driver-dashboard" className="view active" style={{ background: '#fdfdfd' }}>
            <header className="app-header" style={{ padding: '24px', background: 'white', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: '#004d40', fontWeight: 900, fontSize: '1.5rem', letterSpacing: '-0.5px' }}>Driver Console</h3>
                <button className="sign-out-v4" onClick={onSignOut}>
                    <i className="ph ph-sign-out"></i>
                </button>
            </header>

            <div className="page-content" style={{ padding: '24px 20px 100px 20px' }}>
                {/* Driver Portal Banner */}
                <div className="driver-banner-v4 animate-fade-in">
                    <div className="banner-icon-v4">
                        <i className="ph-fill ph-bus"></i>
                    </div>
                    <div className="banner-text-v4">
                        <h4>Driver Portal</h4>
                        <p>Select your assigned route for today</p>
                    </div>
                </div>

                <div className="section-header" style={{ marginTop: '24px', marginBottom: '16px' }}>
                    <h4 className="section-title" style={{ fontSize: '1.2rem', fontWeight: 900, color: '#00332c' }}>Assigned Routes</h4>
                </div>

                {/* Assigned Route Card(s) */}
                <div className="route-grid-v4 animate-fade-in">
                    {routes.map((r) => (
                        <div
                            key={r.id}
                            className={`route-card-v4 ${selectedRoute === r.id ? 'active' : ''}`}
                            onClick={() => !tripStarted && setSelectedRoute(r.id)}
                        >
                            <div className="route-icon-v4">
                                <i className="ph-fill ph-bus"></i>
                            </div>
                            <div className="route-info-v4">
                                <h4>{r.name}</h4>
                                <p>Bus #{r.bus_number}</p>
                            </div>
                            {selectedRoute === r.id && (
                                <div className="selected-badge-v4">
                                    <i className="ph ph-check-circle"></i>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Primary Action: Start/Stop Trip */}
                <div className="actions-v4 animate-fade-in" style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <button
                        className={`btn-v4-primary ${tripStarted ? 'stop' : 'start'}`}
                        onClick={handleToggleTrip}
                        disabled={loading}
                    >
                        {loading ? (
                            <div className="loader-mini"></div>
                        ) : (
                            <>
                                <i className={tripStarted ? "ph-fill ph-stop-circle" : "ph-fill ph-play-circle"}></i>
                                <span>{tripStarted ? 'End Trip Session' : 'Start Trip'}</span>
                            </>
                        )}
                    </button>

                    {/* Secondary Action: Delay */}
                    <button className="btn-v4-outline delay">
                        <i className="ph-bold ph-warning"></i>
                        <span>Mark Delay / Traffic</span>
                    </button>

                    {/* Danger Action: Emergency */}
                    <button
                        className={`btn-v4-danger ${!tripStarted ? 'disabled' : ''}`}
                        onClick={tripStarted ? triggerEmergency : undefined}
                    >
                        <i className="ph-fill ph-warning-circle"></i>
                        <span>Emergency Breakdown</span>
                    </button>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .sign-out-v4 {
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    border: 1.5px solid #14b8a6;
                    background: white;
                    color: #14b8a6;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.1rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .sign-out-v4:hover { background: #14b8a6; color: white; }

                .driver-banner-v4 {
                    background: linear-gradient(to bottom, #d9f2f0 0%, #fff 100%);
                    border-radius: 28px;
                    padding: 24px;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    border: 1px solid rgba(20, 184, 166, 0.1);
                    margin-bottom: 24px;
                }
                .banner-icon-v4 {
                    width: 56px;
                    height: 56px;
                    background: #115e59;
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.6rem;
                    box-shadow: 0 4px 12px rgba(17, 94, 89, 0.2);
                }
                .banner-text-v4 h4 {
                    margin: 0;
                    font-size: 1.15rem;
                    font-weight: 950;
                    color: #00332c;
                }
                .banner-text-v4 p {
                    margin: 4px 0 0 0;
                    font-size: 0.9rem;
                    color: #14b8a6;
                    font-weight: 700;
                }
                .route-grid-v4 {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
                    gap: 16px;
                    margin-bottom: 24px;
                }
                .route-card-v4 {
                    background: white;
                    border-radius: 24px;
                    padding: 24px 16px;
                    text-align: center;
                    border: 2px solid #e2e8f0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 12px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    position: relative;
                }
                .route-card-v4.active { 
                    border-color: #14b8a6; 
                    background: #f0fdfa;
                    box-shadow: 0 4px 12px rgba(20, 184, 166, 0.1);
                }
                .route-icon-v4 {
                    width: 56px;
                    height: 56px;
                    background: #f8fafc;
                    color: #64748b;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.8rem;
                    transition: all 0.2s ease;
                }
                .route-card-v4.active .route-icon-v4 {
                    background: #14b8a6;
                    color: white;
                }
                .route-info-v4 h4 { font-size: 1.1rem; font-weight: 950; color: #00332c; margin: 0; }
                .route-info-v4 p { font-size: 0.9rem; color: #64748b; font-weight: 700; margin-top: 2px; }
                .selected-badge-v4 {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    color: #14b8a6;
                    font-size: 1.2rem;
                }

                .btn-v4-primary {
                    width: 100%;
                    padding: 24px;
                    border-radius: 24px;
                    border: none;
                    background: #14b8a6;
                    color: white;
                    font-size: 1.45rem;
                    font-weight: 950;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .btn-v4-primary i { font-size: 2.4rem; }
                .btn-v4-primary.stop { background: #ef4444; }
                .btn-v4-primary:active { transform: scale(0.98); }

                .btn-v4-outline.delay {
                    width: 100%;
                    padding: 20px;
                    border-radius: 22px;
                    background: #f8fafc;
                    border: 2.5px solid #f59e0b;
                    color: #f59e0b;
                    font-size: 1.15rem;
                    font-weight: 950;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    cursor: pointer;
                }
                .btn-v4-danger {
                    width: 100%;
                    padding: 20px;
                    border-radius: 22px;
                    background: #fdf2f2;
                    border: 1px solid #fecaca;
                    color: #ef4444;
                    font-size: 1.15rem;
                    font-weight: 950;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    cursor: pointer;
                }
                .btn-v4-danger.disabled { opacity: 0.5; cursor: not-allowed; }
            ` }} />
        </div>
    );
};

export default DriverDashboard;
