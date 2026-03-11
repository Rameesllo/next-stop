import React, { useState, useEffect } from 'react';
import { supabase, supabaseAdmin } from '../../lib/supabase';

const AdminDashboard = ({ onSignOut }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [metrics, setMetrics] = useState({ students: 0, routes: 0, fees: 0 });
    const [students, setStudents] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [financeRecords, setFinanceRecords] = useState([]);
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    const [modalState, setModalState] = useState({ type: null, data: null, active: false });

    useEffect(() => { loadAdminData(); }, []);

    const loadAdminData = async () => {
        setLoading(true);
        try {
            const { data: rd } = await supabase.from('routes').select('*').order('name');
            const { data: sd } = await supabase.from('profiles').select('*, routes!route_id(name, bus_number)').eq('role', 'student').order('full_name');
            const { data: nd } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(10);
            const { data: fd } = await supabase.from('fee_payments').select('*, profiles(full_name, admission_number, course, academic_year)').order('id');
            const { data: hd } = await supabase.from('payment_history').select('*, profiles(full_name, admission_number, course, academic_year)').order('date', { ascending: false });

            setRoutes(rd || []);
            setStudents(sd || []);
            setNotifications(nd || []);
            setFinanceRecords(fd || []);
            setPaymentHistory(hd || []);

            setMetrics({
                students: sd?.length || 0,
                routes: rd?.length || 0,
                fees: fd?.reduce((s, f) => s + (f.amount_paid || 0), 0) || 0
            });
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const handleBroadcast = async (p) => {
        const { error } = await supabase.from('notifications').insert([p]);
        if (!error) { loadAdminData(); alert('Announcement Published'); }
    };

    const openModal = (type, data = null) => setModalState({ type, data, active: true });
    const closeModal = () => setModalState({ type: null, data: null, active: false });

    return (
        <div id="view-admin-dashboard" className="view active student-themed-admin">
            <header className="student-dash-header">
                <div className="user-identity">
                    <div className="avatar-box" style={{ background: 'var(--color-teal)', color: 'white' }}>
                        <i className="ph-fill ph-shield-checkered" style={{ fontSize: '1.5rem' }}></i>
                    </div>
                    <div className="user-meta">
                        <h3>Admin Portal</h3>
                        <p>Next Stop Management</p>
                    </div>
                </div>
                <button className="notification-btn" onClick={onSignOut}>
                    <i className="ph ph-sign-out"></i>
                </button>
            </header>

            <div className="year-tabs" style={{ padding: '12px 20px', background: 'white', borderBottom: '1px solid var(--color-gray-100)', overflowX: 'auto', display: 'flex', gap: '8px', margin: 0 }}>
                {['overview', 'students', 'routes', 'announcements', 'finance'].map(t => (
                    <div key={t} className={`year-tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)} style={{ whiteSpace: 'nowrap' }}>
                        {t === 'announcements' ? 'ANNOUNCEMENTS' : t.toUpperCase()}
                    </div>
                ))}
            </div>

            <main className="page-content">
                {loading ? (
                    <div className="loader-placeholder"><i className="ph ph-spinner ph-spin"></i><p>Loading Dashboard...</p></div>
                ) : (
                    <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
                        {activeTab === 'overview' && <OverviewUI metrics={metrics} routes={routes} />}
                        {activeTab === 'students' && (
                            <div style={{ width: '100%', overflowX: 'auto' }}>
                                <StudentsUI students={students} onAdd={() => openModal('student')} onEdit={s => openModal('student', s)} load={loadAdminData} />
                            </div>
                        )}
                        {activeTab === 'routes' && (
                            <RoutesUI routes={routes} onAdd={() => openModal('route')} onEdit={r => openModal('route', r)} load={loadAdminData} />
                        )}
                        {activeTab === 'announcements' && <NewsUI notifications={notifications} onSubmit={handleBroadcast} load={loadAdminData} />}
                        {activeTab === 'finance' && (
                            <div style={{ width: '100%', overflowX: 'auto' }}>
                                <FinanceUI records={financeRecords} onRefresh={loadAdminData} onLog={() => openModal('payment')} onHistory={id => openModal('history', id)} />
                            </div>
                        )}
                    </div>
                )}
            </main>

            {modalState.active && (
                <div className="modal-overlay active" onClick={closeModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ borderRadius: '28px', maxWidth: modalState.type === 'history' ? '600px' : '480px', padding: 0 }}>
                        {modalState.type === 'student' && <StudentForm student={modalState.data} routes={routes} onSave={loadAdminData} onClose={closeModal} />}
                        {modalState.type === 'route' && <RouteForm route={modalState.data} onSave={loadAdminData} onClose={closeModal} />}
                        {modalState.type === 'payment' && <PaymentForm students={students} preSelectedStudentId={modalState.data} onSave={loadAdminData} onClose={closeModal} />}
                        {modalState.type === 'history' && <HistoryFlow studentId={modalState.data} history={paymentHistory.filter(p => p.student_id === modalState.data)} student={students.find(s => s.id === modalState.data)} onLogForStudent={(id) => openModal('payment', id)} onRefresh={loadAdminData} onClose={closeModal} />}
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                .student-themed-admin { background: #fdfaf7; min-height: 100vh; font-family: 'Outfit', sans-serif; padding-bottom: 40px; }
                .admin-stats-card { background: white; padding: 32px; border-radius: 32px; border: 1px solid #f0f0f0; margin-bottom: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.02); }
                .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 32px; }
                .stat-card-v2 { background: white; padding: 24px; border-radius: 28px; border: 1.5px solid #f5f5f5; transition: 0.3s; position: relative; overflow: hidden; }
                .stat-card-v2:hover { transform: translateY(-5px); box-shadow: 0 12px 25px rgba(0,0,0,0.04); border-color: var(--color-teal); }
                .stat-icon-v2 { width: 56px; height: 56px; border-radius: 18px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin-bottom: 20px; }
                .stat-label-v2 { font-size: 0.8rem; font-weight: 800; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
                .stat-value-v2 { font-size: 1.8rem; font-weight: 950; color: #00332c; margin: 0; }
                .stat-trend { font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; gap: 4px; margin-top: 10px; }
                
                .welcome-banner { background: linear-gradient(135deg, #0d443c 0%, #14b8a6 100%); padding: 40px; border-radius: 32px; color: white; margin-bottom: 32px; position: relative; overflow: hidden; }
                .welcome-banner::after { content: ''; position: absolute; right: -50px; bottom: -50px; width: 200px; height: 200px; background: rgba(255,255,255,0.05); border-radius: 50%; }
                .welcome-banner h2 { font-size: 2.2rem; font-weight: 900; margin: 0 0 10px 0; }
                .welcome-banner p { font-size: 1rem; opacity: 0.9; margin: 0; font-weight: 500; }

                .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
                .mini-card { background: rgba(255,255,255,0.1); padding: 16px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); }
                .section-title-alt { font-size: 1.25rem; font-weight: 900; color: #00332c; margin-bottom: 24px; display: flex; align-items: center; gap: 12px; }
                .btn-add-full { background: var(--color-teal); color: white; border: none; padding: 12px 24px; border-radius: 100px; font-weight: 700; font-size: 0.95rem; cursor: pointer; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 24px; transition: 0.2s; }
                .btn-add-full:hover { opacity: 0.9; transform: translateY(-1px); }
                
                /* Dense Ledger / Registry Table */
                .ledger-container { background: white; border-radius: 24px; border: 1px solid #f1f1f1; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.02); overflow: hidden; }
                .finance-optimized-scroll { overflow-x: auto !important; -webkit-overflow-scrolling: touch; }
                .ledger-table { width: 100%; border-collapse: collapse; text-align: left; table-layout: auto; }
                .finance-optimized-scroll .ledger-table { min-width: 800px; }
                .ledger-header { background: #f7f0e8; }
                .ledger-header th { padding: 14px 15px; font-size: 0.75rem; font-weight: 800; color: #5a5a5a; text-transform: uppercase; letter-spacing: 0.5px; }
                .ledger-row { border-bottom: 1px solid #f9f9f9; transition: 0.2s; }
                .ledger-row td { padding: 16px 15px; vertical-align: middle; font-size: 0.9rem; line-height: 1.4; color: #333; }
                
                /* Finance specific horizontal lock */
                .finance-optimized-scroll .ledger-row td { white-space: nowrap; }
                .finance-info-group { white-space: normal !important; }
                
                .student-cell { min-width: 150px; white-space: normal !important; }
                .student-cell h4 { margin: 0; color: #00332c; font-size: 1rem; font-weight: 800; }
                .student-cell p { margin: 3px 0 0 0; font-size: 0.75rem; color: #0d6b5f; font-weight: 600; line-height: 1.3; }
                .route-cell-meta { color: #0d6b5f; font-weight: 700; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.3px; }
                
                .pill-btn { width: 44px; height: 44px; border-radius: 50%; border: 1.5px solid var(--color-teal); background: white; color: var(--color-teal); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; font-size: 1.1rem; }
                .pill-btn:hover { background: var(--color-teal); color: white; transform: scale(1.05); }
                .pill-btn.err { border-color: #ef4444; color: #ef4444; }
                .pill-btn.err:hover { background: #ef4444; color: white; }

                .status-badge { text-transform: uppercase; letter-spacing: 0.5px; }
                .status-paid { background: #ecfdf5; color: #059669; }
                .status-pending { background: #fef2f2; color: #ef4444; }

                /* Premium Form V3 */
                .form-v3-header { padding: 24px 30px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f5f5f5; }
                .form-v3-header h3 { margin: 0; color: #00332c; font-size: 1.35rem; font-weight: 900; }
                .form-v3-content { padding: 30px; max-height: 85vh; overflow-y: auto; }
                .photo-upload-section { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-bottom: 32px; }
                .photo-avatar-placeholder { width: 100px; height: 100px; background: #eaeff2; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #333; font-size: 2.5rem; }
                .upload-link { color: var(--color-teal); font-size: 0.9rem; font-weight: 800; text-decoration: none; cursor: pointer; }
                .form-v3-label { display: block; font-size: 0.95rem; font-weight: 700; color: #333; margin-bottom: 10px; }
                .form-v3-input { width: 100%; padding: 15px 20px; border-radius: 16px; border: 1.5px solid #ececec; margin-bottom: 24px; font-size: 1rem; font-family: inherit; transition: 0.2s; background: #fff; }
                .form-v3-input::placeholder { color: #b0bec5; font-weight: 400; }
                .form-v3-input:focus { border-color: var(--color-teal); outline: none; background: #fff; box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.05); }
                
                /* Route Card Styling */
                .route-item-card { background: white; padding: 20px 24px; border-radius: 20px; border: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.01); transition: 0.2s; }
                .route-item-card:hover { transform: translateX(4px); box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
                .route-info-box h4 { margin: 0; font-size: 1.15rem; font-weight: 900; color: #14b8a6; text-transform: uppercase; letter-spacing: 0.5px; }
                .route-info-box p { margin: 6px 0 0 0; font-size: 0.9rem; color: #4b5563; font-weight: 600; }

                /* Overview Route List */
                .overview-route-list { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; border-top: 1px dashed rgba(20, 184, 166, 0.2); padding-top: 16px; }
                .overview-route-pill { display: flex; align-items: center; gap: 10px; background: white; padding: 10px 14px; border-radius: 12px; border: 1px solid #f0fdfa; }
                .route-dot { width: 6px; height: 6px; background: var(--color-teal); border-radius: 50%; box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.1); }
                .route-name { font-size: 0.85rem; font-weight: 800; color: #333; flex: 1; }
                .route-bus { font-size: 0.75rem; font-weight: 900; color: var(--color-teal); background: var(--color-teal-100); padding: 2px 8px; border-radius: 6px; }
            ` }} />
        </div>
    );
};

const OverviewUI = ({ metrics, routes }) => (
    <div className="animate-fade-in">
        <div className="stat-grid">
            <div className="stat-card-v2" style={{ background: '#f0fdfa', borderColor: '#14b8a622' }}>
                <div className="stat-icon-v2" style={{ background: 'var(--color-teal)', color: 'white' }}><i className="ph-fill ph-student"></i></div>
                <div className="stat-label-v2" style={{ color: '#0d6b5f' }}>Students</div>
                <h3 className="stat-value-v2" style={{ color: '#00332c' }}>{metrics.students}</h3>
                <div className="stat-trend" style={{ color: 'var(--color-teal)' }}><i className="ph ph-check-circle"></i> Active Registry</div>
            </div>

            <div className="stat-card-v2" style={{ background: '#f0fdfa', borderColor: '#14b8a622' }}>
                <div className="stat-icon-v2" style={{ background: 'var(--color-teal)', color: 'white' }}><i className="ph-fill ph-map-trifold"></i></div>
                <div className="stat-label-v2" style={{ color: '#0d6b5f' }}>Routes</div>
                <h3 className="stat-value-v2" style={{ color: '#00332c' }}>{metrics.routes}</h3>
                <div className="stat-trend" style={{ color: 'var(--color-teal)', marginBottom: '12px' }}><i className="ph ph-bus"></i> Live Corridors</div>

                <div className="overview-route-list">
                    {routes.map(r => (
                        <div key={r.id} className="overview-route-pill">
                            <span className="route-dot"></span>
                            <span className="route-name">{r.name}</span>
                            <span className="route-bus">#{r.bus_number}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

const StudentsUI = ({ students, onAdd, onEdit, load }) => (
    <div className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h4 className="section-title-alt">Manage Students</h4>
            <div style={{ width: '250px' }}>
                <button className="btn-add-full" onClick={onAdd}><i className="ph ph-plus-bold"></i> Add</button>
            </div>
        </div>

        <div className="ledger-container">
            <table className="ledger-table">
                <thead className="ledger-header">
                    <tr>
                        <th style={{ width: '50%' }}>Name & Admission</th>
                        <th style={{ width: '25%' }}>Route</th>
                        <th style={{ width: '25%' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {students.map(s => (
                        <tr key={s.id} className="ledger-row">
                            <td className="student-cell">
                                <h4>{s.full_name}</h4>
                                <p>{s.email} • {s.course} • {s.admission_number} • ({s.academic_year || '2023-26'})</p>
                            </td>
                            <td>
                                <div className="route-cell-meta">
                                    {s.routes?.name || 'LOGISTICS TBD'}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#666', fontWeight: 600 }}>({s.routes?.bus_number || 'N/A'})</div>
                            </td>
                            <td>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button className="pill-btn" onClick={() => onEdit(s)}><i className="ph ph-pencil-simple"></i></button>
                                    <button className="pill-btn err" onClick={async () => { if (confirm('Erase profile?')) { await supabase.from('profiles').delete().eq('id', s.id); load(); } }}><i className="ph ph-trash"></i></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const RoutesUI = ({ routes, onAdd, onEdit, load }) => (
    <div className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h4 className="section-title-alt">Manage Routes</h4>
            <div style={{ width: '250px' }}>
                <button className="btn-add-full" onClick={onAdd}><i className="ph ph-plus-bold"></i> New Route</button>
            </div>
        </div>

        <div className="routes-list">
            {routes.map((r) => (
                <div key={r.id} className="route-item-card">
                    <div className="route-info-box">
                        <h4>{r.name}</h4>
                        <p>Bus: {r.bus_number} • Capacity: {r.capacity} • Active</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="pill-btn" onClick={() => onEdit(r)}><i className="ph ph-pencil-simple"></i></button>
                        <button className="pill-btn err" onClick={async () => { if (confirm('Remove this route?')) { await supabase.from('routes').delete().eq('id', r.id); load(); } }}><i className="ph ph-trash"></i></button>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const NewsUI = ({ notifications, onSubmit, load }) => {
    const [title, setTitle] = useState('');
    const [msg, setMsg] = useState('');
    const [target, setTarget] = useState('all');
    return (
        <div className="animate-fade-in">
            <h4 className="section-title-alt" style={{ marginBottom: '24px' }}>Broadcast Notification</h4>

            <div style={{ background: 'white', padding: '30px', borderRadius: '32px', marginBottom: '32px', border: '1.5px solid #f0f0f0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <label className="form-v3-label">Notification Title</label>
                <input className="form-v3-input" placeholder="write title here..." value={title} onChange={e => setTitle(e.target.value)} />

                <label className="form-v3-label">Message Body</label>
                <textarea className="form-v3-input" placeholder="write your announcement to all students here..." style={{ minHeight: '120px', resize: 'none' }} value={msg} onChange={e => setMsg(e.target.value)} />

                <label className="form-v3-label">Target Audience</label>
                <select className="form-v3-input" value={target} onChange={e => setTarget(e.target.value)} style={{ appearance: 'none' }}>
                    <option value="all">All Students</option>
                    <option value="University">University Route</option>
                    <option value="Kondotty">Kondotty Route</option>
                </select>

                <button className="btn-add-full" style={{ padding: '16px', borderRadius: '18px', marginTop: '8px' }} onClick={() => { onSubmit({ title, message: msg, target_audience: target }); setTitle(''); setMsg(''); }}>
                    <i className="ph-fill ph-paper-plane-tilt"></i> Send Announcement Now
                </button>
            </div>

            <h4 className="section-title-alt" style={{ marginBottom: '20px', fontSize: '1rem', opacity: 0.5, fontWeight: 700 }}>RECENT BROADCASTS</h4>
            {notifications.map(n => (
                <div key={n.id} className="payment-card-premium" style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div className="status-icon" style={{ backgroundColor: 'rgba(20, 184, 166, 0.1)', color: 'var(--color-teal)' }}><i className="ph-fill ph-megaphone"></i></div>
                        <div className="payment-info"><h4>{n.title}</h4><p>{n.message}</p></div>
                    </div>
                    <button className="pill-btn err" style={{ width: '36px', height: '36px', fontSize: '1rem' }} onClick={async () => { if (confirm('Delete announcement?')) { await supabase.from('notifications').delete().eq('id', n.id); load(); } }}>
                        <i className="ph ph-trash"></i>
                    </button>
                </div>
            ))}
        </div>
    );
};

const FinanceUI = ({ records, onRefresh, onLog, onHistory }) => (
    <div className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ margin: 0, color: 'var(--color-teal)', fontWeight: 900, fontSize: '1.5rem' }}>Fee Collection Ledger</h3>
            <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn" style={{ background: 'white', border: '2px solid var(--color-teal)', color: 'var(--color-teal)', padding: '10px 20px', borderRadius: '16px', fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }} onClick={onRefresh}>
                    <i className="ph ph-arrows-clockwise" style={{ fontWeight: 800 }}></i> Refresh
                </button>
                <button className="btn btn-primary" style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', borderRadius: '16px' }} onClick={onLog}>
                    <i className="ph ph-plus-circle"></i> Log Payment
                </button>
            </div>
        </div>

        <div className="ledger-container finance-optimized-scroll">
            <table className="ledger-table">
                <thead className="ledger-header">
                    <tr>
                        <th>Student</th>
                        <th>Year</th>
                        <th>Total Due</th>
                        <th>Paid</th>
                        <th>Remaining</th>
                        <th>Stat</th>
                    </tr>
                </thead>
                <tbody>
                    {records.map(f => {
                        const paid = f.amount_paid || 0;
                        const due = f.total_due || 0;
                        const remaining = due - paid;
                        const isPaid = remaining <= 0;
                        return (
                            <tr key={f.id} className="ledger-row" onClick={() => onHistory(f.student_id)} style={{ cursor: 'pointer' }}>
                                <td className="student-cell">
                                    <h4>{f.profiles?.full_name}</h4>
                                    <p>{f.profiles?.course}</p>
                                </td>
                                <td style={{ fontSize: '0.9rem', color: '#666', fontWeight: 700 }}>{f.profiles?.academic_year || '2024-2025'}</td>
                                <td style={{ fontSize: '0.9rem', color: '#444', fontWeight: 700 }}>₹{due.toLocaleString()}</td>
                                <td style={{ fontWeight: 900, color: '#14b8a6' }}>₹{paid.toLocaleString()}</td>
                                <td style={{ fontSize: '0.9rem', color: '#444', fontWeight: 700 }}>₹{(remaining).toLocaleString()}</td>
                                <td><span className={`status-badge ${isPaid ? 'status-paid' : 'status-pending'}`} style={{ padding: '6px 14px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 900 }}>{isPaid ? 'PAID' : 'PENDING'}</span></td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    </div>
);

// --- MODALS ---

const COURSES = [
    "B.A. Economics Honours",
    "B.A. English Honours",
    "B.A. West Asian Studies Honours",
    "B.Com with Computer Application Honours",
    "B.Com with Co-operation Honours",
    "B.Sc. Biotechnology Honours",
    "B.Sc. Computer Science Honours",
    "B.Sc. Microbiology Honours",
    "B.Sc. Biochemistry Honours",
    "Bachelor of Business Administration Honours",
    "B.Sc. Mathematics and Physics Honours (Double Major)",
    "BVoc Islamic Finance",
    "BVoc Logistics Management",
    "BVoc Professional Accounting and Taxation"
];

const StudentForm = ({ student, routes, onSave, onClose }) => {
    const [f, setF] = useState(student ? { ...student } : { full_name: '', admission_number: '', course: '', email: '', password: '', route_id: '', total_due: 2500, academic_year: '', avatar_url: '' });
    const [sub, setSub] = useState(false);
    const [uploading, setUploading] = useState(false);

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setF({ ...f, avatar_url: publicUrl });
        } catch (err) {
            alert("Upload failed: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    const save = async (e) => {
        e.preventDefault(); setSub(true);
        try {
            if (student) {
                const payload = {
                    full_name: f.full_name,
                    admission_number: f.admission_number,
                    course: f.course || 'General',
                    route_id: f.route_id || null,
                    academic_year: f.academic_year,
                    avatar_url: f.avatar_url
                };
                await supabase.from('profiles').update(payload).eq('id', student.id);
            } else {
                const { data: auth, error: authErr } = await supabaseAdmin.auth.admin.createUser({ email: f.email, password: f.password, user_metadata: { role: 'student' }, email_confirm: true });
                if (authErr) throw authErr;
                const { error: profErr } = await supabase.from('profiles').insert({
                    id: auth.user.id,
                    full_name: f.full_name,
                    email: f.email,
                    admission_number: f.admission_number,
                    course: f.course || 'General',
                    route_id: f.route_id || null,
                    role: 'student',
                    academic_year: f.academic_year,
                    avatar_url: f.avatar_url
                });
                if (profErr) throw profErr;
                await supabase.from('fee_payments').insert({ student_id: auth.user.id, total_due: f.total_due || 2500, amount_paid: 0 });
            }
            onSave(); onClose();
        } catch (err) { alert(err.message); } finally { setSub(false); }
    };

    return (
        <div className="animate-fade-in-up">
            <div className="form-v3-header">
                <h3>{student ? 'Edit Student' : 'Add Student'}</h3>
                <i className="ph ph-x" onClick={onClose} style={{ cursor: 'pointer', fontSize: '1.2rem', color: '#333' }}></i>
            </div>
            <form onSubmit={save} className="form-v3-content">
                <div className="photo-upload-section">
                    <div className="photo-avatar-placeholder" style={{ position: 'relative', overflow: 'hidden' }}>
                        {f.avatar_url ? (
                            <img src={f.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <i className="ph ph-user"></i>
                        )}
                        {uploading && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyCenter: 'center' }}>
                                <i className="ph ph-spinner ph-spin" style={{ fontSize: '1.5rem', color: 'var(--color-teal)' }}></i>
                            </div>
                        )}
                    </div>
                    <label className="upload-link">
                        {f.avatar_url ? 'Change Photo' : 'Upload Profile Photo'}
                        <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                    </label>
                </div>

                {!student && (
                    <>
                        <label className="form-v3-label">Email Address (Login ID)</label>
                        <input className="form-v3-input" placeholder="student@college.edu" required value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
                        <label className="form-v3-label">Temporary Password</label>
                        <input className="form-v3-input" type="password" placeholder="At least 6 characters" required value={f.password} onChange={e => setF({ ...f, password: e.target.value })} />
                    </>
                )}

                <label className="form-v3-label">Full Name</label>
                <input className="form-v3-input" placeholder="Enter Full Name" required value={f.full_name} onChange={e => setF({ ...f, full_name: e.target.value })} />

                <label className="form-v3-label">Admission Number</label>
                <input className="form-v3-input" placeholder="e.g. ADM2024001" required value={f.admission_number} onChange={e => setF({ ...f, admission_number: e.target.value })} />

                <label className="form-v3-label">Course</label>
                <select className="form-v3-input" value={f.course} onChange={e => setF({ ...f, course: e.target.value })} style={{ appearance: 'none' }}>
                    <option value="">-- Select Course --</option>
                    {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <label className="form-v3-label">Academic Year</label>
                <input className="form-v3-input" placeholder="e.g. 2024-2025" required value={f.academic_year} onChange={e => setF({ ...f, academic_year: e.target.value })} />

                <label className="form-v3-label">Assigned Route</label>
                <select className="form-v3-input" value={f.route_id || ''} onChange={e => setF({ ...f, route_id: e.target.value })} style={{ appearance: 'none' }}>
                    <option value="">-- Assign Transport Corridor --</option>
                    {routes.map(r => <option key={r.id} value={r.id}>{r.name} ({r.bus_number})</option>)}
                </select>

                <label className="form-v3-label">Total Fee Due (₹)</label>
                <input className="form-v3-input" type="number" placeholder="e.g. 2500" required value={f.total_due} onChange={e => setF({ ...f, total_due: e.target.value })} />

                <button className="btn btn-primary" style={{ width: '100%', padding: '16px', borderRadius: '16px', fontWeight: 900, fontSize: '1rem' }} disabled={sub}>
                    {sub ? 'PROCESSING...' : student ? 'UPDATE REGISTRATION' : 'REGISTER STUDENT'}
                </button>
            </form>
        </div>
    );
};

const RouteForm = ({ route, onSave, onClose }) => {
    const [f, setF] = useState(route || { name: '', bus_number: '', capacity: 40 });
    const save = async (e) => {
        e.preventDefault();
        if (route) await supabase.from('routes').update(f).eq('id', route.id);
        else await supabase.from('routes').insert([f]);
        onSave(); onClose();
    };
    return (
        <div className="animate-fade-in-up">
            <div className="form-v3-header">
                <h3>{route ? 'Edit Route' : 'Add Route'}</h3>
                <i className="ph ph-x" onClick={onClose} style={{ cursor: 'pointer', fontSize: '1.2rem', color: '#333' }}></i>
            </div>
            <form onSubmit={save} className="form-v3-content">
                <label className="form-v3-label">Corridor Name</label>
                <input className="form-v3-input" placeholder="e.g. Kozhikode Central" required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
                <label className="form-v3-label">Bus Unit ID</label>
                <input className="form-v3-input" placeholder="e.g. #BUS-011" required value={f.bus_number} onChange={e => setF({ ...f, bus_number: e.target.value })} />
                <label className="form-v3-label">Passenger Capacity</label>
                <input className="form-v3-input" type="number" value={f.capacity} onChange={e => setF({ ...f, capacity: e.target.value })} />
                <button className="btn btn-primary" style={{ width: '100%', padding: '16px', borderRadius: '16px', fontWeight: 900, fontSize: '1rem' }}>SAVE ROUTE LOGISTICS</button>
            </form>
        </div>
    );
};

const PaymentForm = ({ students, onSave, onClose, preSelectedStudentId }) => {
    const [sid, setSid] = useState(preSelectedStudentId || '');
    const [search, setSearch] = useState(() => {
        if (preSelectedStudentId) {
            const s = students.find(x => x.id === preSelectedStudentId);
            return s ? s.full_name : '';
        }
        return '';
    });
    const [amt, setAmt] = useState('');
    const [method, setMethod] = useState('Cash');
    const [showResults, setShowResults] = useState(false);
    const [loading, setLoading] = useState(false);

    const filtered = students.filter(s =>
        s.full_name.toLowerCase().includes(search.toLowerCase()) ||
        s.admission_number?.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 5);

    const save = async (e) => {
        e.preventDefault();
        if (!sid) return alert('Please select a student from the list');
        if (!amt || Number(amt) <= 0) return alert('Please enter a valid amount');

        setLoading(true);
        try {
            const { error: histError } = await supabase.from('payment_history').insert([{
                student_id: sid,
                amount: Number(amt),
                payment_method: method
            }]);

            if (histError) throw histError;

            const { data: c, error: fetchError } = await supabase.from('fee_payments')
                .select('amount_paid')
                .eq('student_id', sid)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

            const newTotal = (c?.amount_paid || 0) + Number(amt);
            const { error: updateError } = await supabase.from('fee_payments')
                .update({ amount_paid: newTotal })
                .eq('student_id', sid);

            if (updateError) throw updateError;

            onSave();
            onClose();
        } catch (err) {
            console.error("Payment Log Error:", err);
            alert("Failed to log payment: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in-up">
            <div className="form-v3-header">
                <h3>Deposit Credit</h3>
                <i className="ph ph-x" onClick={onClose} style={{ cursor: 'pointer', fontSize: '1.2rem' }}></i>
            </div>
            <form onSubmit={save} className="form-v3-content" style={{ position: 'relative' }}>
                <label className="form-v3-label">Search Student</label>
                <div style={{ position: 'relative', marginBottom: '24px' }}>
                    <input
                        className="form-v3-input"
                        style={{ marginBottom: 0 }}
                        placeholder="Type name or Admission ID..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setShowResults(true); setSid(''); }}
                        onFocus={() => setShowResults(true)}
                    />
                    {showResults && search.length > 0 && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', borderRadius: '16px', border: '1.5px solid #ececec', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 100, marginTop: '8px', overflow: 'hidden' }}>
                            {filtered.length > 0 ? filtered.map(s => (
                                <div
                                    key={s.id}
                                    style={{ padding: '12px 20px', cursor: 'pointer', borderBottom: '1px solid #f5f5f5', transition: '0.2s' }}
                                    className="search-result-item"
                                    onClick={() => { setSid(s.id); setSearch(s.full_name); setShowResults(false); }}
                                >
                                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#00332c' }}>{s.full_name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#666' }}>{s.admission_number} • {s.course} • ({s.academic_year || 'N/A'})</div>
                                </div>
                            )) : (
                                <div style={{ padding: '15px 20px', fontSize: '0.85rem', color: '#999' }}>No students found</div>
                            )}
                        </div>
                    )}
                </div>

                {sid && (
                    <div style={{ padding: '14px 20px', background: '#ecfdf5', borderRadius: '14px', marginBottom: '24px', border: '1px solid #14b8a633', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <i className="ph-fill ph-check-circle" style={{ color: '#14b8a6' }}></i>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0d443c' }}>Selected student ready</span>
                    </div>
                )}

                <label className="form-v3-label">Amount (₹)</label>
                <input className="form-v3-input" type="number" placeholder="e.g. 500" required value={amt} onChange={e => setAmt(e.target.value)} />

                <label className="form-v3-label">Payment Method</label>
                <select className="form-v3-input" value={method} onChange={e => setMethod(e.target.value)} style={{ appearance: 'none' }}>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI/Digital</option>
                    <option value="Bank">Bank Transfer</option>
                </select>

                <button className="btn btn-primary" style={{ width: '100%', padding: '16px', borderRadius: '16px', fontWeight: 900, fontSize: '1rem' }} disabled={loading}>
                    {loading ? <><i className="ph ph-spinner ph-spin"></i> SYNCING...</> : 'AUTHORIZE DEPOSIT'}
                </button>
            </form>
            <style dangerouslySetInnerHTML={{
                __html: `
                .search-result-item:hover { background: #f0fdfa; }
                .search-result-item:last-child { border-bottom: none; }
            ` }} />
        </div>
    );
};

const HistoryFlow = ({ studentId, history, student, onRefresh, onClose, onLogForStudent }) => {
    const rev = async (h) => {
        if (!confirm('Revert transaction?')) return;
        await supabase.from('payment_history').delete().eq('id', h.id);
        const { data: c } = await supabase.from('fee_payments').select('amount_paid').eq('student_id', studentId).single();
        await supabase.from('fee_payments').update({ amount_paid: Math.max(0, (c?.amount_paid || 0) - h.amount) }).eq('student_id', studentId);
        onRefresh();
    };
    return (
        <div className="animate-fade-in-up">
            <div className="form-v3-header">
                <h3>Student History</h3>
                <i className="ph ph-x" onClick={onClose} style={{ cursor: 'pointer', fontSize: '1.2rem' }}></i>
            </div>
            <div className="form-v3-content">
                <div style={{ background: '#fdfaf7', padding: '24px', borderRadius: '24px', marginBottom: '24px', border: '1px solid #f1f1f1' }}>
                    <h3 style={{ margin: 0, color: '#00332c', fontWeight: 900, fontSize: '1.2rem' }}>{student?.full_name}</h3>
                    <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem', color: '#0d6b5f', fontWeight: 700 }}>{student?.course} • Adm: {student?.admission_number} • Year: {student?.academic_year || 'N/A'}</p>
                    <button
                        className="btn btn-primary"
                        style={{ marginTop: '16px', borderRadius: '12px', padding: '8px 16px', fontSize: '0.85rem', background: 'var(--color-teal)' }}
                        onClick={() => onLogForStudent(studentId)}
                    >
                        <i className="ph ph-plus-circle"></i> Log New Payment
                    </button>
                </div>
                <div className="ledger-container" style={{ borderRadius: '16px', border: 'none', boxShadow: 'none' }}>
                    <table className="ledger-table" style={{ minWidth: '100%' }}>
                        <thead className="ledger-header" style={{ background: '#f7f0e8' }}>
                            <tr>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.length === 0 ? (
                                <tr><td colSpan="3" style={{ textAlign: 'center', padding: '40px', color: '#999', fontWeight: 600 }}>No transaction history</td></tr>
                            ) : history.map(h => (
                                <tr key={h.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                    <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>{new Date(h.date || h.created_at).toLocaleDateString()}</td>
                                    <td style={{ fontWeight: 900, color: '#14b8a6' }}>₹{h.amount}</td>
                                    <td><button className="pill-btn err" style={{ width: '40px', height: '40px', fontSize: '0.9rem' }} onClick={() => rev(h)}><i className="ph ph-trash"></i></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <button className="btn btn-primary" style={{ width: '100%', padding: '16px', marginTop: '30px', borderRadius: '20px', background: '#00332c', fontWeight: 900, fontSize: '1rem' }} onClick={onClose}>CLOSE SYNC</button>
            </div>
        </div>
    );
};

export default AdminDashboard;
