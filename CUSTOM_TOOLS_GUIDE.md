# Custom Tools Guide

## How Tools Work

### Two Types of Tools:

1. **Built-in Tools** (Hardcoded in `toolExecutor.js`)
   - Pre-implemented in the system
   - Cannot be modified via UI
   - Examples: calculator, data_analyzer, api_caller
   - **These actually execute code**

2. **Custom Tools** (User-created)
   - Created through the UI
   - Have two components:
     - **Implementation Description** (Required) - Tells the LLM what the tool does
     - **JavaScript Code** (Optional) - Actually executes the tool
   - **Without code**: Tool is descriptive only (LLM understands it but can't execute)
   - **With code**: Tool actually executes when called

## Understanding Tool Execution

### Scenario 1: Built-in Tool (calculator)

```javascript
// In toolExecutor.js - this code runs when LLM calls it
async function executeCalculator(args) {
  const { expression } = args;
  const result = Function(`'use strict'; return (${expression})`)();
  return { success: true, result };
}
```

**Flow:**
1. LLM outputs: `{"function": "calculator", "arguments": {"expression": "2+2"}}`
2. System parses function call
3. **Actually executes** `executeCalculator({expression: "2+2"})`
4. Returns `{success: true, result: 4}`
5. LLM receives result and continues

### Scenario 2: Custom Tool WITHOUT Code

**Tool Definition:**
```json
{
  "name": "sentiment_analyzer",
  "description": "Analyzes text sentiment",
  "implementation": "This tool analyzes the emotional tone of text and returns positive, negative, or neutral",
  "codeImplementation": "" // EMPTY!
}
```

**What Happens:**
1. LLM sees the tool is available
2. LLM outputs: `{"function": "sentiment_analyzer", "arguments": {"text": "I love this!"}}`
3. System tries to execute but **NO CODE EXISTS**
4. Tool returns error: `"Tool 'sentiment_analyzer' is not implemented and has no custom code"`
5. ❌ **Tool doesn't work!**

### Scenario 3: Custom Tool WITH Code

**Tool Definition:**
```javascript
{
  "name": "sentiment_analyzer",
  "description": "Analyzes text sentiment",
  "implementation": "This tool analyzes the emotional tone of text",
  "codeImplementation": `
    async function execute(args) {
      const { text } = args;
      
      // Simple sentiment analysis
      const positiveWords = ['love', 'great', 'awesome', 'excellent'];
      const negativeWords = ['hate', 'bad', 'terrible', 'awful'];
      
      const textLower = text.toLowerCase();
      let score = 0;
      
      positiveWords.forEach(word => {
        if (textLower.includes(word)) score++;
      });
      
      negativeWords.forEach(word => {
        if (textLower.includes(word)) score--;
      });
      
      return {
        success: true,
        sentiment: score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral',
        score: score
      };
    }
  `
}
```

**What Happens:**
1. LLM outputs: `{"function": "sentiment_analyzer", "arguments": {"text": "I love this!"}}`
2. System finds custom code
3. **Actually executes** the JavaScript code with `{text: "I love this!"}`
4. Returns `{success: true, sentiment: 'positive', score: 1}`
5. ✅ **Tool works!**

## Creating Custom Tools - Step by Step

### Example 1: Temperature Converter

**Step 1: Create Tool in UI**

- **Name:** `temperature_converter`
- **Description:** Convert temperatures between Celsius and Fahrenheit
- **Parameters:**
  - `value` (number, required): Temperature value
  - `from_unit` (string, required): Source unit ('C' or 'F')
  - `to_unit` (string, required): Target unit ('C' or 'F')
- **Return Type:** `object`
- **Implementation Description:**
  ```
  Converts temperature values between Celsius and Fahrenheit. 
  Returns the converted value with the target unit.
  ```

**Step 2: Add JavaScript Code**

```javascript
async function execute(args) {
  const { value, from_unit, to_unit } = args;
  
  // Validate inputs
  if (!['C', 'F'].includes(from_unit) || !['C', 'F'].includes(to_unit)) {
    throw new Error('Units must be "C" or "F"');
  }
  
  if (from_unit === to_unit) {
    return {
      success: true,
      original: value,
      converted: value,
      from: from_unit,
      to: to_unit
    };
  }
  
  let result;
  if (from_unit === 'C' && to_unit === 'F') {
    result = (value * 9/5) + 32;
  } else {
    result = (value - 32) * 5/9;
  }
  
  return {
    success: true,
    original: value,
    converted: Math.round(result * 100) / 100,
    from: from_unit,
    to: to_unit,
    formula: from_unit === 'C' ? '(C × 9/5) + 32' : '(F - 32) × 5/9'
  };
}
```

**Step 3: Test It**

Click "Test" button, enter:
- value: `25`
- from_unit: `C`
- to_unit: `F`

Expected result:
```json
{
  "success": true,
  "original": 25,
  "converted": 77,
  "from": "C",
  "to": "F",
  "formula": "(C × 9/5) + 32"
}
```

### Example 2: Text Statistics

```javascript
async function execute(args) {
  const { text } = args;
  
  const words = text.trim().split(/\s+/);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, '').length;
  
  // Calculate average word length
  const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
  
  // Find longest word
  const longestWord = words.reduce((longest, word) => 
    word.length > longest.length ? word : longest, '');
  
  return {
    success: true,
    statistics: {
      characters: characters,
      charactersNoSpaces: charactersNoSpaces,
      words: words.length,
      sentences: sentences.length,
      averageWordLength: Math.round(avgWordLength * 10) / 10,
      longestWord: longestWord,
      longestWordLength: longestWord.length
    }
  };
}
```

### Example 3: Simple Database (Using LocalStorage)

```javascript
async function execute(args) {
  const { action, key, value } = args;
  
  const DB_PREFIX = 'custom_tool_db_';
  
  switch (action) {
    case 'set':
      if (!key || value === undefined) {
        throw new Error('Set action requires key and value');
      }
      localStorage.setItem(DB_PREFIX + key, JSON.stringify(value));
      return {
        success: true,
        action: 'set',
        key: key,
        value: value
      };
    
    case 'get':
      if (!key) {
        throw new Error('Get action requires key');
      }
      const stored = localStorage.getItem(DB_PREFIX + key);
      return {
        success: true,
        action: 'get',
        key: key,
        value: stored ? JSON.parse(stored) : null
      };
    
    case 'delete':
      if (!key) {
        throw new Error('Delete action requires key');
      }
      localStorage.removeItem(DB_PREFIX + key);
      return {
        success: true,
        action: 'delete',
        key: key
      };
    
    case 'list':
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const storageKey = localStorage.key(i);
        if (storageKey.startsWith(DB_PREFIX)) {
          keys.push(storageKey.replace(DB_PREFIX, ''));
        }
      }
      return {
        success: true,
        action: 'list',
        keys: keys
      };
    
    default:
      throw new Error('Action must be: set, get, delete, or list');
  }
}
```

## Testing Tools

### Using the Test Button

1. Navigate to **Tools** section
2. Click **Test** on any tool
3. Enter parameter values
4. Click **Run Test**
5. See the actual execution result

**Example: Testing calculator**
- expression: `Math.sqrt(144) * 5`
- Result: `{"success": true, "result": 60}`

### Testing Custom Code

**Tips:**
- Use `console.log()` - check browser console
- Return objects with `success` field
- Handle errors with try-catch
- Test with various input types

## Security Considerations

### ⚠️ Important Warnings:

1. **Code Execution Risk**
   - Custom code uses `eval()` which can be dangerous
   - Only use tools from trusted sources
   - Never paste unknown code

2. **What Custom Code Can Access**
   - ✅ `localStorage`, `sessionStorage`
   - ✅ `fetch()` for API calls
   - ✅ Browser APIs (Date, Math, JSON, etc.)
   - ❌ Node.js APIs (fs, path, etc.) - this is browser-only
   - ❌ Cannot access file system directly

3. **Best Practices**
   - Validate all inputs
   - Handle errors gracefully
   - Return consistent result format
   - Don't store sensitive data in code
   - Test thoroughly before using in agents

## Advanced Examples

### Making API Calls in Custom Tools

```javascript
async function execute(args) {
  const { city } = args;
  
  // Using a free weather API (example)
  const response = await fetch(
    `https://api.weatherapi.com/v1/current.json?key=YOUR_API_KEY&q=${city}`
  );
  
  if (!response.ok) {
    throw new Error('Weather API request failed');
  }
  
  const data = await response.json();
  
  return {
    success: true,
    city: data.location.name,
    temperature: data.current.temp_c,
    condition: data.current.condition.text,
    humidity: data.current.humidity,
    windSpeed: data.current.wind_kph
  };
}
```

### Using Browser Storage

```javascript
async function execute(args) {
  const { todo, action } = args;
  
  // Get existing todos
  let todos = JSON.parse(localStorage.getItem('todos') || '[]');
  
  if (action === 'add') {
    todos.push({
      id: Date.now(),
      text: todo,
      completed: false,
      createdAt: new Date().toISOString()
    });
  } else if (action === 'list') {
    // Return list
  } else if (action === 'complete') {
    todos = todos.map(t => 
      t.text === todo ? { ...t, completed: true } : t
    );
  }
  
  localStorage.setItem('todos', JSON.stringify(todos));
  
  return {
    success: true,
    action: action,
    todos: todos
  };
}
```

## Troubleshooting

### "Tool is not implemented and has no custom code"
- **Solution**: Add JavaScript code in the "JavaScript Code" field when creating/editing the tool

### "Custom code execution failed"
- Check browser console for errors
- Ensure code defines `async function execute(args) {...}`
- Validate that code is valid JavaScript

### Tool returns unexpected results
- Use the Test feature to debug
- Add `console.log()` statements
- Check that parameters match expected types

### Code doesn't have access to something
- Remember: this runs in the browser, not Node.js
- Can't access file system or run shell commands
- For those features, you need a backend service

## Next Steps

1. Try creating a simple custom tool
2. Test it thoroughly
3. Attach it to an agent
4. Run the agent and see tool execution in action
5. Check the console logs to see the conversation loop
