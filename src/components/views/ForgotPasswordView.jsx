import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

const ForgotPasswordView = ({ onBack }) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleReset = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const emailAlias = email.includes('@') ? email : `${email}@nextstop.com`;

            const { error } = await supabase.auth.resetPasswordForEmail(emailAlias, {
                redirectTo: window.location.origin,
            });

            if (error) {
                setError(error.message);
            } else {
                setMessage('Recovery link sent! Check your inbox.');
            }
        } catch (err) {
            setError('Could not connect to service.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div id="view-forgot-password" className="view active">
            <div className="auth-page pt-safe">
                <div className="auth-box-bg"></div>

                <button className="btn-icon btn-outline auth-back-btn" onClick={onBack}>
                    <i className="ph ph-arrow-left"></i>
                </button>

                <div className="auth-card animate-slide-up">
                    <div className="auth-header" style={{ textAlign: 'center' }}>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>Reset Password</h2>
                        <p style={{ fontWeight: 600 }}>We'll send a recovery link to your email</p>
                    </div>

                    <form className="auth-form" onSubmit={handleReset}>
                        <div className="form-group">
                            <label className="form-label">Registered Email</label>
                            <div className="input-wrapper">
                                <i className="ph ph-envelope-simple input-icon"></i>
                                <input
                                    type="email"
                                    className="form-input"
                                    placeholder="your-email@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {error && <div className="error-message" style={{ color: '#ef4444', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem', fontWeight: 700 }}>{error}</div>}
                        {message && <div className="success-message" style={{ color: '#14b8a6', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem', fontWeight: 800 }}>{message}</div>}

                        <div className="auth-actions">
                            <button type="submit" className="btn-v4-primary" disabled={loading} style={{ padding: '16px', fontSize: '1.1rem' }}>
                                {loading ? <i className="ph ph-spinner ph-spin"></i> : (
                                    <>
                                        <span>Send Link</span>
                                        <i className="ph ph-paper-plane-tilt"></i>
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

export default ForgotPasswordView;
