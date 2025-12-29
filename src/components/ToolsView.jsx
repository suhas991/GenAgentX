import React, { useState, useEffect } from 'react';
import { getAllTools, deleteTool, getAgentsUsingTool } from '../services/indexedDB';
import ToolCard from './ToolCard';
import ToolTestModal from './ToolTestModal';
import NotificationModal from './NotificationModal';
import { useNotification } from '../hooks/useNotification';
import { FaPlus } from 'react-icons/fa';
import './ToolsView.css';

const ToolsView = ({ onBuildTool, onEditTool, onTestTool }) => {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name'); // 'name', 'date'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc', 'desc'
  const [testingTool, setTestingTool] = useState(null);
  const [activeTab, setActiveTab] = useState('default'); // 'default' | 'custom'
  
  const {
    notification,
    closeNotification,
    showConfirm,
  } = useNotification();

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      const data = await getAllTools();
      setTools(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load tools:', error);
      setTools([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    // Check if tool is being used by any agents
    const usingAgents = await getAgentsUsingTool(id);
    
    let confirmed = false;
    
    if (usingAgents.length > 0) {
      const agentNames = usingAgents.map(a => a.name).join(', ');
      confirmed = await showConfirm(
        `This tool is used by ${usingAgents.length} agent(s): ${agentNames}. Deleting it may affect their functionality. Continue?`,
        'Tool in Use',
        { type: 'warning', confirmText: 'Delete Anyway', cancelText: 'Cancel' }
      );
    } else {
      confirmed = await showConfirm(
        'Are you sure you want to delete this tool? This action cannot be undone.',
        'Delete Tool',
        { type: 'warning', confirmText: 'Delete', cancelText: 'Cancel' }
      );
    }
    
    if (!confirmed) return;
    
    await deleteTool(id);
    loadTools();
  };

  const handleEdit = (tool) => {
    if (onEditTool) {
      onEditTool(tool);
    }
  };

  const handleTest = (tool) => {
    setTestingTool(tool);
  };

  // Filter and sort tools
  const getFilteredAndSortedTools = () => {
    let filtered = [...tools];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tool =>
        tool.name.toLowerCase().includes(query) ||
        (tool.description && tool.description.toLowerCase().includes(query))
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let compareA, compareB;
      
      switch (sortBy) {
        case 'name':
          compareA = a.name.toLowerCase();
          compareB = b.name.toLowerCase();
          break;
        case 'date':
          compareA = new Date(a.createdAt || 0);
          compareB = new Date(b.createdAt || 0);
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return compareA > compareB ? 1 : compareA < compareB ? -1 : 0;
      } else {
        return compareA < compareB ? 1 : compareA > compareB ? -1 : 0;
      }
    });
    
    return filtered;
  };

  const filteredTools = getFilteredAndSortedTools();
  const defaultTools = filteredTools.filter((t) => t.isDefault);
  const customTools = filteredTools.filter((t) => !t.isDefault);

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  if (loading) {
    return <div className="tools-view loading">Loading tools...</div>;
  }

  return (
    <div className="tools-view">
      {tools.length > 0 && (
        <div className="search-sort-controls tools-controls-row">
          <div className="tools-tabs">
            <button
              className={`tab-btn ${activeTab === 'default' ? 'active' : ''}`}
              onClick={() => setActiveTab('default')}
            >
              Default ({defaultTools.length})
            </button>
            <button
              className={`tab-btn ${activeTab === 'custom' ? 'active' : ''}`}
              onClick={() => setActiveTab('custom')}
            >
              Custom ({customTools.length})
            </button>
          </div>

          <div className="tools-search-sort">
            <div className="search-box-container">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                placeholder="Search tools by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-box"
              />
              {searchQuery && (
                <button
                  className="clear-search"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="sort-controls">
              <label>Sort by:</label>
              <select
                className="sort-dropdown"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="name">Name</option>
                <option value="date">Date Created</option>
              </select>
              <button onClick={toggleSortOrder} className="sort-order-btn" title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}>
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>
      )}

      {filteredTools.length === 0 ? (
        <div className="tools-empty">
          <div className="empty-icon">🛠️</div>
          <h3>No tools yet</h3>
          <p>
            {searchQuery 
              ? 'No tools match your search. Try a different query.'
              : 'Create your first tool to extend your agents\' capabilities.'}
          </p>
          {!searchQuery && (
            <button className="btn-primary" onClick={onBuildTool}>
              <FaPlus /> Create Your First Tool
            </button>
          )}
        </div>
      ) : (
        <>
          {activeTab === 'default' && (
            defaultTools.length === 0 ? (
              <div className="tools-empty">
                <div className="empty-icon">📦</div>
                <h3>No default tools available</h3>
                <p>Defaults are managed by the app and cannot be deleted.</p>
              </div>
            ) : (
              <div className="tools-grid">
                {defaultTools.map((tool) => (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onTest={handleTest}
                  />
                ))}
              </div>
            )
          )}

          {activeTab === 'custom' && (
            customTools.length === 0 ? (
              <div className="tools-empty">
                <div className="empty-icon">✨</div>
                <h3>No custom tools yet</h3>
                <p>Create a tool to extend your agents' capabilities.</p>
                <button className="btn-primary" onClick={onBuildTool}>
                  <FaPlus /> Create Tool
                </button>
              </div>
            ) : (
              <div className="tools-grid">
                {customTools.map((tool) => (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onTest={handleTest}
                  />
                ))}
              </div>
            )
          )}
        </>
      )}

      {notification && (
        <NotificationModal
          isOpen={notification.isOpen}
          message={notification.message}
          type={notification.type}
          title={notification.title}
          onClose={closeNotification}
          onConfirm={notification.onConfirm}
          confirmText={notification.confirmText}
          cancelText={notification.cancelText}
          showCancel={notification.showCancel}
        />
      )}

      {testingTool && (
        <ToolTestModal
          tool={testingTool}
          onClose={() => setTestingTool(null)}
        />
      )}
    </div>
  );
};

export default ToolsView;
