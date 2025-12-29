import React from 'react';
import { FaRobot, FaBolt, FaHistory, FaCog, FaToolbox } from 'react-icons/fa';
import './Sidebar.css';
import logo from '/vite.png';

const Sidebar = ({ activeView, onViewChange, onSettingsClick }) => {
  const menuItems = [
    { id: 'agents', label: 'Agents', icon: FaRobot },
    { id: 'workflows', label: 'Workflows', icon: FaBolt },
    { id: 'tools', label: 'Tools', icon: FaToolbox },
    { id: 'history', label: 'Execution History', icon: FaHistory },
    { id: 'settings', label: 'Settings', icon: FaCog }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src={logo} alt="GenAgentX" className="sidebar-logo" />
        <h3>GenAgentX</h3>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map(item => {
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              className={`sidebar-item ${activeView === item.id ? 'active' : ''}`}
              onClick={() => {
                if (item.id === 'settings' && onSettingsClick) {
                  onSettingsClick();
                } else {
                  onViewChange(item.id);
                }
              }}
            >
              <span className="sidebar-icon">
                <IconComponent />
              </span>
              <span className="sidebar-label">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
