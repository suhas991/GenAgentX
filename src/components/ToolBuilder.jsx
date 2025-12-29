import React, { useState } from 'react';
import { saveTool } from '../services/indexedDB';
import { FaPlus, FaTrash } from 'react-icons/fa';
import './ToolBuilder.css';

const ToolBuilder = ({ editingTool, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: editingTool?.name || '',
    description: editingTool?.description || '',
    parameters: editingTool?.parameters || [],
    returnType: editingTool?.returnType || 'string',
    codeImplementation: editingTool?.codeImplementation || '',
    isBuiltIn: editingTool?.isBuiltIn || false,
    id: editingTool?.id || null
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddParameter = () => {
    setFormData(prev => ({
      ...prev,
      parameters: [
        ...prev.parameters,
        { name: '', type: 'string', description: '', required: false }
      ]
    }));
  };

  const handleRemoveParameter = (index) => {
    setFormData(prev => ({
      ...prev,
      parameters: prev.parameters.filter((_, i) => i !== index)
    }));
  };

  const handleParameterChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      parameters: prev.parameters.map((param, i) =>
        i === index ? { ...param, [field]: value } : param
      )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      // Validate form
      if (!formData.name.trim()) {
        throw new Error('Tool name is required');
      }

      if (!formData.description.trim()) {
        throw new Error('Tool description is required');
      }

      // Validate parameters
      for (const param of formData.parameters) {
        if (!param.name.trim()) {
          throw new Error('All parameters must have a name');
        }
      }

      await saveTool(formData);
      
      if (onSave) {
        onSave();
      }
      
      onClose();
    } catch (err) {
      console.error('Error saving tool:', err);
      setError(err.message || 'Failed to save tool');
      setIsSaving(false);
    }
  };

  return (
    <div className="tool-builder-overlay">
      <div className="tool-builder-modal">
        <div className="tool-builder-header">
          <h2>{editingTool ? 'Edit Tool' : 'Create New Tool'}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="tool-builder-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-section">
            <div className="form-group">
              <label>Tool Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., web_search, calculator, file_reader"
                required
                disabled={isSaving}
              />
              <small>Use snake_case for tool names</small>
            </div>

            <div className="form-group">
              <label>Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe what this tool does, when it should be used, and what it returns. The LLM will use this description to understand how to use the tool."
                rows="4"
                required
                disabled={isSaving}
              />
              <small>Be detailed - the agent uses this to understand the tool's purpose and behavior</small>
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <h3>Parameters</h3>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleAddParameter}
                disabled={isSaving}
              >
                <FaPlus /> Add Parameter
              </button>
            </div>

            {formData.parameters.length === 0 ? (
              <div className="empty-params">
                No parameters yet. Add parameters that this tool accepts.
              </div>
            ) : (
              <div className="parameters-list">
                {formData.parameters.map((param, index) => (
                  <div key={index} className="parameter-item">
                    <div className="parameter-fields">
                      <input
                        type="text"
                        placeholder="Parameter name"
                        value={param.name}
                        onChange={(e) =>
                          handleParameterChange(index, 'name', e.target.value)
                        }
                        disabled={isSaving}
                      />
                      <select
                        value={param.type}
                        onChange={(e) =>
                          handleParameterChange(index, 'type', e.target.value)
                        }
                        disabled={isSaving}
                      >
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                        <option value="array">Array</option>
                        <option value="object">Object</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Description"
                        value={param.description}
                        onChange={(e) =>
                          handleParameterChange(index, 'description', e.target.value)
                        }
                        disabled={isSaving}
                      />
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={param.required}
                          onChange={(e) =>
                            handleParameterChange(index, 'required', e.target.checked)
                          }
                          disabled={isSaving}
                        />
                        Required
                      </label>
                      <button
                        type="button"
                        className="btn-danger-small"
                        onClick={() => handleRemoveParameter(index)}
                        disabled={isSaving}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-section">
            <div className="form-group">
              <label>Return Type</label>
              <select
                name="returnType"
                value={formData.returnType}
                onChange={handleChange}
                disabled={isSaving}
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="array">Array</option>
                <option value="object">Object</option>
                <option value="void">Void</option>
              </select>
            </div>
          </div>

          <div className="form-section">
            <div className="form-group">
              <label>
                JavaScript Code (Optional - Advanced)
                <span className="warning-badge">⚠️ Experimental</span>
              </label>
              <textarea
                name="codeImplementation"
                value={formData.codeImplementation}
                onChange={handleChange}
                placeholder={`// Custom JavaScript implementation
// The function receives 'args' object with parameters
// Must return a value or a Promise

async function execute(args) {
  const { param1, param2 } = args;
  
  // Your custom logic here
  const result = param1 + param2;
  
  return {
    success: true,
    data: result
  };
}`}
                rows="12"
                disabled={isSaving || formData.isBuiltIn}
                className="code-textarea"
              />
              <small className="warning-text">
                ⚠️ <strong>Security Warning:</strong> Custom code is executed using eval() which can be dangerous. 
                Only use code from trusted sources. Built-in tools cannot be modified.
                {formData.isBuiltIn && <div><strong>This is a built-in tool and cannot have custom code.</strong></div>}
              </small>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : editingTool ? 'Update Tool' : 'Create Tool'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ToolBuilder;
