// src/constants/defaultTools.js

export const DEFAULT_TOOLS = [
  {
    name: "calculator",
    description: "Perform mathematical calculations and solve equations. Evaluates mathematical expressions and returns the calculated result. Supports basic arithmetic operations (+, -, *, /), exponents (^), square roots, trigonometric functions (sin, cos, tan), and more complex mathematical operations.",
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
    description: "Analyze datasets and generate statistical insights. Performs statistical analysis on provided datasets including mean, median, mode, standard deviation, correlations, and trend identification. Returns a comprehensive analysis object with all calculated metrics and insights.",
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
    description: "Make HTTP requests to external APIs. Supports all common HTTP methods (GET, POST, PUT, DELETE) and allows custom headers and request bodies. Returns the API response including status code, headers, and response body.",
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
    description: "Return the current date/time for timestamping reports and responses. Returns ISO timestamp plus localized date/time for local zone and an optional target timezone (supports common abbreviations like IST/EST/UTC/PST).",
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
    description: "Generate a unique identifier for correlation IDs or request tracking. Returns a random UUID v4 string for tagging outputs or correlating logs.",
    parameters: [],
    returnType: "string",
    isBuiltIn: true
  }
];
