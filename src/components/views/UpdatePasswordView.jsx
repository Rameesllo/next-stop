import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

const UpdatePasswordView = ({ onComplete }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) {
                setError(error.message);
            } else {
                setSuccess(true);
                setTimeout(() => onComplete(), 2000);
            }
        } catch (err) {
            setError('Failed to update password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div id="view-update-password" className="view active">
            <div className="auth-page pt-safe">
                <div className="auth-box-bg"></div>

                <div className="auth-card animate-slide-up">
                    <div className="auth-header" style={{ textAlign: 'center' }}>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>New Password</h2>
                        <p style={{ fontWeight: 600 }}>Create a secure password for your account</p>
                    </div>

                    <form className="auth-form" onSubmit={handleUpdate}>
                        <div className="form-group">
                            <label className="form-label">New Password</label>
                            <div className="input-wrapper">
                                <i className="ph ph-lock input-icon"></i>
                                <input
                                    type="password"
                                    className="form-input"
                                    placeholder="At least 6 characters"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Confirm Password</label>
                            <div className="input-wrapper">
                                <i className="ph ph-check-square input-icon"></i>
                                <input
                                    type="password"
                                    className="form-input"
                                    placeholder="Repeat new password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {error && <div className="error-message" style={{ color: '#ef4444', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem', fontWeight: 700 }}>{error}</div>}
                        {success && <div className="success-message" style={{ color: '#14b8a6', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem', fontWeight: 800 }}>Password updated! Redirecting...</div>}

                        <div className="auth-actions">
                            <button type="submit" className="btn-v4-primary" disabled={loading} style={{ padding: '16px', fontSize: '1.1rem' }}>
                                {loading ? <i className="ph ph-spinner ph-spin"></i> : (
                                    <>
                                        <span>Update Now</span>
                                        <i className="ph ph-check-circle"></i>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default UpdatePasswordView;
