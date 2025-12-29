import React from 'react';
import './WorkflowCard.css';
import { exportWorkflow } from '../services/exportImportService';
import { getAllTools } from '../services/indexedDB';

const WorkflowCard = ({ workflow, agents, onRun, onEdit, onDelete, isRunning = false }) => {
  const handleExport = async (e) => {
    e.stopPropagation();
    try {
      const tools = await getAllTools();
      await exportWorkflow(workflow, agents, tools);
    } catch (error) {
      alert('Failed to export workflow: ' + error.message);
    }
  };

  return (
    <div className={`workflow-card ${isRunning ? 'running' : ''}`}>
      <div className="workflow-header">
        <div className="workflow-title-section">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="workflow-icon">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
          <h3>{workflow.name}</h3>
        </div>
        <span className="workflow-badge">
          {workflow.agents.length} {workflow.agents.length === 1 ? 'step' : 'steps'}
        </span>
      </div>
      
      {workflow.description && (
        <p className="workflow-description">{workflow.description}</p>
      )}

      <div className="workflow-actions">
        <div className="actions-primary">
          <button className="btn-run" onClick={onRun} disabled={isRunning}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            {isRunning ? 'Running...' : 'Run Workflow'}
          </button>
        </div>
        
        <div className="actions-secondary">
          <button className="btn-action-icon btn-edit" onClick={() => onEdit(workflow)} title="Edit workflow" disabled={isRunning}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          
          <button className="btn-action-icon btn-export" onClick={handleExport} title="Export workflow" disabled={isRunning}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>
          
          <button className="btn-action-icon btn-delete" onClick={onDelete} title="Delete workflow" disabled={isRunning}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkflowCard;
