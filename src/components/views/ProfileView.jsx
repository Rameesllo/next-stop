import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const ProfileView = ({ onSignOut }) => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
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
                    email: profileData?.email || session.user.email,
                    routeName: profileData?.routes?.name || 'Not Assigned',
                    busNumber: profileData?.routes?.bus_number || 'N/A',
                    registerNumber: profileData?.register_number || 'REG2024089',
                    course: profileData?.course || 'Bachelor of Science (CS)',
                    academicYear: profileData?.academic_year || '2024-2027',
                });
            }
        } catch (err) {
            console.error("Profile fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div id="view-profile" className="view active">
            <header className="app-header" style={{ background: 'transparent', boxShadow: 'none' }}>
                <div className="header-title" style={{ color: 'var(--color-deep-teal)', fontFamily: 'var(--font-display)', fontWeight: 800 }}>Identity Pass</div>
            </header>

            <div className="page-content" style={{ paddingBottom: '100px' }}>
                <div className="vid-container">
                    <div className="vid-card animate-scale-in">
                        <div className="vid-header">
                            <div className="vid-profile">
                                <div className="vid-avatar">
                                    {profile?.avatarUrl ? (
                                        <img src={profile.avatarUrl} alt="Student" />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e6f7f5', fontSize: '2.25rem' }}>
                                            {profile?.fullName?.charAt(0) || 'S'}
                                        </div>
                                    )}
                                </div>
                                <div className="vid-info">
                                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>{profile?.fullName || 'Loading...'}</h3>
                                    <p style={{ fontWeight: 600, color: 'var(--color-teal)' }}>{profile?.course}</p>
                                </div>
                            </div>

                            <div className="vid-qr">
                                <i className="ph-fill ph-qr-code"></i>
                            </div>
                        </div>

                        <div className="vid-details">
                            <div className="vid-detail-item">
                                <label style={{ fontFamily: 'var(--font-family)', fontWeight: 700, fontSize: '0.7rem' }}>Admission No.</label>
                                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{profile?.admissionNumber}</span>
                            </div>
                            <div className="vid-detail-item">
                                <label style={{ fontFamily: 'var(--font-family)', fontWeight: 700, fontSize: '0.7rem' }}>Register No.</label>
                                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{profile?.registerNumber}</span>
                            </div>
                            <div className="vid-detail-item">
                                <label style={{ fontFamily: 'var(--font-family)', fontWeight: 700, fontSize: '0.7rem' }}>Email Address</label>
                                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.8rem' }}>{profile?.email}</span>
                            </div>
                            <div className="vid-detail-item">
                                <label style={{ fontFamily: 'var(--font-family)', fontWeight: 700, fontSize: '0.7rem' }}>Route & Boarding</label>
                                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{profile?.routeName}</span>
                            </div>
                            <div className="vid-detail-item">
                                <label style={{ fontFamily: 'var(--font-family)', fontWeight: 700, fontSize: '0.7rem' }}>Bus Details</label>
                                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Bus #{profile?.busNumber}</span>
                            </div>
                            <div className="vid-detail-item">
                                <label style={{ fontFamily: 'var(--font-family)', fontWeight: 700, fontSize: '0.7rem' }}>Academic Year</label>
                                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{profile?.academicYear}</span>
                            </div>
                        </div>

                        <div className="vid-footer">
                            <div className="vid-validity">
                                <div className="status-dot"></div>
                                <span>VALID PASS</span>
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.7 }}>Exp: DEC 2026</span>
                        </div>

                        {/* Security Hash Visualization */}
                        <div style={{ textAlign: 'center', marginTop: '20px', opacity: 0.4, fontHex: '0.5rem', letterSpacing: '2px', borderTop: '1px dashed rgba(31, 79, 74, 0.2)', paddingTop: '10px', fontSize: '10px' }}>
                            SHA256: 9f86d081884c7d659a2feaa0c55ad015
                        </div>
                    </div>
                </div>

                <div className="section-container mt-8">
                    <div className="card-interactive" onClick={onSignOut} style={{
                        padding: '16px',
                        background: 'white',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        boxShadow: 'var(--shadow-sm)',
                        border: '1px solid var(--color-gray-100)'
                    }}>
                        <div style={{
                            width: '44px',
                            height: '44px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: 'var(--color-error)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.25rem'
                        }}>
                            <i className="ph ph-sign-out"></i>
                        </div>
                        <div style={{ flex: 1 }}>
                            <h4 style={{ margin: 0, color: 'var(--color-gray-900)' }}>Sign Out</h4>
                            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--color-gray-500)' }}>Securely log out of your session</p>
                        </div>
                        <i className="ph ph-caret-right" style={{ color: 'var(--color-gray-300)' }}></i>
                    </div>
                </div>
            </div>

            {/* Custom styles moved to pages.css but adding overrides here for perfect parity */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .vid-container {
                    padding: 0 var(--space-4);
                }
                .vid-card {
                    background: linear-gradient(135deg, #E0F2F1 0%, #C9D8CF 50%, #F4EFEA 100%);
                    border-radius: 32px;
                    padding: 32px 24px;
                    color: var(--color-deep-teal);
                    position: relative;
                    overflow: hidden;
                    box-shadow: var(--shadow-line-strong), var(--shadow-tactile), 0 20px 40px -10px rgba(31, 79, 74, 0.15);
                    border: 1px solid rgba(255, 255, 255, 0.8);
                }
                .vid-card::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background-image: 
                        linear-gradient(rgba(47, 168, 143, 0.04) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(47, 168, 143, 0.04) 1px, transparent 1px);
                    background-size: 24px 24px;
                    pointer-events: none;
                    z-index: 0;
                    mask-image: radial-gradient(circle at top right, black, transparent 70%);
                }
                .vid-card::after {
                    content: '';
                    position: absolute;
                    top: -50px;
                    right: -50px;
                    width: 200px;
                    height: 200px;
                    background: radial-gradient(circle, rgba(168, 207, 198, 0.2) 0%, transparent 70%);
                    border-radius: 50%;
                }
                .vid-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    position: relative;
                    z-index: 1;
                }
                .vid-profile {
                    display: flex;
                    gap: 16px;
                    align-items: center;
                }
                .vid-avatar {
                    width: 72px;
                    height: 72px;
                    border-radius: 22px;
                    background: white;
                    padding: 3px;
                    box-shadow: var(--shadow-line-strong), var(--shadow-tactile);
                    overflow: hidden;
                }
                .vid-avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    border-radius: 19px;
                }
                .vid-info h3 {
                    margin: 0;
                    color: var(--color-deep-teal);
                    font-size: 1.25rem;
                    font-weight: 800;
                    font-family: var(--font-display);
                }
                .vid-info p {
                    margin: 0;
                    color: var(--color-teal);
                    font-size: 0.875rem;
                    font-weight: 600;
                }
                .vid-qr {
                    background-color: white;
                    padding: 8px;
                    border-radius: 16px;
                    width: 56px;
                    height: 56px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: var(--shadow-line-strong), var(--shadow-tactile);
                }
                .vid-qr i {
                    color: var(--color-deep-teal);
                    font-size: 2.5rem;
                }
                .vid-details {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    margin-bottom: 32px;
                    position: relative;
                    z-index: 1;
                }
                .vid-detail-item {
                    background: rgba(255, 255, 255, 0.4);
                    padding: 12px 16px;
                    border-radius: 16px;
                    border: 1px solid rgba(168, 207, 198, 0.2);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .vid-detail-item label {
                    font-size: 0.75rem;
                    color: var(--color-teal);
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .vid-detail-item span {
                    font-size: 0.9375rem;
                    font-weight: 700;
                    color: var(--color-deep-teal);
                }
                .vid-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-top: 16px;
                    border-top: 1px dashed rgba(168, 207, 198, 0.3);
                    position: relative;
                    z-index: 1;
                }
                .vid-validity {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(16, 185, 129, 0.1);
                    padding: 6px 12px;
                    border-radius: 100px;
                    border: 1px solid rgba(16, 185, 129, 0.2);
                }
                .status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background-color: #10b981;
                    box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
                    animation: pulse 2s infinite;
                }
                .vid-validity span {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #059669;
                }
                @keyframes pulse {
                    0% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.2); }
                    100% { opacity: 1; transform: scale(1); }
                }
            ` }} />
        </div >
    );
};

export default ProfileView;
