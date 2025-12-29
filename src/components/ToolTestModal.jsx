import React, { useState } from 'react';
import { executeTool } from '../services/toolExecutor';
import './ToolTestModal.css';

const ToolTestModal = ({ tool, onClose }) => {
  const [testArgs, setTestArgs] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Initialize test args with empty values
  useState(() => {
    const initialArgs = {};
    if (tool.parameters) {
      tool.parameters.forEach(param => {
        initialArgs[param.name] = getDefaultValue(param.type);
      });
    }
    setTestArgs(initialArgs);
  }, [tool]);

  function getDefaultValue(type) {
    switch (type) {
      case 'string': return '';
      case 'number': return 0;
      case 'boolean': return false;
      case 'array': return '[]';
      case 'object': return '{}';
      default: return '';
    }
  }

  const handleArgChange = (paramName, value, type) => {
    setTestArgs(prev => {
      const newArgs = { ...prev };
      
      // Parse value based on type
      if (type === 'number') {
        newArgs[paramName] = parseFloat(value) || 0;
      } else if (type === 'boolean') {
        newArgs[paramName] = value === 'true';
      } else if (type === 'array' || type === 'object') {
        try {
          newArgs[paramName] = JSON.parse(value);
        } catch (e) {
          newArgs[paramName] = value; // Keep as string if invalid JSON
        }
      } else {
        newArgs[paramName] = value;
      }
      
      return newArgs;
    });
  };

  const handleTest = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      console.log('Testing tool with args:', testArgs);
      const toolResult = await executeTool(tool, testArgs);
      setResult(toolResult);
    } catch (err) {
      console.error('Tool test error:', err);
      setError(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  const renderInputField = (param) => {
    const currentValue = testArgs[param.name];

    // Friendly picker for timezone on current_datetime tool
    if (tool.name === 'current_datetime' && param.name === 'timezone') {
      const commonZones = ['UTC', 'IST', 'EST', 'PST', 'CST', 'MST', 'Europe/London', 'Asia/Kolkata', 'America/New_York', 'America/Los_Angeles'];
      return (
        <>
          <input
            list="timezone-options"
            type="text"
            value={currentValue || ''}
            onChange={(e) => handleArgChange(param.name, e.target.value, param.type)}
            disabled={isRunning}
            placeholder="e.g., IST, EST, UTC, America/New_York"
          />
          <datalist id="timezone-options">
            {commonZones.map((z) => (
              <option key={z} value={z} />
            ))}
          </datalist>
        </>
      );
    }
    
    switch (param.type) {
      case 'boolean':
        return (
          <select
            value={currentValue?.toString() || 'false'}
            onChange={(e) => handleArgChange(param.name, e.target.value, param.type)}
            disabled={isRunning}
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={currentValue || 0}
            onChange={(e) => handleArgChange(param.name, e.target.value, param.type)}
            disabled={isRunning}
            placeholder={`Enter ${param.name}`}
          />
        );
      
      case 'array':
      case 'object':
        return (
          <textarea
            value={typeof currentValue === 'string' ? currentValue : JSON.stringify(currentValue, null, 2)}
            onChange={(e) => handleArgChange(param.name, e.target.value, param.type)}
            disabled={isRunning}
            placeholder={param.type === 'array' ? '[1, 2, 3]' : '{"key": "value"}'}
            rows={3}
          />
        );
      
      default:
        return (
          <input
            type="text"
            value={currentValue || ''}
            onChange={(e) => handleArgChange(param.name, e.target.value, param.type)}
            disabled={isRunning}
            placeholder={`Enter ${param.name}`}
          />
        );
    }
  };

  return (
    <div className="tool-test-modal-overlay">
      <div className="tool-test-modal">
        <div className="tool-test-header">
          <h2>Test Tool: {tool.name}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="tool-test-content">
          {tool.description && (
            <div className="tool-test-description">
              <strong>Description:</strong> {tool.description}
            </div>
          )}

          {tool.parameters && tool.parameters.length > 0 ? (
            <div className="tool-test-parameters">
              <h3>Parameters</h3>
              {tool.parameters.map((param, idx) => (
                <div key={idx} className="parameter-input-group">
                  <label>
                    {param.name}
                    {param.required && <span className="required">*</span>}
                    <span className="param-type">({param.type})</span>
                  </label>
                  {param.description && (
                    <small className="param-description">{param.description}</small>
                  )}
                  {renderInputField(param)}
                </div>
              ))}
            </div>
          ) : (
            <div className="no-parameters">
              This tool has no parameters.
            </div>
          )}

          <div className="tool-test-actions">
            <button
              className="btn-test"
              onClick={handleTest}
              disabled={isRunning}
            >
              {isRunning ? 'Running...' : '▶ Run Test'}
            </button>
          </div>

          {error && (
            <div className="test-error">
              <strong>Error:</strong>
              <pre>{error}</pre>
            </div>
          )}

          {result && (
            <div className="test-result">
              <h3>Result:</h3>
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ToolTestModal;
