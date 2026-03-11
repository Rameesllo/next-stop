import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Bell, WarningOctagon, Bus, Clock, CreditCard, CalendarX, ArrowLeft, ChatCenteredText } from '@phosphor-icons/react';

const NotificationsView = ({ onBack, currentRouteId }) => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();

        const channel = supabase
            .channel('public:notifications')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
                const newNotif = payload.new;
                if (newNotif.target_audience === 'all' || newNotif.target_audience === currentRouteId) {
                    setNotifications(prev => [newNotif, ...prev]);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentRouteId]);

    const fetchNotifications = async () => {
        try {
            const { data } = await supabase
                .from('notifications')
                .select('*')
                .or(`target_audience.eq.all,target_audience.eq.${currentRouteId}`)
                .order('created_at', { ascending: false });

            setNotifications(data || []);
        } catch (err) {
            console.error("Notifications fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (title, message) => {
        const text = (title + message).toLowerCase();
        if (text.includes('emergency') || text.includes('breakdown')) return WarningOctagon;
        if (text.includes('bus') || text.includes('route')) return Bus;
        if (text.includes('delay') || text.includes('traffic')) return Clock;
        if (text.includes('pay') || text.includes('fee')) return CreditCard;
        if (text.includes('holiday') || text.includes('close')) return CalendarX;
        return Bell;
    };

    return (
        <div id="view-notifications" className="view active">
            <header className="app-header">
                <button className="btn-icon" onClick={onBack} style={{ marginLeft: '-12px', color: 'var(--color-deep-teal)' }}>
                    <ArrowLeft weight="bold" size={24} />
                </button>
                <div className="header-title" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--color-deep-teal)', flex: 1 }}>Announcements</div>
                <div style={{ width: '24px' }}></div>
            </header>

            <div className="page-content">
                <div className="messenger-list" id="student-notifications-list">
                    {notifications.length === 0 && !loading ? (
                        <div className="messenger-empty">
                            <ChatCenteredText size={64} weight="thin" />
                            <p>No new messages from management.</p>
                        </div>
                    ) : (
                        notifications.map((n, i) => {
                            const Icon = getIcon(n.title, n.message);
                            const date = new Date(n.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                            return (
                                <div key={i} className="msg-item">
                                    <div className="msg-avatar">
                                        <Icon weight="fill" size={24} />
                                    </div>
                                    <div className="msg-content">
                                        <div className="msg-bubble" style={{ borderRadius: '20px 20px 20px 4px' }}>
                                            <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: '0 0 4px 0' }}>{n.title}</h4>
                                            <p style={{ margin: 0, fontSize: '0.9rem' }}>{n.message}</p>
                                        </div>
                                        <span className="msg-time">{date}</span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationsView;
