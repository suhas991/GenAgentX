// src/services/llmService.js

import { searchSimilarDocuments } from './vectorStore';
import { getToolById } from './indexedDB';
import { executeAgentWithTools } from './agentExecutor';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Get API key from user config (localStorage) first, fallback to env
const getApiKey = () => {
  // First check user config from onboarding
  const userConfig = localStorage.getItem('userConfig');
  if (userConfig) {
    try {
      const config = JSON.parse(userConfig);
      if (config.apiKey) {
        return config.apiKey;
      }
    } catch (error) {
      console.error('Error parsing user config:', error);
    }
  }

  // Fallback to environment variable (for development)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_GEMINI_API_KEY;
  }
  
  if (typeof process !== 'undefined' && process.env) {
    return process.env.REACT_APP_GEMINI_API_KEY;
  }
  
  return null;
};

export const executeAgent = async (agent, userInput, customParams, uploadedFiles = []) => {
  // Fast-fail if the browser reports we're offline.
  if (typeof navigator !== 'undefined' && navigator && navigator.onLine === false) {
    throw new Error('No internet connection (offline). Please reconnect and try again.');
  }

  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('API Key not found. Please configure your API key in settings or onboarding.');
  }

  // Check if agent has tools - if so, use the advanced executor with tool calling
  if (agent.tools && agent.tools.length > 0) {
    console.log('🔧 Agent has tools - using advanced executor with tool calling support');
    
    try {
      const result = await executeAgentWithTools(agent, userInput, customParams, apiKey);
      
      if (!result.success) {
        throw new Error(result.error || 'Agent execution failed');
      }
      
      // Return the final result with execution metadata
      let response = result.result;
      
      // Optionally append execution summary
      if (result.toolExecutions && result.toolExecutions.length > 0) {
        response += `\n\n---\n**Execution Summary:**\n`;
        response += `- Iterations: ${result.iterations}\n`;
        response += `- Tools Used: ${result.toolExecutions.length}\n`;
        result.toolExecutions.forEach((exec, i) => {
          response += `  ${i + 1}. ${exec.tool} (iteration ${exec.iteration})\n`;
        });
      }
      
      return response;
    } catch (error) {
      console.error('Tool-based execution error:', error);
      throw new Error(`Failed to execute agent with tools: ${error.message}`);
    }
  }

  // No tools - use simple execution
  console.log('📝 Agent has no tools - using simple execution');
  
  const systemPrompt = buildSystemPrompt(agent, customParams);
  const geminiParams = extractGeminiParameters(customParams);

  try {
    // Use the model from agent (default configured in constants)
    const model = agent.model;
    const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`;
    
    // Get relevant documents if RAG is enabled
    let context = '';
    if (agent.ragEnabled) {
      const relevantDocs = await searchSimilarDocuments(
        agent.id, 
        userInput, 
        apiKey, 
        agent.ragTopK || 3
      );
      
      if (relevantDocs.length > 0) {
        context = '\n\nRelevant Context:\n' + 
          relevantDocs.map((doc, i) => 
            `[Document ${i + 1}] ${doc.content}`
          ).join('\n\n');
      }
    }
    
    const fullPrompt = `${systemPrompt}\n\n---\n\nInput:\n${userInput}${context}`;
    
    // Build content parts - text + files
    const contentParts = [];
    
    // Add file parts first (recommended for better multimodal understanding)
    if (uploadedFiles && uploadedFiles.length > 0) {
      uploadedFiles.forEach(file => {
        if (file.isInline) {
          // Use inline data for browser-uploaded files
          contentParts.push({
            inline_data: {
              mime_type: file.mimeType,
              data: file.inlineData
            }
          });
        } else {
          // Fallback for file URIs (if using server-side upload)
          contentParts.push({
            file_data: {
              mime_type: file.mimeType,
              file_uri: file.uri
            }
          });
        }
      });
    }
    
    // Add text part after files
    contentParts.push({ text: fullPrompt });
    
    const requestBody = {
      contents: [{
        parts: contentParts
      }],
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
    
    // Check if response has expected structure
    if (!data.candidates || data.candidates.length === 0) {
      console.error('Unexpected API response:', data);
      
      // Check for safety ratings or prompt blocking
      if (data.promptFeedback?.blockReason) {
        throw new Error(`Content blocked: ${data.promptFeedback.blockReason}`);
      }
      
      throw new Error('API returned no candidates. The content may have been blocked or the response was empty.');
    }
    
    // Check if candidate has content
    if (!data.candidates[0].content || !data.candidates[0].content.parts || data.candidates[0].content.parts.length === 0) {
      console.error('Candidate missing content:', data.candidates[0]);
      throw new Error('API response missing content. This may be due to safety filters.');
    }
    
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Gemini API Error:', error);

    // Browser/network failures often surface as a generic TypeError: "Failed to fetch".
    if (
      error instanceof TypeError ||
      (typeof error?.message === 'string' && error.message.toLowerCase().includes('failed to fetch'))
    ) {
      if (typeof navigator !== 'undefined' && navigator && navigator.onLine === false) {
        throw new Error('Failed to execute agent: you appear to be offline (no internet connection).');
      }
      throw new Error('Failed to execute agent: network error connecting to Gemini API. Check your internet/VPN/proxy and try again.');
    }

    throw new Error(`Failed to execute agent: ${error.message}`);
  }
};

const buildSystemPrompt = (agent, customParams) => {
  let prompt = `You are a ${agent.role}.\n\nYour goal is: ${agent.goal}\n\nTask Description:\n${agent.taskDescription}\n\nExpected Output Format:\n${agent.expectedOutput}`;
  
  // Add context parameters (excluding Gemini-specific params)
  const contextParams = Object.entries(customParams).filter(
    ([key]) => !['temperature', 'maxtokens', 'topp', 'topk'].includes(key.toLowerCase())
  );
  
  if (contextParams.length > 0) {
    prompt += '\n\nContext:';
    contextParams.forEach(([key, value]) => {
      prompt += `\n- ${key}: ${value}`;
    });
  }
  
  return prompt;
};

const extractGeminiParameters = (customParams) => {
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
  
  if (!geminiParams.maxOutputTokens) {
    geminiParams.maxOutputTokens = 8192;
  }
  
  return geminiParams;
};
