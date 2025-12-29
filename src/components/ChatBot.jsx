// src/components/ChatBot.jsx
import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { TbMessageChatbot } from "react-icons/tb";
import { BsRobot } from "react-icons/bs";
import { FaUserCircle } from "react-icons/fa";
import "./Chatbot.css";

const ChatBot = ({
  isOpen,
  onToggle,
  onSendMessage,
  agentName,
  onImportAgent,
  onImportTool,
}) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi! 👋 I'm the **GenAgentX Assistant**.

I can help you create AI agents and custom tools. Just describe what you want!

*Examples:*
- "Create an agent that writes marketing emails"
- "Build a tool to generate random UUIDs"
- "I need a customer support agent"
- "Make a slug generator tool"`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Detect if message contains valid JSON agent or tool config
  const detectAgentJSON = (content) => {
    content = content || "";
    console.log("🔍 Checking for JSON in content preview:", content.slice(0, 200));

    const tryParse = (text) => {
      try {
        return JSON.parse(text);
      } catch (e) {
        return null;
      }
    };

    const isAgentObject = (obj) =>
      obj &&
      typeof obj === "object" &&
      !Array.isArray(obj) &&
      ["name", "role", "goal", "model", "taskDescription", "expectedOutput"].every((k) =>
        Object.prototype.hasOwnProperty.call(obj, k)
      );

    const isToolObject = (obj) =>
      obj &&
      typeof obj === "object" &&
      !Array.isArray(obj) &&
      ["name", "description", "parameters", "returnType"].every((k) =>
        Object.prototype.hasOwnProperty.call(obj, k)
      );

    const normalizeParsed = (parsed) => {
      // If it's export format { version, agents: [...], tools: [...] }
      if (parsed && typeof parsed === "object") {
        const hasAgents = Array.isArray(parsed.agents) && parsed.agents.length > 0;
        const hasTools = Array.isArray(parsed.tools) && parsed.tools.length > 0;

        if (hasAgents && isAgentObject(parsed.agents[0])) {
          console.log("✅ Valid GenAgentX agent export detected");
          return { valid: true, type: 'agent', data: parsed };
        }

        if (hasTools && isToolObject(parsed.tools[0])) {
          console.log("✅ Valid GenAgentX tool export detected");
          return { valid: true, type: 'tool', data: parsed };
        }
      }

      // If it's a single agent object, normalize to export shape
      if (isAgentObject(parsed)) {
        console.log("✅ Valid single-agent JSON detected");
        return { valid: true, type: 'agent', data: { version: "1.0", agentCount: 1, toolCount: 0, agents: [parsed], tools: [] } };
      }

      // If it's a single tool object, normalize to export shape
      if (isToolObject(parsed)) {
        console.log("✅ Valid single-tool JSON detected");
        return { valid: true, type: 'tool', data: { version: "1.0", agentCount: 0, toolCount: 1, agents: [], tools: [parsed] } };
      }

      console.log("❌ Parsed JSON does not match expected agent or tool format");
      return { valid: false };
    };

    // Try extracting from a ```json``` code block
    const jsonBlockMatch = content.match(/```json\s*([\s\S]*?)```/i);
    if (jsonBlockMatch && jsonBlockMatch[1]) {
      const parsed = tryParse(jsonBlockMatch[1].trim());
      if (parsed) return normalizeParsed(parsed);
    }

    // Try extracting from any code block that contains an object
    const anyCodeBlockMatch = content.match(/```[\s\S]*?```/);
    if (anyCodeBlockMatch) {
      const inner = anyCodeBlockMatch[0].replace(/^```/, "").replace(/```$/, "").trim();
      if (inner.startsWith("{") || inner.startsWith("[")) {
        const parsed = tryParse(inner);
        if (parsed) return normalizeParsed(parsed);
      }
    }

    // Fallback: find the first {...} or [...] JSON-like substring
    const braceMatch = content.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (braceMatch) {
      const parsed = tryParse(braceMatch[0]);
      if (parsed) return normalizeParsed(parsed);
    }

    console.log("❌ No valid JSON agent config detected");
    return { valid: false };
  };

  // Handle importing agent from chatbot response
  const handleImportFromChat = (agentData) => {
    if (onImportAgent && agentData.agents && agentData.agents.length > 0) {
      const agent = agentData.agents[0];
      // Remove export metadata
      delete agent.exportedAt;
      delete agent.createdAt;
      delete agent.updatedAt;

      onImportAgent(agent);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `✅ **Agent "${agent.name}" has been imported!**

You can now find it in your agents list. Click **Run** to test it or **Edit** to customize it further.`,
        },
      ]);
    }
  };

  // Handle importing tool from chatbot response
  const handleImportToolFromChat = (toolData) => {
    if (onImportTool && toolData.tools && toolData.tools.length > 0) {
      const tool = toolData.tools[0];
      // Remove export metadata
      delete tool.exportedAt;
      delete tool.createdAt;
      delete tool.updatedAt;
      delete tool.originalId;

      onImportTool(tool);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `✅ **Tool "${tool.name}" has been imported!**

You can now find it in your tools list and use it with your agents.`,
        },
      ]);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");

    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    setIsLoading(true);

    try {
      const response = await onSendMessage(userMessage);
      const detection = detectAgentJSON(response);

      console.log("📝 Response received:", response.substring(0, 100));
      console.log("🔍 JSON detection result:", detection);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response,
          hasJSON: detection.valid,
          jsonType: detection.type,
          jsonData: detection.data,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ **Error:** ${error.message}\n\nPlease try again or rephrase your request.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: `Chat cleared! 🗑️

How can I help you build an agent today?`,
      },
    ]);
  };

  // Helper to copy message content
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const formatJsonIfPossible = (text) => {
    const raw = (text || "").trim();
    if (!raw) return text;
    try {
      const parsed = JSON.parse(raw);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return text;
    }
  };

  const getAgentSummary = (agentData, type) => {
    if (type === 'tool') {
      const tool = agentData?.tools?.[0];
      if (!tool) return null;
      return {
        name: tool.name || "Untitled Tool",
        description: tool.description || "",
      };
    }
    
    const agent = agentData?.agents?.[0];
    if (!agent) return null;

    const description =
      agent.goal ||
      agent.taskDescription ||
      agent.role ||
      agent.expectedOutput ||
      "";

    return {
      name: agent.name || "Untitled Agent",
      description,
    };
  };

  return (
    <>
      <button
        className={`chatbot-toggle ${isOpen ? "open" : ""}`}
        onClick={onToggle}
        aria-label="GenAgentX Assistant"
      >
        <TbMessageChatbot size={24} aria-hidden="true" focusable="false" />
      </button>

      <div className={`chatbot-sidebar ${isOpen ? "open" : ""}`}>
        <div className="chatbot-header">
          <div className="chatbot-header-content">
            <div className="chatbot-avatar">
              <BsRobot size={26} aria-hidden="true" focusable="false" />
            </div>
            <div className="chatbot-title">
              <h3>{agentName}</h3>
              <span className="chatbot-status">
                <span className="status-dot"></span>
                Online
              </span>
            </div>
          </div>
          <div className="chatbot-actions">
            <button
              className="chatbot-action-btn"
              onClick={handleClearChat}
              title="Clear chat"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>

        <div className="chatbot-messages">
          {messages.map((message, index) => (
            <div key={index} className={`chat-message ${message.role}`}>
              {message.role === "assistant" && (
                <div className="message-avatar">
                  <BsRobot size={18} aria-hidden="true" focusable="false" />
                </div>
              )}
              <div className="message-content">
                <div className="message-bubble">
                  {message.role === "assistant" && message.hasJSON && message.jsonData ? (
                    (() => {
                      const summary = getAgentSummary(message.jsonData, message.jsonType);
                      return (
                        <div className="agent-json-summary">
                          <div className="agent-json-name">{summary?.name}</div>
                          {summary?.description ? (
                            <div className="agent-json-desc">{summary.description}</div>
                          ) : null}
                        </div>
                      );
                    })()
                  ) : message.role === "assistant" ? (
                    <ReactMarkdown
                      components={{
                        h1: ({ node, ...props }) => (
                          <h1 className="md-h1" {...props} />
                        ),
                        h2: ({ node, ...props }) => (
                          <h2 className="md-h2" {...props} />
                        ),
                        h3: ({ node, ...props }) => (
                          <h3 className="md-h3" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul className="md-ul" {...props} />
                        ),
                        ol: ({ node, ...props }) => (
                          <ol className="md-ol" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                          <li className="md-li" {...props} />
                        ),
                        code: ({ node, inline, className, children, ...props }) => {
                          if (inline) {
                            return (
                              <code className="md-code-inline" {...props}>
                                {children}
                              </code>
                            );
                          }

                          const language = (className || "").replace("language-", "").toLowerCase();
                          const raw = String(children || "").replace(/\n$/, "");
                          const pretty = language === "json" ? formatJsonIfPossible(raw) : raw;

                          return (
                            <pre className="md-code-block">
                              <code {...props}>{pretty}</code>
                            </pre>
                          );
                        },
                        p: ({ node, ...props }) => (
                          <p className="md-p" {...props} />
                        ),
                        strong: ({ node, ...props }) => (
                          <strong className="md-strong" {...props} />
                        ),
                        a: ({ node, ...props }) => (
                          <a
                            className="md-link"
                            target="_blank"
                            rel="noopener noreferrer"
                            {...props}
                          />
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  ) : (
                    <span>{message.content}</span>
                  )}

                  {message.role === "assistant" && !message.hasJSON && (
                    <button
                      className="copy-message-btn"
                      onClick={() => copyToClipboard(message.content)}
                      title="Copy message"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </button>
                  )}
                </div>

                {/* Import Button - Shows for Agent or Tool */}
                {message.role === "assistant" &&
                  message.hasJSON &&
                  message.jsonData && (
                    <button
                      className="import-agent-btn"
                      onClick={() => {
                        if (message.jsonType === 'tool') {
                          handleImportToolFromChat(message.jsonData);
                        } else {
                          handleImportFromChat(message.jsonData);
                        }
                      }}
                      title={message.jsonType === 'tool' ? 'Import this tool' : 'Import this agent'}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                      {message.jsonType === 'tool' ? 'Import Tool' : 'Import Agent'}
                    </button>
                  )}

              </div>
              {message.role === "user" && (
                <div className="message-avatar user">
                  <FaUserCircle size={18} aria-hidden="true" focusable="false" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="chat-message assistant">
              <div className="message-avatar">
                <BsRobot size={18} aria-hidden="true" focusable="false" />
              </div>
              <div className="message-content">
                <div className="message-bubble typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="chatbot-input-container">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe the agent you want to build..."
            rows="1"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="chatbot-send-btn"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>

      </div>

      {isOpen && <div className="chatbot-overlay" onClick={onToggle}></div>}
    </>
  );
};

export default ChatBot;
