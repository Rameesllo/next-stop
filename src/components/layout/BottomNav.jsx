import React from 'react';
import { House, MapPin, CreditCard, IdentificationCard } from '@phosphor-icons/react';

const BottomNav = ({ activeView, onNavigate }) => {
    const navItems = [
        { id: 'student-dashboard', label: 'Home', icon: House },
        { id: 'tracking', label: 'Track', icon: MapPin },
        { id: 'payment', label: 'Fees', icon: CreditCard },
        { id: 'profile', label: 'Profile', icon: IdentificationCard },
    ];

    return (
        <nav className="bottom-nav" id="bottom-nav" style={{ display: 'flex' }}>
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                    <div
                        key={item.id}
                        className={`nav-item ${isActive ? 'active' : ''}`}
                        onClick={() => onNavigate(item.id)}
                    >
                        <Icon weight={isActive ? 'fill' : 'regular'} size={24} />
                        <span>{item.label}</span>
                    </div>
                );
            })}
        </nav>
    );
};

export default BottomNav;
