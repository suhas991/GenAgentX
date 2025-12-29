// src/services/exportImportService.js

/**
 * Export a single agent with its custom tools to JSON file
 */
export const exportAgent = async (agent, tools = []) => {
  // Ensure agent has a tools array
  const agentWithTools = {
    ...agent,
    tools: agent.tools || []
  };
  
  // Get tools used by this agent (custom tools only)
  const agentTools = agentWithTools.tools.length > 0 
    ? tools.filter(t => agentWithTools.tools.includes(t.id) && !t.isDefault) 
    : [];
  
  const exportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    agentCount: 1,
    toolCount: agentTools.length,
    agents: [sanitizeAgent(agentWithTools)],
    tools: agentTools.map(sanitizeTool)
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
    type: 'application/json' 
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${agent.name.replace(/\s+/g, '-').toLowerCase()}-agent.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export multiple agents with their custom tools to JSON file
 */
export const exportAgents = (agents, tools = []) => {
  // Collect all custom tools used by any agent
  const toolIds = new Set();
  agents.forEach(agent => {
    const agentTools = agent.tools || [];
    if (Array.isArray(agentTools)) {
      agentTools.forEach(toolId => toolIds.add(toolId));
    }
  });
  
  const agentTools = tools.filter(t => toolIds.has(t.id) && !t.isDefault);
  
  // Ensure all agents have tools array
  const agentsWithTools = agents.map(agent => ({
    ...agent,
    tools: agent.tools || []
  }));
  
  const exportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    agentCount: agents.length,
    toolCount: agentTools.length,
    agents: agentsWithTools.map(sanitizeAgent),
    tools: agentTools.map(sanitizeTool)
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
    type: 'application/json' 
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `genagentx-agents-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Remove internal fields before export
 * Note: We preserve the original ID for relationship mapping during import
 */
const sanitizeAgent = (agent) => {
  const { isDefault, ...cleanAgent } = agent;
  return {
    ...cleanAgent,
    originalId: agent.id, // Preserve for mapping during import
    exportedAt: new Date().toISOString()
  };
};

/**
 * Remove internal fields before tool export
 * Note: We preserve the original ID for relationship mapping during import
 */
const sanitizeTool = (tool) => {
  const { createdAt, updatedAt, isDefault, implementation, ...cleanTool } = tool;
  return {
    ...cleanTool,
    originalId: tool.id, // Preserve for mapping during import
    exportedAt: new Date().toISOString()
  };
};

/**
 * Validate imported JSON structure
 */
export const validateImportData = (data) => {
  try {
    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'Invalid JSON structure' };
    }

    // Check for version
    if (!data.version) {
      return { valid: false, error: 'Missing version information' };
    }

    // Check for agents array
    if (!Array.isArray(data.agents)) {
      return { valid: false, error: 'Missing or invalid agents array' };
    }

    // Validate each agent
    for (const agent of data.agents) {
      if (!agent.name || !agent.role || !agent.goal) {
        return { valid: false, error: 'Agent missing required fields (name, role, goal)' };
      }
    }

    // Return both agents and tools (if present)
    return { valid: true, agents: data.agents, tools: data.tools || [] };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

/**
 * Parse and import agents from file (including tools)
 */
export const importAgentsFromFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const jsonData = JSON.parse(event.target.result);
        const validation = validateImportData(jsonData);
        
        if (!validation.valid) {
          reject(new Error(validation.error));
          return;
        }

        // Return both agents and tools
        resolve({ agents: validation.agents, tools: validation.tools });
      } catch (error) {
        reject(new Error('Failed to parse JSON file'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
};

/**
 * Generate unique name if duplicate exists
 */
export const generateUniqueName = (baseName, existingNames) => {
  let name = baseName;
  let counter = 1;

  while (existingNames.includes(name)) {
    name = `${baseName} (${counter})`;
    counter++;
  }

  return name;
};

/**
 * Export a workflow with its agents and tools to JSON file
 */
export const exportWorkflow = async (workflow, agents = [], tools = []) => {
  // Get agents used by this workflow
  const workflowAgents = workflow.agents 
    ? agents.filter(a => workflow.agents.some(wa => wa.agentId === a.id))
    : [];
  
  // Get all custom tools used by those agents
  const toolIds = new Set();
  workflowAgents.forEach(agent => {
    const agentTools = agent.tools || [];
    if (Array.isArray(agentTools)) {
      agentTools.forEach(toolId => toolIds.add(toolId));
    }
  });
  
  const workflowTools = tools.filter(t => toolIds.has(t.id) && !t.isDefault);
  
  // Ensure all agents have tools array
  const agentsWithTools = workflowAgents.map(agent => ({
    ...agent,
    tools: agent.tools || []
  }));
  
  const exportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    type: 'workflow',
    workflow: sanitizeWorkflow(workflow),
    agentCount: workflowAgents.length,
    toolCount: workflowTools.length,
    agents: agentsWithTools.map(sanitizeAgent),
    tools: workflowTools.map(sanitizeTool)
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
    type: 'application/json' 
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${workflow.name.replace(/\s+/g, '-').toLowerCase()}-workflow.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Remove internal fields before workflow export
 */
const sanitizeWorkflow = (workflow) => {
  const { id, createdAt, updatedAt, ...cleanWorkflow } = workflow;
  return {
    ...cleanWorkflow,
    exportedAt: new Date().toISOString()
  };
};

/**
 * Validate imported workflow JSON structure (with agents and tools)
 */
export const validateWorkflowImportData = (data) => {
  try {
    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'Invalid JSON structure' };
    }

    // Check for version
    if (!data.version) {
      return { valid: false, error: 'Missing version information' };
    }

    // Check for workflow type
    if (data.type !== 'workflow') {
      return { valid: false, error: 'Invalid file type. Expected workflow export.' };
    }

    // Check for workflow data
    if (!data.workflow || typeof data.workflow !== 'object') {
      return { valid: false, error: 'Missing or invalid workflow data' };
    }

    // Validate workflow fields
    const workflow = data.workflow;
    if (!workflow.name || !workflow.agents || !Array.isArray(workflow.agents)) {
      return { valid: false, error: 'Workflow missing required fields (name, agents array)' };
    }

    return { valid: true, workflow, agents: data.agents || [], tools: data.tools || [] };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

/**
 * Parse and import workflow from file (including agents and tools)
 */
export const importWorkflowFromFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const jsonData = JSON.parse(event.target.result);
        const validation = validateWorkflowImportData(jsonData);
        
        if (!validation.valid) {
          reject(new Error(validation.error));
          return;
        }

        // Return workflow, agents, and tools
        resolve({ workflow: validation.workflow, agents: validation.agents, tools: validation.tools });
      } catch (error) {
        reject(new Error('Failed to parse JSON file'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
};
