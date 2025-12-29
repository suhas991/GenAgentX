// src/services/toolExecutor.js
// This service handles the actual execution of tools

/**
 * Execute a tool function with the provided arguments
 * @param {Object} tool - The tool object from the database
 * @param {Object} args - Arguments to pass to the tool
 * @returns {Promise<any>} - The result of the tool execution
 */
export async function executeTool(tool, args) {
  console.log(`🔧 Executing tool: ${tool.name}`, args);

  try {
    // If tool has custom code implementation, use that
    if (tool.codeImplementation && tool.codeImplementation.trim()) {
      console.log('📝 Using custom code implementation');
      return await executeCustomCode(tool, args);
    }
    
    // Otherwise, route to built-in implementations
    switch (tool.name) {
      case 'calculator':
        return await executeCalculator(args);
      
      case 'data_analyzer':
        return await executeDataAnalyzer(args);
      
      case 'api_caller':
        return await executeApiCaller(args);

      case 'current_datetime':
        return await executeCurrentDateTime(args);

      case 'uuid_generator':
        return await executeUuidGenerator();
      
      default:
        throw new Error(`Tool '${tool.name}' is not implemented and has no custom code`);
    }
  } catch (error) {
    console.error(`Error executing tool ${tool.name}:`, error);
    return {
      error: true,
      message: error.message,
      toolName: tool.name
    };
  }
}

/**
 * Execute custom user-provided JavaScript code
 * WARNING: This uses eval which can be dangerous. Only run trusted code.
 */
async function executeCustomCode(tool, args) {
  try {
    console.log('⚠️ Executing custom code - ensure this is from a trusted source');
    
    // Create a sandboxed function
    // The code should define an 'execute' function or return a function
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    
    // Wrap the user code to extract the execute function
    const wrappedCode = `
      ${tool.codeImplementation}
      
      // If execute function is defined, return it
      if (typeof execute === 'function') {
        return execute;
      }
      
      // Otherwise, the code itself should be a function
      throw new Error('Code must define an "execute" function');
    `;
    
    // Create and run the code
    const codeFactory = new AsyncFunction(wrappedCode);
    const executeFunction = await codeFactory();
    
    // Execute with args
    const result = await executeFunction(args);
    
    return result;
  } catch (error) {
    console.error('Custom code execution error:', error);
    throw new Error(`Custom code execution failed: ${error.message}`);
  }
}

// ==================== TOOL IMPLEMENTATIONS ====================

async function executeCalculator(args) {
  const { expression } = args;
  
  try {
    // Safe math evaluation (you might want to use a library like math.js for production)
    // This is a simple implementation
    const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
    
    // Basic validation
    if (!sanitized) {
      throw new Error('Invalid mathematical expression');
    }
    
    // Evaluate using Function constructor (be careful with user input in production!)
    const result = Function(`'use strict'; return (${sanitized})`)();
    
    return {
      success: true,
      expression: expression,
      result: result
    };
  } catch (error) {
    throw new Error(`Calculation failed: ${error.message}`);
  }
}

async function executeDataAnalyzer(args) {
  const { data, analysis_type = 'summary' } = args;
  
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Data must be a non-empty array');
  }
  
  // Convert to numbers if possible
  const numbers = data.map(d => typeof d === 'number' ? d : parseFloat(d)).filter(n => !isNaN(n));
  
  if (numbers.length === 0) {
    throw new Error('No valid numeric data found');
  }
  
  // Calculate basic statistics
  const sorted = [...numbers].sort((a, b) => a - b);
  const sum = numbers.reduce((acc, val) => acc + val, 0);
  const mean = sum / numbers.length;
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  
  const variance = numbers.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / numbers.length;
  const stdDev = Math.sqrt(variance);
  
  return {
    success: true,
    analysis_type: analysis_type,
    count: numbers.length,
    sum: sum,
    mean: mean,
    median: median,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    range: sorted[sorted.length - 1] - sorted[0],
    variance: variance,
    standardDeviation: stdDev
  };
}

async function executeApiCaller(args) {
  const { url, method = 'GET', headers = {}, body = null } = args;
  
  try {
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = typeof body === 'string' ? body : JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const data = await response.json().catch(() => response.text());
    
    return {
      success: true,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: data
    };
  } catch (error) {
    throw new Error(`API call failed: ${error.message}`);
  }
}

function resolveTimeZone(tzInput) {
  if (!tzInput) return Intl.DateTimeFormat().resolvedOptions().timeZone;
  const upper = tzInput.toUpperCase();
  const map = {
    IST: 'Asia/Kolkata',
    EST: 'America/New_York',
    PST: 'America/Los_Angeles',
    CST: 'America/Chicago',
    MST: 'America/Denver',
    UTC: 'UTC',
    GMT: 'Etc/GMT'
  };
  return map[upper] || tzInput;
}

async function executeCurrentDateTime(args = {}) {
  const { timezone } = args;
  const now = new Date();
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const targetTz = resolveTimeZone(timezone);

  const formatFor = (tz) => ({
    date: now.toLocaleDateString(undefined, { timeZone: tz }),
    time: now.toLocaleTimeString(undefined, { timeZone: tz }),
    timezone: tz
  });

  return {
    success: true,
    isoUtc: now.toISOString(),
    epochSeconds: Math.floor(now.getTime() / 1000),
    local: formatFor(localTz),
    requested: formatFor(targetTz)
  };
}

async function executeUuidGenerator() {
  const uuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return {
    success: true,
    uuid
  };
}

/**
 * Parse function calls from LLM response
 * Looks for JSON function call format in the response
 */
export function parseFunctionCalls(text) {
  const functionCalls = [];
  
  // Look for function call patterns in the text
  // Format: {"function": "tool_name", "arguments": {...}}
  const functionCallRegex = /\{[\s\S]*?"function"[\s\S]*?:[\s\S]*?"([^"]+)"[\s\S]*?,[\s\S]*?"arguments"[\s\S]*?:[\s\S]*?\{[\s\S]*?\}[\s\S]*?\}/g;
  
  let match;
  while ((match = functionCallRegex.exec(text)) !== null) {
    try {
      const callData = JSON.parse(match[0]);
      functionCalls.push({
        name: callData.function,
        arguments: callData.arguments
      });
    } catch (e) {
      console.warn('Failed to parse function call:', match[0]);
    }
  }
  
  return functionCalls;
}
