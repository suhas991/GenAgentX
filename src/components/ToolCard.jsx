import React from 'react';
import { FaPlay, FaEdit, FaTrash, FaCode } from 'react-icons/fa';
import './ToolCard.css';

const ToolCard = ({ tool, onEdit, onDelete, onTest }) => {
  const handleEdit = () => {
    if (onEdit) {
      onEdit(tool);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(tool.id);
    }
  };

  const handleTest = () => {
    if (onTest) {
      onTest(tool);
    }
  };

  const isDefault = !!tool.isDefault;

  return (
    <div className={`tool-card ${isDefault ? 'tool-card-default' : ''}`}>
      <div className="tool-card-header">
        <div className="tool-card-icon">
          <FaCode />
        </div>
        <div className="tool-card-info">
          <h3 className="tool-card-title">{tool.name}</h3>
          {tool.description && (
            <p className="tool-card-description">{tool.description}</p>
          )}
          {isDefault && <span className="tool-badge">Default</span>}
        </div>
      </div>

      <div className="tool-card-body">
        {tool.parameters && tool.parameters.length > 0 && (
          <div className="tool-card-section">
            <h4>Parameters</h4>
            <div className="tool-parameters">
              {tool.parameters.map((param, idx) => (
                <span key={idx} className="parameter-tag">
                  {param.name}: {param.type}
                  {param.required && <span className="required-indicator">*</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {tool.returnType && (
          <div className="tool-card-section">
            <h4>Returns</h4>
            <span className="return-type">{tool.returnType}</span>
          </div>
        )}
      </div>

      <div className="tool-card-footer">
        <button className="tool-card-btn test-btn" onClick={handleTest}>
          <FaPlay /> Test
        </button>
        <button className="tool-card-btn edit-btn" onClick={handleEdit} disabled={isDefault} title={isDefault ? 'Default tools cannot be edited' : 'Edit tool'}>
          <FaEdit /> Edit
        </button>
        <button className="tool-card-btn delete-btn" onClick={handleDelete} disabled={isDefault} title={isDefault ? 'Default tools cannot be deleted' : 'Delete tool'}>
          <FaTrash /> Delete
        </button>
      </div>

      {tool.createdAt && (
        <div className="tool-card-meta">
          Created {new Date(tool.createdAt).toLocaleDateString()}
        </div>
      )}
    </div>
  );
};

export default ToolCard;
