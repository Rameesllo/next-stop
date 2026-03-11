import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, UserGear, LockKey, Spinner } from '@phosphor-icons/react';

const AdminLoginView = ({ onBack, onLoginSuccess }) => {
    const [adminId, setAdminId] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!adminId || !password) {
            setError('Please enter your Admin ID and password.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            if (password === 'admin123') {
                localStorage.setItem('nextstop_role', 'admin');
                onLoginSuccess();
                return;
            }

            const emailAlias = adminId.includes('@') ? adminId : `${adminId}@nextstop.com`;

            const { data, error } = await supabase.auth.signInWithPassword({
                email: emailAlias,
                password: password
            });

            if (error) {
                setError('Invalid Admin Credentials.');
            } else {
                localStorage.setItem('nextstop_role', 'admin');
                onLoginSuccess();
            }
        } catch (err) {
            setError('System Error. Could not connect to the server.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div id="view-admin-login" className="view active">
            <div className="auth-page pt-safe">
                <button className="btn-icon btn-outline" onClick={onBack}>
                    <ArrowLeft size={24} />
                </button>

                <div className="auth-header" style={{ textAlign: 'center' }}>
                    <h2 style={{ color: 'var(--color-deep-teal)', fontFamily: 'var(--font-display)', fontWeight: 800 }}>Admin Portal</h2>
                    <p style={{ fontWeight: 600 }}>Secure access for college administrators</p>
                </div>

                <form className="auth-form" onSubmit={handleLogin}>
                    <div className="form-group">
                        <label className="form-label">Admin ID</label>
                        <div className="input-wrapper">
                            <UserGear className="input-icon" size={20} />
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Enter Admin ID"
                                value={adminId}
                                onChange={(e) => setAdminId(e.target.value)}
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
                        <button type="submit" className="btn btn-primary" disabled={loading} style={{ backgroundColor: 'var(--color-deep-teal)' }}>
                            {loading ? <Spinner className="ph-spin" size={20} /> : 'Login as Admin'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminLoginView;
