# Tool Execution System - How It Works

## Overview

The GenAgentX tool system implements a **recursive conversation loop** similar to CrewAI, where:

1. **LLM decides** to use a tool
2. **System parses** the function call
3. **Tool executes** with the provided arguments
4. **Result returns** to the LLM
5. **LLM continues** reasoning with the result
6. **Loop repeats** until the task is complete

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Request                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Agent Executor (agentExecutor.js)              │
│  • Manages conversation loop                                │
│  • Tracks iterations (max 10)                               │
│  • Maintains conversation history                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │   Iteration Loop (1-10)     │
         └─────────────┬───────────────┘
                       │
    ┌──────────────────┴──────────────────┐
    │                                     │
    ▼                                     ▼
┌─────────────────┐              ┌──────────────────┐
│  Call Gemini    │              │ Parse Function   │
│  API with       │─────────────▶│ Calls from       │
│  Conversation   │              │ LLM Response     │
│  History        │              │                  │
└─────────────────┘              └────────┬─────────┘
                                          │
                                          ▼
                                  ┌──────────────────┐
                                  │ Function Call?   │
                                  │                  │
                                  └────┬────────┬────┘
                                       │        │
                                 NO ◄──┘        └──▶ YES
                                  │                  │
                                  ▼                  ▼
                          ┌──────────────┐  ┌──────────────────┐
                          │ Task         │  │ Execute Tool     │
                          │ Complete     │  │ (toolExecutor.js)│
                          │ Return       │  │                  │
                          │ Result       │  └────────┬─────────┘
                          └──────────────┘           │
                                                     ▼
                                          ┌──────────────────┐
                                          │ Add Tool Result  │
                                          │ to Conversation  │
                                          │ History          │
                                          └────────┬─────────┘
                                                   │
                                                   └──▶ LOOP BACK
```

## Key Components

### 1. **agentExecutor.js** - Orchestrates the Loop

```javascript
export async function executeAgentWithTools(agent, userInput, customParams, apiKey) {
  // Initialize conversation history
  const conversationHistory = [];
  let iteration = 0;
  
  while (iteration < MAX_ITERATIONS) {
    iteration++;
    
    // 1. Call LLM with conversation history
    const response = await callGeminiAPI(...);
    
    // 2. Parse function calls from response
    const functionCalls = parseFunctionCalls(response.text);
    
    // 3. If no function calls, task is complete
    if (functionCalls.length === 0) {
      return { success: true, result: response.text };
    }
    
    // 4. Execute each function call
    for (const call of functionCalls) {
      const tool = findTool(call.name);
      const result = await executeTool(tool, call.arguments);
      
      // 5. Add result back to conversation
      conversationHistory.push({
        role: 'user',
        parts: [{ text: `Tool result: ${JSON.stringify(result)}` }]
      });
    }
    
    // 6. Loop continues...
  }
}
```

### 2. **toolExecutor.js** - Executes Actual Tools

```javascript
export async function executeTool(tool, args) {
  switch (tool.name) {
    case 'calculator':
      return await executeCalculator(args);
    
    case 'web_search':
      return await executeWebSearch(args);
    
    case 'api_caller':
      return await executeApiCaller(args);
    
    // ... more tools
  }
}
```

**Built-in Tool Implementations:**

- ✅ **calculator** - Fully functional math evaluation
- ✅ **data_analyzer** - Statistical analysis (mean, median, std dev, etc.)
- ✅ **api_caller** - Make HTTP requests to external APIs
- ⚠️ **web_search** - Placeholder (integrate SerpAPI, Tavily, etc.)
- ⚠️ **file_reader** - Placeholder (use FileReader API or backend)
- ⚠️ **code_executor** - Placeholder (requires backend sandbox)
- ⚠️ **image_analyzer** - Placeholder (integrate Gemini Vision API)

### 3. **llmService.js** - Entry Point

```javascript
export const executeAgent = async (agent, userInput, customParams) => {
  // Check if agent has tools
  if (agent.tools && agent.tools.length > 0) {
    // Use advanced executor with tool calling
    return await executeAgentWithTools(agent, userInput, customParams, apiKey);
  } else {
    // Use simple single-call execution
    return await simpleExecution(...);
  }
}
```

## How the LLM Calls Tools

The LLM is instructed to output function calls in this format:

```json
{"function": "calculator", "arguments": {"expression": "2 + 2"}}
```

**Example Conversation Flow:**

```
User: "Calculate the square root of 144 and then multiply it by 5"

Iteration 1:
  LLM: {"function": "calculator", "arguments": {"expression": "sqrt(144)"}}
  Tool Result: {"success": true, "result": 12}

Iteration 2:
  LLM: {"function": "calculator", "arguments": {"expression": "12 * 5"}}
  Tool Result: {"success": true, "result": 60}

Iteration 3:
  LLM: The answer is 60. (No function call → Task Complete)
```

## Creating Custom Tools

### Step 1: Define Tool in UI

```javascript
{
  name: "my_custom_tool",
  description: "What this tool does",
  parameters: [
    {
      name: "param1",
      type: "string",
      description: "Parameter description",
      required: true
    }
  ],
  returnType: "object",
  implementation: "Detailed description of how the tool works"
}
```

### Step 2: Implement Executor

Add to `toolExecutor.js`:

```javascript
export async function executeTool(tool, args) {
  switch (tool.name) {
    // ... existing tools
    
    case 'my_custom_tool':
      return await executeMyCustomTool(args);
  }
}

async function executeMyCustomTool(args) {
  const { param1 } = args;
  
  // Your implementation here
  const result = doSomething(param1);
  
  return {
    success: true,
    data: result
  };
}
```

## Production Integrations

### Web Search
```javascript
// Using Tavily API
async function executeWebSearch(args) {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query: args.query,
      max_results: args.num_results || 5
    })
  });
  return await response.json();
}
```

### Image Analysis
```javascript
// Using Gemini Vision
async function executeImageAnalyzer(args) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-pro-vision:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: `Analyze this image: ${args.analysis_type}` },
            { inline_data: { mime_type: "image/jpeg", data: imageBase64 } }
          ]
        }]
      })
    }
  );
  return await response.json();
}
```

## Safety & Limits

- **Max Iterations**: 10 (prevents infinite loops)
- **Timeout**: Consider adding per-tool timeouts
- **Error Handling**: All tools return `{error: true, message: "..."}` on failure
- **Validation**: Tool arguments should be validated before execution
- **Sandboxing**: Code executor requires secure backend environment

## Usage in UI

1. Navigate to **Tools** section
2. Create or use default tools
3. Edit/Create an **Agent**
4. In the agent form, select tools to attach
5. Run the agent - tools will be automatically available
6. View execution log to see tool calls and results

## Debugging

Enable console logging to see:
```
🚀 Starting agent execution with tools...
📍 Iteration 1/10
🤖 LLM Response: {...}
🔧 Found 1 tool call(s)
  → Calling tool: calculator
  ✓ Tool result: {"success": true, "result": 42}
📍 Iteration 2/10
...
✅ Task complete - no more tool calls needed
```

## Future Enhancements

- [ ] Streaming responses during tool execution
- [ ] Tool execution analytics and metrics
- [ ] Custom tool marketplace/sharing
- [ ] Multi-tool parallel execution
- [ ] Tool execution caching
- [ ] Advanced error recovery strategies
- [ ] Tool versioning and compatibility checks
