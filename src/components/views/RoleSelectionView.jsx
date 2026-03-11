import React, { useState } from 'react';

const RoleSelectionView = ({ onSelectRole }) => {
    const [clickCount, setClickCount] = useState(0);

    const handleSecretClick = () => {
        const next = clickCount + 1;
        if (next >= 7) {
            onSelectRole('admin');
            setClickCount(0);
        } else {
            setClickCount(next);
        }
    };

    // Placeholder for profile, as RoleSelectionView doesn't inherently have a profile prop
    // This structure seems to be intended for a different component or assumes a profile context.
    // For now, it will display 'S' as profile is undefined.
    const profile = undefined;

    return (
        <div id="view-role" className="view active" style={{ background: 'linear-gradient(to bottom, #fffef9 0%, #f1f5f9 100%)' }}>
            <div className="role-selection-container-v4">
                <div className="role-header-v4 animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className="brand-logo-container" style={{ marginBottom: '20px' }}>
                        <img src="/logo.jpg" alt="NextStop Logo" style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '15px', boxShadow: 'var(--shadow-lg)' }} />
                    </div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, marginTop: '8px', textAlign: 'center' }}>Welcome to Next Stop</h1>
                    <p style={{ fontWeight: 600 }}>Select your role to continue</p>
                </div>

                <div className="role-stack-v4">
                    {/* Student Card */}
                    <div className="role-card-v4 animate-scale-in" onClick={() => onSelectRole('student')}>
                        <div className="role-icon-circle-v4">
                            <i className="ph-fill ph-student"></i>
                        </div>
                        <div className="role-text-v4">
                            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>Student Login</h3>
                            <p style={{ fontWeight: 500 }}>Track bus & manage fee</p>
                        </div>
                    </div>

                    {/* Driver Card */}
                    <div className="role-card-v4 animate-scale-in" style={{ animationDelay: '0.1s' }} onClick={() => onSelectRole('driver')}>
                        <div className="role-icon-circle-v4">
                            <i className="ph-fill ph-steering-wheel"></i>
                        </div>
                        <div className="role-text-v4">
                            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>Driver Login</h3>
                            <p style={{ fontWeight: 500 }}>Manage trips & routes</p>
                        </div>
                    </div>
                </div>

                {/* Subtle Admin Link */}
                <div className="admin-subtle-link" onClick={() => onSelectRole('admin')}>
                    <span>System Administration</span>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .role-selection-container-v4 {
                    min-height: 100vh;
                    padding: 60px 24px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                }
                .admin-subtle-link {
                    position: absolute;
                    bottom: 40px;
                    color: #cbd5e1;
                    font-size: 0.8rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    letter-spacing: 0.5px;
                }
                .admin-subtle-link:hover {
                    color: #94a3b8;
                    text-decoration: underline;
                }
                .brand-pin-v4 {
                    width: 50px;
                    height: 50px;
                    color: #14b8a6;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2.8rem;
                    margin-bottom: 16px;
                }
                .role-header-v4 {
                    text-align: center;
                    margin-bottom: 32px;
                }
                .role-header-v4 h1 {
                    font-size: 1.8rem;
                    font-weight: 800;
                    color: #004d40;
                    margin: 0;
                    letter-spacing: -0.5px;
                }
                .role-header-v4 p {
                    color: #14b8a6;
                    font-size: 1rem;
                    margin-top: 4px;
                    font-weight: 600;
                }
                .role-stack-v4 {
                    width: 100%;
                    max-width: 340px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .role-card-v4 {
                    background: white;
                    padding: 24px 20px;
                    border-radius: 28px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    gap: 12px;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 10px 25px rgba(0,0,0,0.03);
                    border: 1px solid rgba(241, 245, 249, 1);
                }
                .role-card-v4:active {
                    transform: scale(0.97);
                    box-shadow: 0 4px 10px rgba(0,0,0,0.05);
                }
                .role-icon-circle-v4 {
                    width: 56px;
                    height: 56px;
                    background: #14b8a6;
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                    box-shadow: 0 6px 15px rgba(20, 184, 166, 0.2);
                }
                .role-text-v4 h3 {
                    margin: 0;
                    font-size: 1.15rem;
                    font-weight: 800;
                    color: #0f172a;
                }
                .role-text-v4 p {
                    margin: 4px 0 0 0;
                    font-size: 0.85rem;
                    color: #64748b;
                    font-weight: 500;
                }

                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes scale-in {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in { animation: fade-in 0.8s ease-out forwards; }
                .animate-scale-in { animation: scale-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
            ` }} />
        </div>
    );
};

export default RoleSelectionView;
