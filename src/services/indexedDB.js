const DB_NAME = "AgentBuilderDB";
const STORE_NAME = "agents";
const EXECUTIONS_STORE = "executions";
const WORKFLOWS_STORE = "workflows";
const WORKFLOW_EXECUTIONS_STORE = "workflow_executions";
const TOOLS_STORE = "tools";
const DB_VERSION = 5; // Bump version!

export const getDB = async () => await initDB();

export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
        objectStore.createIndex("role", "role", { unique: false });
      }
      
      if (!db.objectStoreNames.contains(EXECUTIONS_STORE)) {
        const executionStore = db.createObjectStore(EXECUTIONS_STORE, {
          keyPath: "id",
        });
        executionStore.createIndex("agentId", "agentId", { unique: false });
        executionStore.createIndex("runAt", "runAt", { unique: false });
      }
      
      if (!db.objectStoreNames.contains(WORKFLOWS_STORE)) {
        const workflowStore = db.createObjectStore(WORKFLOWS_STORE, {
          keyPath: "id",
        });
        workflowStore.createIndex("name", "name", { unique: false });
        workflowStore.createIndex("createdAt", "createdAt", { unique: false });
      }
      
      if (!db.objectStoreNames.contains(WORKFLOW_EXECUTIONS_STORE)) {
        const workflowExecutionStore = db.createObjectStore(WORKFLOW_EXECUTIONS_STORE, {
          keyPath: "id",
        });
        workflowExecutionStore.createIndex("workflowId", "workflowId", { unique: false });
        workflowExecutionStore.createIndex("runAt", "runAt", { unique: false });
      }
      
      if (!db.objectStoreNames.contains(TOOLS_STORE)) {
        const toolStore = db.createObjectStore(TOOLS_STORE, {
          keyPath: "id",
        });
        toolStore.createIndex("name", "name", { unique: false });
        toolStore.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
  });
};


// ---------- AGENT CRUD ----------

export const saveAgent = async (agent) => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const agentData = { ...agent, createdAt: new Date() };
    const request = store.add(agentData);

    request.onsuccess = () => {
      // Return the complete agent object with the new ID
      resolve({ ...agentData, id: request.result });
    };
    request.onerror = () => reject(request.error);
  });
};

export const updateAgent = async (agent) => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ ...agent, updatedAt: new Date() });

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getAllAgents = async () => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getAgentById = async (id) => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const deleteAgent = async (id) => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Check if agent is used in any workflows
export const getWorkflowsUsingAgent = async (agentId) => {
  const workflows = await getAllWorkflows();
  return workflows.filter(workflow => 
    workflow.agents && workflow.agents.some(agent => agent.agentId === agentId)
  );
};


// ---------- EXECUTION HISTORY ----------

// Save a run (call this after each successful or failed agent run)
export async function saveExecutionLog(log) {
  const db = await getDB();
  const transaction = db.transaction([EXECUTIONS_STORE], "readwrite");
  const store = transaction.objectStore(EXECUTIONS_STORE);
  const request = store.add({ id: crypto.randomUUID(), ...log });
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Fetch all executions
export async function getAllExecutionLogs() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([EXECUTIONS_STORE], "readonly");
    const store = transaction.objectStore(EXECUTIONS_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Workflow CRUD operations
export async function saveWorkflow(workflow) {
  const db = await getDB();
  const tx = db.transaction([WORKFLOWS_STORE], 'readwrite');
  const store = tx.objectStore(WORKFLOWS_STORE);
  
  if (workflow.id) {
    // Update existing workflow
    await store.put({ 
      ...workflow, 
      updatedAt: new Date().toISOString() 
    });
  } else {
    // Create new workflow
    const id = crypto.randomUUID();
    await store.add({ 
      id, 
      ...workflow, 
      createdAt: new Date().toISOString() 
    });
  }
  
  return tx.done;
}

export async function getAllWorkflows() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([WORKFLOWS_STORE], 'readonly');
    const store = tx.objectStore(WORKFLOWS_STORE);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteWorkflow(id) {
  const db = await getDB();
  const tx = db.transaction([WORKFLOWS_STORE], 'readwrite');
  await tx.objectStore(WORKFLOWS_STORE).delete(id);
  return tx.done;
}

// Workflow Execution History
export async function saveWorkflowExecutionLog(log) {
  const db = await getDB();
  const transaction = db.transaction([WORKFLOW_EXECUTIONS_STORE], "readwrite");
  const store = transaction.objectStore(WORKFLOW_EXECUTIONS_STORE);
  const request = store.add({ id: crypto.randomUUID(), ...log });
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllWorkflowExecutionLogs() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WORKFLOW_EXECUTIONS_STORE], "readonly");
    const store = transaction.objectStore(WORKFLOW_EXECUTIONS_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---------- TOOLS CRUD ----------

export async function saveTool(tool) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([TOOLS_STORE], 'readwrite');
    const store = tx.objectStore(TOOLS_STORE);
    
    let toolData;
    let request;
    if (tool.id) {
      // Update existing tool
      toolData = { 
        ...tool, 
        updatedAt: new Date().toISOString() 
      };
      request = store.put(toolData);
    } else {
      // Create new tool
      const id = crypto.randomUUID();
      toolData = { 
        ...tool,
        id, 
        createdAt: new Date().toISOString() 
      };
      request = store.add(toolData);
    }
    
    request.onsuccess = () => resolve(toolData);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllTools() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([TOOLS_STORE], 'readonly');
    const store = tx.objectStore(TOOLS_STORE);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getToolById(id) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([TOOLS_STORE], 'readonly');
    const store = tx.objectStore(TOOLS_STORE);
    const request = store.get(id);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteTool(id) {
  const db = await getDB();
  const tx = db.transaction([TOOLS_STORE], 'readwrite');
  await tx.objectStore(TOOLS_STORE).delete(id);
  return tx.done;
}

// Check if tool is used by any agents
export async function getAgentsUsingTool(toolId) {
  const agents = await getAllAgents();
  return agents.filter(agent => 
    agent.tools && agent.tools.includes(toolId)
  );
}
