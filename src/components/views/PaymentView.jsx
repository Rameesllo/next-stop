import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
// Icons are used via class names to match static site CSS

const PaymentView = () => {
    const [selectedYearOffset, setSelectedYearOffset] = useState(0);
    const [feeData, setFeeData] = useState(null);
    const [amountPaid, setAmountPaid] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPaymentData();
    }, []);

    const fetchPaymentData = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data: feeRecords, error } = await supabase
                    .from('fee_payments')
                    .select('*, profiles(academic_year)')
                    .eq('student_id', session.user.id)
                    .single();

                if (feeRecords) {
                    // Flatten profiles data for easier access
                    const enrichedData = {
                        ...feeRecords,
                        academic_year: feeRecords.profiles?.academic_year
                    };
                    setFeeData(enrichedData);
                    setAmountPaid(feeRecords.amount_paid || 0);
                }
            }
        } catch (err) {
            console.error("Payment data fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    const getYearTabs = () => {
        if (!feeData || !feeData.academic_year) return [{ label: '2024-25', offset: 0 }];

        const range = feeData.academic_year.toString();
        const matches = range.match(/(\d{4})-(\d{4})/);
        if (matches) {
            const start = parseInt(matches[1], 10);
            const end = parseInt(matches[2], 10);
            const years = [];
            for (let y = start; y < end; y++) {
                years.push({
                    label: `${y}-${(y + 1).toString().slice(-2)}`,
                    offset: y - start
                });
            }
            return years;
        }

        const singleYear = range.match(/(\d{4})/);
        if (singleYear) {
            const y = parseInt(singleYear[1], 10);
            return [{ label: `${y}-${(y + 1).toString().slice(-2)}`, offset: 0 }];
        }

        return [{ label: '2024-25', offset: 0 }];
    };

    const yearTabs = getYearTabs();

    const renderMonth = (i) => {
        const monthlyFee = 250;
        const monthsPerYear = 10;
        const yearCost = monthlyFee * monthsPerYear;
        let remainingPaid = Math.max(0, amountPaid - (selectedYearOffset * yearCost));

        let startYear = 2024;
        if (feeData && feeData.academic_year) {
            const yearMatches = feeData.academic_year.toString().match(/^(\d{4})/);
            if (yearMatches && yearMatches[1]) {
                startYear = parseInt(yearMatches[1], 10);
            }
        }

        const currentYearStart = startYear + selectedYearOffset;
        const monthNamesFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        const realMonthIndex = (5 + i) % 12;
        const yearOffsetForMonth = Math.floor((5 + i) / 12);
        const monthDisplay = `${monthNamesFull[realMonthIndex]} ${currentYearStart + yearOffsetForMonth}`;

        let status = '';
        let amount = `₹${monthlyFee}`;
        let iconClass = 'ph-fill ph-info';
        let iconColor = 'var(--color-error)';
        let payButton = false;

        // Logic from app.js
        const previousMonthsPaid = i * monthlyFee;
        const currentRemaining = remainingPaid - previousMonthsPaid;

        if (currentRemaining >= monthlyFee) {
            status = 'Payment Successful';
            iconClass = 'ph-fill ph-check-circle';
            iconColor = 'var(--color-success)';
        } else if (currentRemaining > 0) {
            const left = monthlyFee - currentRemaining;
            status = `Partial (₹${currentRemaining} paid)`;
            amount = `₹${left}`;
            iconClass = 'ph-fill ph-clock-counter-clockwise';
            iconColor = '#D97706';
            payButton = true;
        } else {
            status = 'Awaiting Payment';
            iconClass = 'ph-fill ph-info';
            iconColor = 'var(--color-error)';
            payButton = true;
        }

        const colors = [
            { bg: 'rgba(254, 243, 199, 0.4)' },
            { bg: 'rgba(204, 251, 241, 0.4)' },
            { bg: 'rgba(224, 231, 255, 0.4)' },
        ];
        const p = colors[i % colors.length];

        return (
            <div key={i} className="payment-card-premium">
                <div className="status-icon" style={{ backgroundColor: p.bg, color: iconColor }}>
                    <i className={iconClass} style={{ fontSize: '24px' }}></i>
                </div>
                <div className="payment-info">
                    <h4>{monthDisplay}</h4>
                    <p>{status}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: 'var(--color-gray-900)', fontSize: '1.1rem' }}>{amount}</div>
                    {payButton && (
                        <button
                            className="btn btn-primary"
                            onClick={() => alert(`Please pay ${amount} at the college finance office.`)}
                            style={{ padding: '4px 12px', fontSize: '0.75rem', borderRadius: '20px', marginTop: '8px' }}
                        >
                            Pay Now
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div id="view-payment" className="view active">
            <header className="payment-header">
                <div className="user-identity">
                    <div className="user-meta">
                        <h3 style={{ color: 'var(--color-deep-teal)', fontFamily: 'var(--font-display)', fontWeight: 800 }}>Fee Management</h3>
                        <p id="pay-academic-year" style={{ fontWeight: 600, opacity: 0.8 }}>Academic Program ({feeData?.academic_year || '...'})</p>
                    </div>
                </div>
            </header>

            <div className="page-content">
                <div className="payment-summary-premium">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>Total Collected</p>
                            <h2 id="pay-total-paid" style={{ margin: '4px 0 0 0', fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px', fontFamily: 'var(--font-display)' }}>
                                ₹{amountPaid}
                            </h2>
                        </div>
                        <div id="pay-progress-badge" style={{ background: 'rgba(255,255,255,0.2)', padding: '6px 14px', borderRadius: '12px', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {loading ? 'Loading' : (amountPaid > 0 ? 'Active' : 'No Data')}
                        </div>
                    </div>

                    <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span id="pay-next-due" style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>Dues: ₹{Math.max(0, 2500 - amountPaid)}</span>
                            <i className="ph ph-info" style={{ opacity: 0.6 }}></i>
                        </div>
                    </div>
                </div>

                <div className="p-4">
                    <h4 className="section-title" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Academic Year</h4>
                    <div className="year-tabs" id="payment-year-tabs">
                        {yearTabs.map(tab => (
                            <div
                                key={tab.offset}
                                className={`year-tab ${selectedYearOffset === tab.offset ? 'active' : ''}`}
                                onClick={() => setSelectedYearOffset(tab.offset)}
                            >
                                {tab.label}
                            </div>
                        ))}
                    </div>

                    <div className="section-container mt-4">
                        <h4 className="section-title" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Monthly Installments</h4>
                        <div id="monthly-installments-container">
                            {Array.from({ length: 10 }).map((_, i) => renderMonth(i))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentView;
