// src/components/ToolExecutionViewer.jsx
import React from 'react';
import './ToolExecutionViewer.css';

const ToolExecutionViewer = ({ executionLog }) => {
  if (!executionLog || executionLog.length === 0) {
    return null;
  }

  return (
    <div className="tool-execution-viewer">
      <h4 className="execution-title">
        🔧 Tool Execution Log ({executionLog.length} call{executionLog.length !== 1 ? 's' : ''})
      </h4>
      
      <div className="execution-timeline">
        {executionLog.map((log, index) => (
          <div key={index} className="execution-step">
            <div className="step-header">
              <span className="step-number">#{index + 1}</span>
              <span className="step-tool">{log.tool}</span>
              <span className="step-iteration">Iteration {log.iteration}</span>
            </div>
            
            <div className="step-body">
              <div className="step-section">
                <strong>Arguments:</strong>
                <pre className="step-data">{JSON.stringify(log.arguments, null, 2)}</pre>
              </div>
              
              <div className="step-section">
                <strong>Result:</strong>
                <pre className="step-data">
                  {JSON.stringify(log.result, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ToolExecutionViewer;
