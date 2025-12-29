// src/components/AgentCard.jsx
import React from 'react';
import { FaFileDownload } from 'react-icons/fa';
import { MdDeleteSweep, MdModeEdit } from 'react-icons/md';
import { exportAgent } from '../services/exportImportService';
import { getAllTools } from '../services/indexedDB';
import { getModelName, getModelCategory } from '../constants/models';

const AgentCard = ({ agent, onEdit, onRun, onDelete, isDefault }) => {
  const getModelBadgeClass = (modelId) => {
    const category = getModelCategory(modelId);
    return `model-badge ${category}`;
  };

  const handleExport = async (e) => {
    e.stopPropagation();
    try {
      const tools = await getAllTools();
      await exportAgent(agent, tools);
    } catch (error) {
      alert('Failed to export agent: ' + error.message);
    }
  };

  // Generate avatar based on agent name (first letter)
  const getAvatar = () => {
    const initial = agent.name.charAt(0).toUpperCase();
    return (
      <div className="agent-avatar">
        <span>{initial}</span>
      </div>
    );
  };

  // Truncate text if too long
  const truncateText = (text, maxLength) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div className={`agent-card-v2 ${isDefault ? 'default-agent' : ''}`}>
      <div className="agent-card-header-v2">
        {getAvatar()}
        <div className="agent-header-info">
          <h3 className="agent-name-v2" title={agent.name}>{truncateText(agent.name, 50)}</h3>
          <p className="agent-subtitle-v2" title={agent.role}>{truncateText(agent.role, 60)}</p>
          <div className="agent-status-badges">
            <span className={getModelBadgeClass(agent.model)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 16v-4"></path>
                <path d="M12 8h.01"></path>
              </svg>
              {getModelName(agent.model)}
            </span>
            <span className={agent.ragEnabled ? "status-rag-enabled" : "status-rag-disabled"}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              RAG
            </span>
          </div>
        </div>
      </div>

      <div className="agent-card-body-v2">
        <div className="agent-section">
          <h4 className="section-title">Goal</h4>
          <p className="goal-text">{agent.goal}</p>
        </div>
      </div>

      <div className="agent-card-footer-v2">
        <button onClick={() => onRun(agent)} className="btn-start-agent-v2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          Start
        </button>
        
        <div className="action-buttons-group">
          {!isDefault && (
            <button onClick={() => onEdit(agent)} className="btn-action-v2 btn-edit-v2" title="Edit">
              <MdModeEdit size={18} />
            </button>
          )}
          {!isDefault && (
            <button onClick={handleExport} className="btn-action-v2 btn-export-v2" title="Export">
              <FaFileDownload size={16} />
            </button>
          )}
          {!isDefault && (
            <button onClick={() => onDelete(agent.id)} className="btn-action-v2 btn-reset-v2" title="Delete">
              <MdDeleteSweep size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentCard;
