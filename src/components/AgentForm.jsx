// src/components/AgentForm.jsx
import React, { useState, useEffect } from 'react';
import CustomParametersField from './CustomParametersField';
import RAGManager from './RAGManager';
import { getAllTools } from '../services/indexedDB';
import { GEMINI_MODELS, DEFAULT_MODEL } from '../constants/models';

const AgentForm = ({ onSave, initialData = null, onCancel }) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    role: initialData?.role || '',
    goal: initialData?.goal || '',
    taskDescription: initialData?.taskDescription || '',
    expectedOutput: initialData?.expectedOutput || '',
    model: initialData?.model || DEFAULT_MODEL,
    customParameters: initialData?.customParameters || [],
    ragEnabled: initialData?.ragEnabled || false,
    ragTopK: initialData?.ragTopK || 3,
    tools: initialData?.tools || [],
    id: initialData?.id || null
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [availableTools, setAvailableTools] = useState([]);

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      const tools = await getAllTools();
      setAvailableTools(tools || []);
    } catch (err) {
      console.error('Failed to load tools:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCustomParametersChange = (params) => {
    setFormData(prev => ({
      ...prev,
      customParameters: params
    }));
  };

  const handleRAGUpdate = (updatedAgent) => {
    setFormData(prev => ({
      ...prev,
      ragEnabled: updatedAgent.ragEnabled,
      ragTopK: updatedAgent.ragTopK
    }));
  };

  const handleToolToggle = (toolId) => {
    setFormData(prev => ({
      ...prev,
      tools: prev.tools.includes(toolId)
        ? prev.tools.filter(id => id !== toolId)
        : [...prev.tools, toolId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    
    try {
      await onSave(formData);
    } catch (err) {
      console.error('Error saving agent:', err);
      setError(err.message || 'Failed to save agent');
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="agent-form">
      <div className="form-group">
        <label>Agent Name </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., Content Writer Agent"
          required
          disabled={isSaving}
        />
      </div>

      <div className="form-group">
        <label>Role </label>
        <input
          type="text"
          name="role"
          value={formData.role}
          onChange={handleChange}
          placeholder="e.g., Professional Content Creator"
          required
          disabled={isSaving}
        />
      </div>

      <div className="form-group">
        <label>Goal </label>
        <textarea
          name="goal"
          value={formData.goal}
          onChange={handleChange}
          placeholder="What should this agent achieve?"
          rows="2"
          required
          disabled={isSaving}
        />
      </div>

      <div className="form-group">
        <label>Task Description </label>
        <textarea
          name="taskDescription"
          value={formData.taskDescription}
          onChange={handleChange}
          placeholder="Describe the tasks this agent will perform..."
          rows="4"
          required
          disabled={isSaving}
        />
      </div>

      <div className="form-group">
        <label>Expected Output </label>
        <textarea
          name="expectedOutput"
          value={formData.expectedOutput}
          onChange={handleChange}
          placeholder="Describe the format and structure of the expected output..."
          rows="3"
          required
          disabled={isSaving}
        />
      </div>

      <div className="form-group">
        <label>Model </label>
        <select
          name="model"
          value={formData.model}
          onChange={handleChange}
          required
          disabled={isSaving}
        >
          {GEMINI_MODELS.map(model => (
            <option key={model.id} value={model.id}>
              {model.name} - {model.description}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Custom Parameters (Optional)</label>
        <CustomParametersField
          parameters={formData.customParameters}
          onChange={handleCustomParametersChange}
          disabled={isSaving}
        />
      </div>

      {/* Tools Selection */}
      {availableTools.length > 0 && (
        <div className="form-group">
          <label>Tools (Optional)</label>
          <p className="form-help-text">
            Select tools that this agent can use to perform tasks
          </p>
          <div className="tools-selection">
            {availableTools.map(tool => (
              <label key={tool.id} className="tool-checkbox">
                <input
                  type="checkbox"
                  checked={formData.tools.includes(tool.id)}
                  onChange={() => handleToolToggle(tool.id)}
                  disabled={isSaving}
                />
                <span className="tool-name">{tool.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* RAG Manager - Only show for existing agents with an ID */}
      {formData.id && (
        <RAGManager 
          agent={formData} 
          onUpdate={handleRAGUpdate}
        />
      )}

      {error && (
        <div className="form-error" style={{
          padding: '12px',
          backgroundColor: '#fee',
          color: '#c33',
          borderRadius: '4px',
          marginBottom: '16px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn-secondary" disabled={isSaving}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={isSaving}>
          {isSaving ? 'Saving...' : (initialData ? 'Update Agent' : 'Create Agent')}
        </button>
      </div>
    </form>
  );
};

export default AgentForm;
