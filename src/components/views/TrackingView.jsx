import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../../lib/supabase';

// Helper for distance calculation (Haversine formula)
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Styling for Tracking View
const mapLabelStyle = `


    .bottom-info-v4 {
        background: white;
        border-radius: 32px 32px 0 0;
        padding: 12px 24px 40px 24px;
        box-shadow: 0 -10px 30px rgba(0,0,0,0.1);
        position: relative;
        z-index: 1000;
    }
    .info-handle-v4 {
        width: 40px;
        height: 5px;
        background: #e2e8f0;
        border-radius: 10px;
        margin: 0 auto 20px auto;
    }
    .route-info-header-v4 {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 24px;
    }
    .bus-id-badge-v4 {
        padding: 6px 12px;
        background: #f0fdfa;
        color: #14b8a6;
        border-radius: 12px;
        font-size: 0.85rem;
        font-weight: 800;
        border: 1px solid rgba(20, 184, 166, 0.2);
    }
    .route-dest-v4 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 900;
        color: #00332c;
    }

    .stop-list-v4 {
        display: flex;
        flex-direction: column;
        gap: 16px;
        position: relative;
    }
    .stop-card-v5 {
        background: white;
        border-radius: 20px;
        padding: 20px;
        display: flex;
        align-items: center;
        gap: 16px;
        border: 1.5px solid #f1f5f9;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
    }
    .stop-card-v5.approaching {
        border-color: #14b8a6;
        background: #f0fdfa;
        box-shadow: 0 10px 20px rgba(20, 184, 166, 0.08);
        transform: translateY(-2px);
    }
    .stop-card-v5.passed {
        opacity: 0.7;
        background: #fafcfe;
        border-color: #e2e8f0;
    }
    .stop-card-v5.destination {
        border-bottom: 4px solid #ef4444;
    }

    .stop-icon-v5 {
        width: 48px;
        height: 48px;
        border-radius: 14px;
        background: #f8fafc;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.4rem;
        color: #64748b;
        flex-shrink: 0;
        transition: all 0.3s ease;
    }
    .stop-card-v5.approaching .stop-icon-v5 {
        background: #14b8a6;
        color: white;
    }
    .stop-card-v5.passed .stop-icon-v5 {
        background: #e2e8f0;
        color: #94a3b8;
    }

    .stop-details-v5 {
        flex: 1;
    }
    .stop-details-v5 h4 {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 900;
        color: #00332c;
    }
    .stop-status-badge-v5 {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        border-radius: 8px;
        font-size: 0.65rem;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-top: 6px;
    }
    .approaching .stop-status-badge-v5 {
        background: #14b8a6;
        color: white;
    }
    .passed .stop-status-badge-v5 {
        background: #e2e8f0;
        color: #64748b;
    }
    .upcoming .stop-status-badge-v5 {
        background: #f1f5f9;
        color: #94a3b8;
    }

    .card-accent-v5 {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 4px;
        background: transparent;
    }
    .approaching .card-accent-v5 { background: #14b8a6; }
    .passed .card-accent-v5 { background: #cbd5e1; }

    .map-label-tooltip {
        background: white !important;
        border: 2px solid #14b8a6 !important;
        border-radius: 8px !important;
        padding: 4px 10px !important;
        font-size: 0.75rem !important;
        font-weight: 800 !important;
        color: #004d40 !important;
        box-shadow: 0 4px 12px rgba(20, 184, 166, 0.2) !important;
        white-space: nowrap !important;
    }
    .bus-marker-premium {
        width: 44px;
        height: 44px;
        background: #115e59;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.4rem;
        box-shadow: 0 0 20px rgba(17, 94, 89, 0.4);
        border: 3px solid white;
        position: relative;
        z-index: 9999;
    }
    .bus-marker-pulse {
        position: absolute;
        inset: -8px;
        background: rgba(20, 184, 166, 0.2);
        border-radius: 50%;
        animation: marker-pulse 2s infinite;
    }
    .status-dot.pulse {
        animation: marker-pulse 2s infinite;
    }
    @keyframes marker-pulse {
        0% { transform: scale(1); opacity: 1; }
        100% { transform: scale(1.6); opacity: 0; }
    }
    .live-bus-marker-container {
        z-index: 9999 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
    }
`;

const RecenterMap = ({ position, bounds }) => {
    const map = useMap();
    useEffect(() => {
        if (bounds) {
            map.fitBounds(bounds, { padding: [20, 20] });
        } else if (position) {
            map.setView(position, map.getZoom());
        }
    }, [position, bounds, map]);
    return null;
};

const TrackingView = ({ onBack, routeData }) => {
    const { routeId, routeName, busNumber } = routeData || { routeId: 'route-calicut', routeName: 'Calicut University', busNumber: '4' };
    const [busLocation, setBusLocation] = useState(null);
    const [status, setStatus] = useState('Connecting...');
    const [stops, setStops] = useState([]);
    const channelRef = useRef(null);

    // 1. Define full route data with waypoints
    const fullRouteData = useMemo(() => {
        const normalized = (routeName || '').toLowerCase();
        if (normalized.includes('calicut') || normalized.includes('univers') || normalized.includes('univerc')) {
            return [
                { name: 'Calicut University', lat: 11.1314, lng: 75.8945 },
                { lat: 11.1290, lng: 75.8946 },
                { name: 'Kohinoor', lat: 11.1276, lng: 75.8947 },
                { lat: 11.1285, lng: 75.8975 },
                { lat: 11.1305, lng: 75.9010 },
                { name: 'Devathiyal', lat: 11.1345, lng: 75.9030 },
                { lat: 11.1365, lng: 75.9080 },
                { lat: 11.1375, lng: 75.9120 },
                { name: 'Puthur Pallikal', lat: 11.1377, lng: 75.9166 },
                { lat: 11.1385, lng: 75.9205 },
                { lat: 11.1375, lng: 75.9245 },
                { name: 'Vayaloram', lat: 11.1355, lng: 75.9280 },
                { lat: 11.1340, lng: 75.9315 },
                { lat: 11.1325, lng: 75.9350 },
                { lat: 11.1320, lng: 75.9370 },
                { name: 'Chembolchira', lat: 11.1332, lng: 75.9385 },
                { lat: 11.1345, lng: 75.9395 },
                { lat: 11.1355, lng: 75.9410 },
                { lat: 11.1345, lng: 75.9420 },
                { name: 'EMEA College (Kummiparamba)', lat: 11.1341, lng: 75.9429 }
            ];
        } else if (normalized.includes('kondotty')) {
            return [
                { name: 'Kondotty', lat: 11.1481, lng: 75.9592 },
                { lat: 11.1496, lng: 75.9584 },
                { lat: 11.1518, lng: 75.9565 },
                { lat: 11.1543, lng: 75.9535 },
                { lat: 11.1562, lng: 75.9515 },
                { name: 'Kolathur', lat: 11.157483, lng: 75.949693 },
                { lat: 11.1545, lng: 75.9496 },
                { lat: 11.1515, lng: 75.9489 },
                { lat: 11.1485, lng: 75.9484 },
                { name: 'Airport Junction', lat: 11.145481, lng: 75.948158 },
                { lat: 11.1453, lng: 75.9460 },
                { lat: 11.1444, lng: 75.9425 },
                { lat: 11.1434, lng: 75.9395 },
                { lat: 11.1425, lng: 75.9370 },
                { name: 'EMEA College (Kummiparamba)', lat: 11.1341, lng: 75.9429 }
            ];
        }
        return [];
    }, [routeName]);

    const routePolyline = useMemo(() => fullRouteData.map(pt => [pt.lat, pt.lng]), [fullRouteData]);
    const routeBounds = useMemo(() => routePolyline.length > 0 ? L.polyline(routePolyline).getBounds() : null, [routePolyline]);

    // 2. Proximity Logic for stops
    useEffect(() => {
        if (!fullRouteData.length) return;

        // Default to first stop if no bus location yet
        const currentLat = busLocation ? busLocation[0] : fullRouteData[0].lat;
        const currentLng = busLocation ? busLocation[1] : fullRouteData[0].lng;

        // Find closest index
        let closestIndex = 0;
        let minDistance = Infinity;
        const distances = fullRouteData.map((pt, idx) => {
            const d = getDistanceFromLatLonInKm(currentLat, currentLng, pt.lat, pt.lng);
            if (d < minDistance) {
                minDistance = d;
                closestIndex = idx;
            }
            return d;
        });

        // Find next named stop index
        let nextStopIndex = -1;
        for (let i = closestIndex; i < fullRouteData.length; i++) {
            if (fullRouteData[i].name) {
                nextStopIndex = i;
                break;
            }
        }

        const updatedStops = fullRouteData.filter(pt => pt.name).map((stop, idx, filteredArr) => {
            const originalIdx = fullRouteData.indexOf(stop);
            const dist = distances[originalIdx];
            const timeInMins = Math.round((dist / 30) * 60);

            let stopStatus = '';
            let distanceText = '';

            if (originalIdx < closestIndex && originalIdx !== nextStopIndex) {
                stopStatus = 'passed';
                distanceText = 'Departed';
            } else if (originalIdx === nextStopIndex) {
                if (minDistance < 0.2 && originalIdx === fullRouteData.length - 1) {
                    stopStatus = 'passed';
                    distanceText = 'Arrived';
                } else {
                    stopStatus = 'approaching';
                    distanceText = minDistance < 1 && originalIdx === closestIndex
                        ? `Approaching${timeInMins > 0 ? ` • ~${timeInMins} min` : ''}`
                        : `${dist.toFixed(1)} km away${timeInMins > 0 ? ` • ~${timeInMins} min` : ''}`;
                }
            } else {
                stopStatus = (originalIdx === fullRouteData.length - 1) ? 'destination' : 'upcoming';
                distanceText = `${dist.toFixed(1)} km away${timeInMins > 0 ? ` • ~${timeInMins} min` : ''}`;
            }

            return { ...stop, status: stopStatus, distanceText };
        });

        // Reverse for UI as per app.js unshift() pattern
        setStops([...updatedStops].reverse());

    }, [busLocation, fullRouteData]);

    // 3. Horizontal Progress Logic (Ratio for vertical line)
    const progressRatio = useMemo(() => {
        if (!fullRouteData.length || !busLocation) return 0;

        let totalDist = 0;
        for (let i = 0; i < fullRouteData.length - 1; i++) {
            totalDist += getDistanceFromLatLonInKm(fullRouteData[i].lat, fullRouteData[i].lng, fullRouteData[i + 1].lat, fullRouteData[i + 1].lng);
        }

        let closestIndex = 0;
        let minD = Infinity;
        fullRouteData.forEach((pt, i) => {
            const d = getDistanceFromLatLonInKm(busLocation[0], busLocation[1], pt.lat, pt.lng);
            if (d < minD) {
                minD = d;
                closestIndex = i;
            }
        });

        let coveredDist = 0;
        for (let i = 0; i < closestIndex; i++) {
            coveredDist += getDistanceFromLatLonInKm(fullRouteData[i].lat, fullRouteData[i].lng, fullRouteData[i + 1].lat, fullRouteData[i + 1].lng);
        }

        return totalDist > 0 ? Math.min(1, coveredDist / totalDist) : 0;
    }, [busLocation, fullRouteData]);

    // 4. Supabase Real-time
    useEffect(() => {
        const channelName = `bus-tracking-${routeId}`;
        const channel = supabase.channel(channelName);
        channelRef.current = channel;

        channel.on('broadcast', { event: 'location_update' }, (message) => {
            console.log("Received Location Sync:", message.payload);
            setStatus('Live');
            if (message.payload.lat && message.payload.lng) {
                setBusLocation([message.payload.lat, message.payload.lng]);
            }
            if (message.payload.emergency) {
                alert(`${message.payload.title}: ${message.payload.message}`);
            }
        });

        channel.subscribe((subStatus) => {
            if (subStatus === 'SUBSCRIBED') {
                setStatus('Live');
            } else if (subStatus === 'CLOSED' || subStatus === 'CHANNEL_ERROR') {
                setStatus('Offline');
            }
        });

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        };
    }, [routeId]);

    const destinationStats = useMemo(() => {
        if (!fullRouteData.length || !busLocation) return { km: 0, mins: 0 };
        const dest = fullRouteData[fullRouteData.length - 1];
        const km = getDistanceFromLatLonInKm(busLocation[0], busLocation[1], dest.lat, dest.lng);
        return { km: km.toFixed(1), mins: Math.round((km / 30) * 60) };
    }, [busLocation, fullRouteData]);

    const busIcon = useMemo(() => L.divIcon({
        html: `
            <div class="bus-marker-premium">
                <i class="ph-fill ph-bus"></i>
                <div class="bus-marker-pulse"></div>
            </div>
        `,
        className: 'live-bus-marker-container',
        iconSize: [44, 44],
        iconAnchor: [22, 22]
    }), []);

    return (
        <div id="view-tracking" className="view active">
            <style dangerouslySetInnerHTML={{ __html: mapLabelStyle }} />
            <header className="app-header">
                <button className="btn-icon" onClick={onBack} style={{ marginLeft: '-12px', color: 'var(--color-deep-teal)' }}>
                    <i className="ph ph-arrow-left"></i>
                </button>
                <div className="header-title" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--color-deep-teal)', flex: 1 }}>{routeName}</div>
                <div style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.15)', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className={`status-dot ${status === 'Live' ? 'pulse' : ''}`} style={{ width: '8px', height: '8px', borderRadius: '50%', background: status === 'Live' ? '#14b8a6' : '#94a3b8' }}></div>
                    {status}
                </div>
            </header>

            <div className="page-content" style={{ padding: 0 }}>


                <div className="tracking-map">
                    <div id="track-map" style={{ width: '100%', height: '100%' }}>
                        <MapContainer
                            center={busLocation || [fullRouteData[0]?.lat || 0, fullRouteData[0]?.lng || 0]}
                            zoom={15}
                            style={{ height: '100%', width: '100%' }}
                            zoomControl={false}
                        >
                            <TileLayer
                                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                                attribution='&copy; CARTO'
                            />

                            {/* Route Polyline */}
                            {routePolyline.length > 0 && (
                                <Polyline
                                    positions={routePolyline}
                                    color="#14b8a6"
                                    weight={6}
                                    opacity={0.3}
                                />
                            )}

                            {/* Named Stop Markers */}
                            {fullRouteData.filter(s => s.name).map((stop, i, arr) => {
                                const isStart = i === 0;
                                const isEnd = i === arr.length - 1;
                                return (
                                    <Marker
                                        key={i}
                                        position={[stop.lat, stop.lng]}
                                        icon={L.divIcon({
                                            className: 'custom-stop-marker',
                                            html: `<div style="width: 12px; height: 12px; background: ${isEnd ? '#ef4444' : '#14b8a6'}; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.2);"></div>`,
                                            iconSize: [12, 12],
                                            iconAnchor: [6, 6]
                                        })}
                                    >
                                        <Tooltip permanent direction="top" offset={[0, -10]} className="map-label-tooltip">
                                            {stop.name}
                                        </Tooltip>
                                    </Marker>
                                );
                            })}

                            {/* Live Bus Marker */}
                            {busLocation && <Marker position={busLocation} icon={busIcon} zIndexOffset={1000} />}

                            <RecenterMap position={busLocation} bounds={busLocation ? null : routeBounds} />
                        </MapContainer>
                    </div>
                </div>

                <div className="bottom-info-v4 animate-slide-up">
                    <div className="info-handle-v4"></div>
                    <div className="route-info-header-v4">
                        <div className="bus-id-badge-v4" style={{ fontFamily: 'var(--font-family)', fontWeight: 800 }}>Bus #{busNumber}</div>
                        <h4 className="route-dest-v4" style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>To {fullRouteData[fullRouteData.length - 1]?.name}</h4>
                    </div>

                    <div className="stop-list-v4">
                        {stops.map((stop, i) => (
                            <div key={i} className={`stop-card-v5 ${stop.status} animate-fade-in`} style={{ animationDelay: `${i * 0.1}s` }}>
                                <div className="card-accent-v5"></div>
                                <div className="stop-icon-v5">
                                    {stop.status === 'passed' ? (
                                        <i className="ph-fill ph-check-circle"></i>
                                    ) : stop.status === 'approaching' ? (
                                        <i className="ph-fill ph-map-pin"></i>
                                    ) : (
                                        <i className="ph ph-circle"></i>
                                    )}
                                </div>
                                <div className="stop-details-v5">
                                    <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>{stop.name}</h4>
                                    <div className="stop-status-badge-v5" style={{ fontFamily: 'var(--font-family)', fontWeight: 700 }}>
                                        {stop.status === 'passed' ? 'Passed' :
                                            stop.status === 'approaching' ? 'Live • Arriving' :
                                                'Upcoming'}
                                    </div>
                                </div>
                                {stop.status === 'approaching' && (
                                    <div className="approaching-indicator">
                                        <div className="status-dot pulse" style={{ background: '#14b8a6', width: '10px', height: '10px', borderRadius: '50%' }}></div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrackingView;
