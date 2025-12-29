// src/components/ImportWorkflowModal.jsx
import React, { useState, useRef } from 'react';
import { importWorkflowFromFile, generateUniqueName } from '../services/exportImportService';
import { saveTool, getAllAgents } from '../services/indexedDB';
import './ImportAgentsModal.css'; // Reuse same styling

const ImportWorkflowModal = ({ onClose, onImport }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    setSelectedFile(file);

    try {
      const importData = await importWorkflowFromFile(file);
      const { workflow, agents, tools } = importData;
      setPreviewData({ workflow, agents: agents || [], tools: tools || [] });
    } catch (err) {
      setError(err.message);
      setSelectedFile(null);
      setPreviewData(null);
    }
  };

  const handleImport = async () => {
    if (!previewData) return;

    setImporting(true);
    try {
      // Get existing agents to check for duplicates
      const existingAgents = await getAllAgents();
      const existingAgentNames = existingAgents.map(a => a.name);

      // Import tools first and track ID mapping (old ID -> new ID)
      const toolIdMap = {};
      const toolNameToIdMap = {}; // For backward compatibility with old exports
      if (previewData.tools && previewData.tools.length > 0) {
        for (const tool of previewData.tools) {
          // Use originalId if available (from new exports), fall back to id for backwards compatibility
          const oldToolId = tool.originalId || tool.id;
          // Remove id and originalId fields so new one is generated
          const { id, originalId, ...toolWithoutId } = tool;
          const savedTool = await saveTool(toolWithoutId);
          console.log('Workflow - Tool mapping:', oldToolId, '->', savedTool.id);
          if (oldToolId) {
            toolIdMap[oldToolId] = savedTool.id;
          }
          // Also track by name for old exports that don't have originalId
          if (tool.name) {
            toolNameToIdMap[tool.name] = savedTool.id;
          }
        }
      }

      // Import agents and track ID mapping
      const agentIdMap = {};
      const agentsToImport = [];
      
      // Ensure previewData.agents is an array
      const agentsToProcess = Array.isArray(previewData.agents) ? previewData.agents : [];
      
      for (const agent of agentsToProcess) {
        // Use originalId if available (from new exports), fall back to id for backwards compatibility
        const oldId = agent.originalId || agent.id;
        
        // Remove id and originalId fields so new one is generated
        const { id, originalId, ...agentWithoutId } = agent;
        let agentToSave = { ...agentWithoutId };
        
        console.log('Workflow - Agent tools before mapping:', agentToSave.tools);
        
        // Update agent's tool references with new tool IDs
        if (agentToSave.tools && Array.isArray(agentToSave.tools)) {
          agentToSave.tools = agentToSave.tools.map(toolId => {
            const newId = toolIdMap[toolId] || toolId;
            console.log('Workflow - Mapping tool ID:', toolId, '->', newId);
            return newId;
          });
        }
        
        console.log('Workflow - Agent tools after mapping:', agentToSave.tools);
        
        if (existingAgentNames.includes(agent.name)) {
          const uniqueName = generateUniqueName(agent.name, existingAgentNames);
          agentToSave.name = uniqueName;
          existingAgentNames.push(uniqueName);
        } else {
          existingAgentNames.push(agent.name);
        }
        
        // Attach originalId temporarily so Dashboard can track the mapping
        agentToSave._originalId = oldId;
        agentsToImport.push(agentToSave);
        if (oldId !== undefined && oldId !== null) {
          agentIdMap[oldId] = null; // Will be set after import in Dashboard
        }
      }

      // Call parent handler with all data
      await onImport({
        workflow: previewData.workflow,
        agents: agentsToImport,
        agentIdMap
      });

      onClose();
    } catch (err) {
      setError('Failed to import: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modern import-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Import Workflow</h2>
            <p className="modal-subtitle">Upload a JSON file to import workflow with agents and tools</p>
          </div>
          <button onClick={onClose} className="close-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="file-upload-area" onClick={() => fileInputRef.current?.click()}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <div className="upload-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </div>
            <p className="upload-text">
              {selectedFile ? selectedFile.name : 'Click to select a JSON file'}
            </p>
            <p className="upload-hint">or drag and drop here</p>
          </div>

          {error && (
            <div className="error-box">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {previewData && (
            <div className="preview-section">
              <h3>Preview</h3>
              
              {/* Workflow Info */}
              <div className="preview-workflow" style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f0f4ff', borderRadius: '8px', borderLeft: '4px solid #4f46e5' }}>
                <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📋</span>
                  Workflow: {previewData.workflow.name}
                </strong>
                <span style={{ fontSize: '12px', color: '#666' }}>
                  {previewData.agents.length} agent(s) in workflow
                </span>
              </div>

              {/* Tools */}
              {previewData.tools && previewData.tools.length > 0 && (
                <div className="preview-tools">
                  <strong>Tools ({previewData.tools.length}):</strong>
                  <div className="preview-list">
                    {previewData.tools.map((tool, index) => (
                      <div key={`tool-${index}`} className="preview-item">
                        <div className="preview-icon">🔧</div>
                        <div className="preview-info">
                          <strong>{tool.name}</strong>
                          <span>{tool.description?.substring(0, 60) || 'No description'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Agents */}
              <div className="preview-agents">
                <strong>Agents ({previewData.agents.length}):</strong>
                <div className="preview-list">
                  {previewData.agents.map((agent, index) => (
                    <div key={`agent-${index}`} className="preview-item">
                      <div className="preview-icon">✓</div>
                      <div className="preview-info">
                        <strong>{agent.name}</strong>
                        <span>{agent.role}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!previewData || importing}
            className="btn-primary"
          >
            {importing ? (
              <>
                <span className="spinner"></span>
                Importing...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Import Workflow
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportWorkflowModal;
