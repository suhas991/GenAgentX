import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import AgentCard from "../components/AgentCard";
import AgentFormModal from "../components/AgentFormModal";
import RunAgentModal from "../components/RunAgentModal";
import ChatBot from "../components/ChatBot";
import SettingsModal from "../components/SettingsModal";
import ImportAgentsModal from "../components/ImportAgentsModal";
import ImportWorkflowModal from "../components/ImportWorkflowModal";
import ExecutionHistory from "../components/ExecutionHistory";
import WorkflowsView from "../components/WorkflowsView";
import WorkflowBuilder from "../components/WorkflowBuilder";
import WorkflowRunner from "../components/WorkflowRunner";
import ToolsView from "../components/ToolsView";
import ToolBuilder from "../components/ToolBuilder";
import { useAppStore } from "../store/appStore";
import { saveWorkflow, saveTool, saveAgent, getAllAgents } from "../services/indexedDB";
import { FaUserCircle } from "react-icons/fa";
import "../App.css";

const Dashboard = ({
  onSaveAgent,
  onEditAgent,
  onDeleteAgent,
  onChatBotMessage,
  onRunAgent,
  onImportAgents,
  onExportAll,
  onLogout,
}) => {
  const {
    agents,
    setAgents,
    userConfig,
    showFormModal,
    setShowFormModal,
    editingAgent,
    setEditingAgent,
    runningAgent,
    setRunningAgent,
    isChatBotOpen,
    setIsChatBotOpen,
    showSettings,
    setShowSettings,
    showImportModal,
    setShowImportModal,
    showUserMenu,
    setShowUserMenu,
  } = useAppStore();

  const [activeView, setActiveView] = useState('agents');
  const [showWorkflowBuilder, setShowWorkflowBuilder] = useState(false);
  const [showWorkflowRunner, setShowWorkflowRunner] = useState(false);
  const [showImportWorkflowModal, setShowImportWorkflowModal] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [workflowsKey, setWorkflowsKey] = useState(0); // Force re-render
  
  // Tools state
  const [showToolBuilder, setShowToolBuilder] = useState(false);
  const [editingTool, setEditingTool] = useState(null);
  const [toolsKey, setToolsKey] = useState(0); // Force re-render
  
  // Search and sort states
  const [agentSearchQuery, setAgentSearchQuery] = useState('');
  const [agentSortBy, setAgentSortBy] = useState('name'); // 'name', 'date', 'model'
  const [agentSortOrder, setAgentSortOrder] = useState('asc'); // 'asc', 'desc'

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest(".user-menu-wrapper")) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUserMenu, setShowUserMenu]);

  const handleSaveWorkflow = async (workflowData) => {
    try {
      await saveWorkflow(workflowData);
      setShowWorkflowBuilder(false);
      setEditingWorkflow(null);
      setWorkflowsKey(prev => prev + 1); // Refresh workflows
    } catch (error) {
      console.error('Failed to save workflow:', error);
    }
  };

  const handleEditWorkflow = (workflow) => {
    setEditingWorkflow(workflow);
    setShowWorkflowBuilder(true);
  };

  const handleRunWorkflow = (workflow) => {
    setSelectedWorkflow(workflow);
    setShowWorkflowRunner(true);
  };

  const handleImportWorkflow = async (importData) => {
    try {
      const { workflow: workflowData, agents: agentsToImport = [], agentIdMap = {} } = importData;
      
      // Ensure agentsToImport is an array
      const agentsArray = Array.isArray(agentsToImport) ? agentsToImport : [];
      
      // Import agents and update ID map
      for (const agent of agentsArray) {
        // Use _originalId attached by ImportWorkflowModal for mapping
        const oldId = agent._originalId;
        // Remove the temporary _originalId before saving
        const { _originalId, ...agentToSave } = agent;
        const savedAgent = await saveAgent(agentToSave);
        if (oldId !== undefined && oldId !== null) {
          agentIdMap[oldId] = savedAgent.id;
        }
      }
      
      // Update workflow to use new agent IDs
      const updatedWorkflow = {
        ...workflowData,
        agents: workflowData.agents.map(wa => ({
          ...wa,
          agentId: agentIdMap[wa.agentId] !== undefined ? agentIdMap[wa.agentId] : wa.agentId
        }))
      };
      
      // Save the workflow with corrected agent references
      await saveWorkflow(updatedWorkflow);
      
      // Refresh workflows, agents, and tools
      setWorkflowsKey(prev => prev + 1);
      setToolsKey(prev => prev + 1); // Refresh tools list
      const refreshedAgents = await getAllAgents();
      setAgents(refreshedAgents); // Refresh agents list in store
      
      alert(`Workflow "${workflowData.name}" imported successfully!`);
    } catch (error) {
      console.error('Failed to import workflow:', error);
      alert('Failed to import workflow: ' + error.message);
    }
  };

  // Tool handlers
  const handleBuildTool = () => {
    setEditingTool(null);
    setShowToolBuilder(true);
  };

  const handleEditTool = (tool) => {
    setEditingTool(tool);
    setShowToolBuilder(true);
  };

  const handleSaveTool = () => {
    setToolsKey(prev => prev + 1); // Refresh tools
  };

  const handleImportTool = async (tool) => {
    try {
      await saveTool(tool);
      setToolsKey(prev => prev + 1); // Refresh tools
    } catch (error) {
      console.error('Failed to import tool:', error);
      alert('Failed to import tool: ' + error.message);
    }
  };

  const handleTestTool = (tool) => {
    // For now, just show an alert. You can implement a test modal later
    alert(`Testing tool: ${tool.name}\n\nThis feature will allow you to test the tool with sample inputs.`);
  };

  const helperAgent = agents.find((agent) => agent.isDefault);

  // Filter and sort agents
  const getFilteredAndSortedAgents = () => {
    let filtered = agents.filter((agent) => !agent.isDefault);
    
    // Apply search filter
    if (agentSearchQuery.trim()) {
      const query = agentSearchQuery.toLowerCase();
      filtered = filtered.filter(agent => 
        agent.name.toLowerCase().includes(query) ||
        agent.role.toLowerCase().includes(query) ||
        agent.goal.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (agentSortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          comparison = dateA - dateB;
          break;
        case 'model':
          comparison = a.model.localeCompare(b.model);
          break;
        default:
          comparison = 0;
      }
      
      return agentSortOrder === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  };

  return (
    <div className="app-with-sidebar">
      <Sidebar 
        activeView={activeView} 
        onViewChange={setActiveView}
        onSettingsClick={() => setShowSettings(true)}
      />

      <div className="main-content">
        <header className="app-header">
          <div className="header-left">
            <h1>
              {activeView === 'agents' ? 'AI Agents' : 
               activeView === 'workflows' ? 'Workflows' :
               activeView === 'tools' ? 'Tools' :
               'Execution History'}
            </h1>
          </div>
          <div className="header-right">
            <div className="user-menu-wrapper">
              <button
                className="user-info-button"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <span className="user-avatar">
                  <FaUserCircle aria-hidden="true" focusable="false" />
                </span>
                <span className="user-name">{userConfig?.name}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {showUserMenu && (
                <div className="user-menu-dropdown">
                  <div className="user-menu-header">
                    <strong>{userConfig?.name}</strong>
                    <span>{userConfig?.email}</span>
                  </div>

                  {activeView === 'agents' && (
                    <>
                      <div className="user-menu-divider"></div>

                      <button className="user-menu-item" onClick={() => { setShowUserMenu(false); setShowImportModal(true); }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="17 8 12 3 7 8"></polyline>
                          <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        Import Agents
                      </button>

                      <button className="user-menu-item" onClick={() => { setShowUserMenu(false); onExportAll(); }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Export All Agents
                      </button>
                    </>
                  )}

                  {activeView === 'workflows' && (
                    <>
                      <div className="user-menu-divider"></div>

                      <button className="user-menu-item" onClick={() => { setShowUserMenu(false); setShowImportWorkflowModal(true); }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="17 8 12 3 7 8"></polyline>
                          <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        Import Workflow
                      </button>
                    </>
                  )}

                  <div className="user-menu-divider"></div>

                  <button className="user-menu-item danger" onClick={() => { setShowUserMenu(false); onLogout(); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    Logout
                  </button>
                </div>
              )}
            </div>

            {activeView === 'agents' && (
              <button onClick={() => { setEditingAgent(null); setShowFormModal(true); }} className="btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Build New Agent
              </button>
            )}

            {activeView === 'workflows' && (
              <>
                <button onClick={() => { setEditingWorkflow(null); setShowWorkflowBuilder(true); }} className="btn-primary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Build Workflow
                </button>
              </>
            )}

            {activeView === 'tools' && (
              <button onClick={handleBuildTool} className="btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Create Tool
              </button>
            )}
          </div>
        </header>

        {activeView === 'agents' && (
          <>
            {helperAgent && !isChatBotOpen && agents.filter((agent) => !agent.isDefault).length === 0 && (
              <div className="helper-banner">
                <div className="helper-icon">💡</div>
                <div className="helper-content">
                  <h3>Need help building agents ?</h3>
                  <p>Click the chat icon in the bottom right to talk with the <strong>GenAgentX Assistant..</strong>!</p>
                </div>
              </div>
            )}

            {/* Search and Sort Controls */}
            {agents.filter((agent) => !agent.isDefault).length > 0 && (
              <div className="search-sort-controls">
                <div className="search-box-container">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search agents by name, role, or goal..."
                    value={agentSearchQuery}
                    onChange={(e) => setAgentSearchQuery(e.target.value)}
                    className="search-input"
                  />
                  {agentSearchQuery && (
                    <button 
                      className="clear-search-btn"
                      onClick={() => setAgentSearchQuery('')}
                      title="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>
                
                <div className="sort-controls">
                  <label>Sort by:</label>
                  <select 
                    value={agentSortBy} 
                    onChange={(e) => setAgentSortBy(e.target.value)}
                    className="sort-select"
                  >
                    <option value="name">Name</option>
                    <option value="date">Date Created</option>
                    <option value="model">Model</option>
                  </select>
                  
                  <button
                    className="sort-order-btn"
                    onClick={() => setAgentSortOrder(agentSortOrder === 'asc' ? 'desc' : 'asc')}
                    title={agentSortOrder === 'asc' ? 'Ascending' : 'Descending'}
                  >
                    {agentSortOrder === 'asc' ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m3 8 4-4 4 4"></path>
                        <path d="M7 4v16"></path>
                        <path d="m21 16-4 4-4-4"></path>
                        <path d="M17 20V4"></path>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m3 16 4 4 4-4"></path>
                        <path d="M7 20V4"></path>
                        <path d="m21 8-4-4-4 4"></path>
                        <path d="M17 4v16"></path>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="agents-grid">
              {getFilteredAndSortedAgents().map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onEdit={onEditAgent}
                  onRun={setRunningAgent}
                  onDelete={onDeleteAgent}
                />
              ))}
              {getFilteredAndSortedAgents().length === 0 && agentSearchQuery && (
                <div className="no-results">
                  <p>No agents found matching "{agentSearchQuery}"</p>
                  <button className="btn-secondary" onClick={() => setAgentSearchQuery('')}>
                    Clear Search
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {activeView === 'workflows' && (
          <WorkflowsView 
            key={workflowsKey}
            agents={agents} 
            onBuildWorkflow={() => { setEditingWorkflow(null); setShowWorkflowBuilder(true); }}
            onEditWorkflow={handleEditWorkflow}
            onRunWorkflow={handleRunWorkflow}
          />
        )}

        {activeView === 'tools' && (
          <ToolsView
            key={toolsKey}
            onBuildTool={handleBuildTool}
            onEditTool={handleEditTool}
            onTestTool={handleTestTool}
          />
        )}

        {activeView === 'history' && <ExecutionHistory />}

        {/* MODALS */}
        {showFormModal && (
          <AgentFormModal agent={editingAgent} onSave={onSaveAgent} onClose={() => { setShowFormModal(false); setEditingAgent(null); }} />
        )}

        {runningAgent && <RunAgentModal agent={runningAgent} onRun={onRunAgent} onClose={() => setRunningAgent(null)} />}

        {showWorkflowBuilder && (
          <WorkflowBuilder
            agents={agents}
            workflow={editingWorkflow}
            onSave={handleSaveWorkflow}
            onClose={() => { setShowWorkflowBuilder(false); setEditingWorkflow(null); }}
          />
        )}

        {showWorkflowRunner && selectedWorkflow && (
          <WorkflowRunner
            workflow={selectedWorkflow}
            agents={agents}
            onRunAgent={onRunAgent}
            onClose={() => {
              setShowWorkflowRunner(false);
              setSelectedWorkflow(null);
            }}
          />
        )}

        {showToolBuilder && (
          <ToolBuilder
            editingTool={editingTool}
            onSave={handleSaveTool}
            onClose={() => {
              setShowToolBuilder(false);
              setEditingTool(null);
            }}
          />
        )}

        <ChatBot
          isOpen={isChatBotOpen}
          onToggle={() => setIsChatBotOpen(!isChatBotOpen)}
          onSendMessage={onChatBotMessage}
          agentName={"GenAgentX Assistant"}
          onImportAgent={(agent) => onImportAgents([agent])}
          onImportTool={handleImportTool}
        />

        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} currentConfig={userConfig} onSave={() => {}} />}

        {showImportModal && <ImportAgentsModal onClose={() => setShowImportModal(false)} onImport={onImportAgents} existingAgents={agents} />}
        
        {showImportWorkflowModal && <ImportWorkflowModal onClose={() => setShowImportWorkflowModal(false)} onImport={handleImportWorkflow} />}
      </div>
    </div>
  );
};

export default Dashboard;
