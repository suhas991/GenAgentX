// src/constants/defaultTools.js

export const DEFAULT_TOOLS = [
  {
    name: "calculator",
    description: "Perform mathematical calculations and solve equations",
    parameters: [
      {
        name: "expression",
        type: "string",
        description: "The mathematical expression to evaluate (e.g., '2 + 2', 'sqrt(16)', 'sin(45)')",
        required: true
      }
    ],
    returnType: "number",
    isBuiltIn: true
  },
  {
    name: "data_analyzer",
    description: "Analyze datasets and generate statistical insights",
    parameters: [
      {
        name: "data",
        type: "array",
        description: "Array of data points to analyze",
        required: true
      },
      {
        name: "analysis_type",
        type: "string",
        description: "Type of analysis: 'summary', 'correlation', 'distribution', 'trend'",
        required: false
      }
    ],
    returnType: "object",
    isBuiltIn: true
  },
  {
    name: "api_caller",
    description: "Make HTTP requests to external APIs",
    parameters: [
      {
        name: "url",
        type: "string",
        description: "The API endpoint URL",
        required: true
      },
      {
        name: "method",
        type: "string",
        description: "HTTP method: 'GET', 'POST', 'PUT', 'DELETE'",
        required: false
      },
      {
        name: "headers",
        type: "object",
        description: "Request headers as key-value pairs",
        required: false
      },
      {
        name: "body",
        type: "object",
        description: "Request body (for POST/PUT requests)",
        required: false
      }
    ],
    returnType: "object",
    isBuiltIn: true
  },
  {
    name: "current_datetime",
    description: "Return the current date/time for timestamping reports and responses",
    parameters: [
      {
        name: "timezone",
        type: "string",
        description: "Optional timezone (e.g., 'UTC', 'IST', 'EST', 'PST', 'Asia/Kolkata', 'America/New_York')",
        required: false
      }
    ],
    returnType: "object",
    isBuiltIn: true
  },
  {
    name: "uuid_generator",
    description: "Generate a unique identifier for correlation IDs or request tracking",
    parameters: [],
    returnType: "string",
    isBuiltIn: true
  }
];
