import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, UserGear, LockKey, Spinner } from '@phosphor-icons/react';

const DriverLoginView = ({ onBack, onLoginSuccess }) => {
    const [driverId, setDriverId] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!driverId || !password) {
            setError('Please enter your Driver ID and password.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const isRoutePass = (password === '123' || password === '1234');
            const routeMapping = { '123': 'route-kondotty', '1234': 'route-calicut' };

            if (isRoutePass) {
                localStorage.setItem('driver_assigned_route', routeMapping[password]);
                localStorage.setItem('nextstop_role', 'driver');
                onLoginSuccess();
                return; // Skip Supabase auth for bypass accounts
            }

            const emailAlias = driverId.includes('@') ? driverId : `${driverId}@nextstop.com`;

            const { data, error } = await supabase.auth.signInWithPassword({
                email: emailAlias,
                password: password
            });

            if (error) {
                setError('Invalid Driver ID or Password.');
            } else {
                localStorage.setItem('nextstop_role', 'driver');
                onLoginSuccess();
            }
        } catch (err) {
            setError('System Error. Could not connect to the secure server.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div id="view-driver-login" className="view active">
            <div className="auth-page pt-safe">
                <button className="btn-icon btn-outline" onClick={onBack}>
                    <ArrowLeft size={24} />
                </button>

                <div className="auth-header" style={{ textAlign: 'center' }}>
                    <h2 style={{ color: 'var(--color-deep-teal)', fontFamily: 'var(--font-display)', fontWeight: 800 }}>Driver Console</h2>
                    <p style={{ fontWeight: 600 }}>Secure login for authorized bus personnel</p>
                </div>

                <form className="auth-form" onSubmit={handleLogin}>
                    <div className="form-group">
                        <label className="form-label">Driver ID</label>
                        <div className="input-wrapper">
                            <UserGear className="input-icon" size={20} />
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Enter Driver ID"
                                value={driverId}
                                onChange={(e) => setDriverId(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Secure Password</label>
                        <div className="input-wrapper">
                            <LockKey className="input-icon" size={20} />
                            <input
                                type="password"
                                className="form-input"
                                placeholder="Enter Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {error && <div className="error-message" style={{ color: 'var(--color-error)', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</div>}

                    <div className="auth-actions">
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? <Spinner className="ph-spin" size={20} /> : 'Verify & Login'}
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
};

export default DriverLoginView;
