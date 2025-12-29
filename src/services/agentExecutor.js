// src/services/agentExecutor.js
// This service handles the recursive conversation loop with tool execution

import { getToolById } from './indexedDB';
import { executeTool, parseFunctionCalls } from './toolExecutor';
import { searchSimilarDocuments } from './vectorStore';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MAX_ITERATIONS = 10; // Prevent infinite loops

/**
 * Execute agent with tool calling support
 * This implements the recursive conversation loop:
 * 1. Send prompt to LLM
 * 2. Check if LLM wants to call a tool
 * 3. Execute tool
 * 4. Send result back to LLM
 * 5. Repeat until task complete or max iterations reached
 */
export async function executeAgentWithTools(agent, userInput, customParams, apiKey) {
  console.log('🚀 Starting agent execution with tools...');
  
  const conversationHistory = [];
  const toolExecutionLog = [];
  let iteration = 0;
  
  // Build initial system prompt
  const systemPrompt = await buildSystemPrompt(agent, customParams, apiKey, userInput);
  
  // Get Gemini parameters
  const geminiParams = extractGeminiParameters(customParams);
  
  // Load tools if agent has them
  const agentTools = await loadAgentTools(agent);
  
  // Initial user message
  conversationHistory.push({
    role: 'user',
    parts: [{ text: `${systemPrompt}\n\n---\n\nUser Request: ${userInput}` }]
  });
  
  // Conversation loop
  while (iteration < MAX_ITERATIONS) {
    iteration++;
    console.log(`\n📍 Iteration ${iteration}/${MAX_ITERATIONS}`);
    
    try {
      // Call LLM
      const response = await callGeminiAPI(
        agent.model,
        conversationHistory,
        geminiParams,
        agentTools,
        apiKey
      );
      
      if (!response || !response.text) {
        throw new Error('Invalid response from LLM');
      }
      
      console.log('🤖 LLM Response:', response.text.substring(0, 200) + '...');
      
      // Add assistant response to history
      conversationHistory.push({
        role: 'model',
        parts: [{ text: response.text }]
      });
      
      // Check if LLM wants to use a tool
      const functionCalls = parseFunctionCalls(response.text);
      
      if (functionCalls.length === 0) {
        // No tool calls, task is complete
        console.log('✅ Task complete - no more tool calls needed');
        return {
          success: true,
          result: response.text,
          iterations: iteration,
          toolExecutions: toolExecutionLog,
          conversationHistory: conversationHistory
        };
      }
      
      // Execute tool calls
      console.log(`🔧 Found ${functionCalls.length} tool call(s)`);
      
      for (const call of functionCalls) {
        console.log(`  → Calling tool: ${call.name}`);
        
        // Find the tool
        const tool = agentTools.find(t => t.name === call.name);
        
        if (!tool) {
          console.warn(`  ⚠️ Tool not found: ${call.name}`);
          continue;
        }
        
        // Execute the tool
        const toolResult = await executeTool(tool, call.arguments);
        
        console.log(`  ✓ Tool result:`, toolResult);
        
        // Log execution
        toolExecutionLog.push({
          iteration: iteration,
          tool: call.name,
          arguments: call.arguments,
          result: toolResult
        });
        
        // Add tool result to conversation
        const resultMessage = {
          role: 'user',
          parts: [{
            text: `Tool "${call.name}" execution result:\n${JSON.stringify(toolResult, null, 2)}\n\nPlease continue with the task using this information.`
          }]
        };
        
        conversationHistory.push(resultMessage);
      }
      
    } catch (error) {
      console.error('❌ Error in iteration:', error);
      
      return {
        success: false,
        error: error.message,
        result: null,
        iterations: iteration,
        toolExecutions: toolExecutionLog,
        conversationHistory: conversationHistory
      };
    }
  }
  
  // Max iterations reached
  console.warn('⚠️ Max iterations reached');
  
  return {
    success: false,
    error: 'Max iterations reached. Task may be incomplete.',
    result: conversationHistory[conversationHistory.length - 1]?.parts[0]?.text || null,
    iterations: iteration,
    toolExecutions: toolExecutionLog,
    conversationHistory: conversationHistory
  };
}

/**
 * Build system prompt with tools information
 */
async function buildSystemPrompt(agent, customParams, apiKey, userInput) {
  let prompt = `You are a ${agent.role}.\n\nYour goal is: ${agent.goal}\n\nTask Description:\n${agent.taskDescription}\n\nExpected Output Format:\n${agent.expectedOutput}`;
  
  // Add context parameters
  const contextParams = Object.entries(customParams).filter(
    ([key]) => !['temperature', 'maxtokens', 'topp', 'topk'].includes(key.toLowerCase())
  );
  
  if (contextParams.length > 0) {
    prompt += '\n\nContext:';
    contextParams.forEach(([key, value]) => {
      prompt += `\n- ${key}: ${value}`;
    });
  }
  
  // Add RAG context if enabled
  if (agent.ragEnabled) {
    try {
      const relevantDocs = await searchSimilarDocuments(
        agent.id,
        userInput,
        apiKey,
        agent.ragTopK || 3
      );
      
      if (relevantDocs.length > 0) {
        prompt += '\n\nRelevant Knowledge Base Documents:\n';
        relevantDocs.forEach((doc, i) => {
          prompt += `\n[Document ${i + 1}] ${doc.content}\n`;
        });
      }
    } catch (error) {
      console.warn('Failed to fetch RAG documents:', error);
    }
  }
  
  return prompt;
}

/**
 * Load tools for an agent
 */
async function loadAgentTools(agent) {
  if (!agent.tools || agent.tools.length === 0) {
    return [];
  }
  
  const toolObjects = await Promise.all(
    agent.tools.map(toolId => getToolById(toolId))
  );
  
  return toolObjects.filter(t => t !== null && t !== undefined);
}

/**
 * Call Gemini API with conversation history
 */
async function callGeminiAPI(model, conversationHistory, geminiParams, tools, apiKey) {
  const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`;
  
  // Prepare tools description for the system
  let toolsInstruction = '';
  if (tools.length > 0) {
    toolsInstruction = '\n\n=== AVAILABLE TOOLS ===\n';
    toolsInstruction += 'You have access to the following tools. When you need to use a tool, output a JSON object in this exact format:\n';
    toolsInstruction += '{"function": "tool_name", "arguments": {param1: value1, param2: value2}}\n\n';
    
    tools.forEach(tool => {
      toolsInstruction += `Tool: ${tool.name}\n`;
      toolsInstruction += `Description: ${tool.description}\n`;
      
      if (tool.parameters && tool.parameters.length > 0) {
        toolsInstruction += 'Parameters:\n';
        tool.parameters.forEach(param => {
          toolsInstruction += `  - ${param.name} (${param.type}${param.required ? ', required' : ', optional'}): ${param.description || 'No description'}\n`;
        });
      }
      
      toolsInstruction += `Returns: ${tool.returnType}\n\n`;
    });
    
    toolsInstruction += 'After receiving tool results, continue your reasoning and use the information to complete the task.\n';
    toolsInstruction += '===================\n';
  }
  
  // Add tools instruction to the first message if tools exist
  const messages = [...conversationHistory];
  if (tools.length > 0 && messages.length > 0) {
    messages[0] = {
      ...messages[0],
      parts: [{ text: messages[0].parts[0].text + toolsInstruction }]
    };
  }
  
  const requestBody = {
    contents: messages,
    generationConfig: {
      temperature: geminiParams.temperature || 0.7,
      topK: geminiParams.topK || 40,
      topP: geminiParams.topP || 0.95,
      maxOutputTokens: geminiParams.maxOutputTokens || 8000,
    }
  };
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Gemini API request failed');
  }
  
  const data = await response.json();
  
  if (!data.candidates || data.candidates.length === 0) {
    if (data.promptFeedback?.blockReason) {
      throw new Error(`Content blocked: ${data.promptFeedback.blockReason}`);
    }
    throw new Error('API returned no candidates');
  }
  
  if (!data.candidates[0].content || !data.candidates[0].content.parts || data.candidates[0].content.parts.length === 0) {
    throw new Error('API response missing content');
  }
  
  return {
    text: data.candidates[0].content.parts[0].text
  };
}

/**
 * Extract Gemini-specific parameters
 */
function extractGeminiParameters(customParams) {
  const geminiParams = {};
  
  const paramMapping = {
    'temperature': 'temperature',
    'maxtokens': 'maxOutputTokens',
    'topp': 'topP',
    'topk': 'topK',
  };
  
  Object.entries(customParams).forEach(([key, value]) => {
    if (paramMapping[key.toLowerCase()]) {
      const geminiKey = paramMapping[key.toLowerCase()];
      geminiParams[geminiKey] = parseFloat(value) || value;
    }
  });
  
  return geminiParams;
}
