'use client';

import React, { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Chat() {
  const [debugMode, setDebugMode] = useState(false);
  const [toolLogs, setToolLogs] = useState<Array<{ type: string; data: any; timestamp: Date }>>([]);

  const { messages, input, handleInputChange, handleSubmit, addToolResult, isLoading } = useChat({
    maxSteps: 5,

    // Use this hook to log and track tool calls
    onToolCall({ toolCall }) {
      // Log all tool calls to our debug state
      setToolLogs((prev) => [
        ...prev,
        {
          type: 'call',
          data: toolCall,
          timestamp: new Date(),
        },
      ]);

      console.log(`🛠️ Tool called: ${toolCall.toolName}`, toolCall);

      // Handle client-side tools
      if (toolCall.toolName === 'askForConfirmation') {
        // This is handled in the render part, no need to return anything
        return;
      }
    },
  });

  // Helper to format JSON for display
  const formatJSON = (obj: any) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      return 'Error formatting JSON';
    }
  };

  // Add tool result to logs when we get a response
  const handleToolResultWithLog = (toolCallId: string, result: any) => {
    setToolLogs((prev) => [
      ...prev,
      {
        type: 'result',
        data: { toolCallId, result },
        timestamp: new Date(),
      },
    ]);

    addToolResult({ toolCallId, result });
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Datasheets Chat</h1>
        <button onClick={() => setDebugMode(!debugMode)} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm">
          {debugMode ? 'Hide Debug' : 'Show Debug'}
        </button>
      </div>

      <div className="flex gap-4">
        {/* Main Chat Area */}
        <div className={`${debugMode ? 'w-1/2' : 'w-full'} bg-white rounded-lg shadow p-4`}>
          <div className="h-[60vh] overflow-y-auto mb-4 space-y-4">
            {messages?.map((message) => (
              <div key={message.id} className={`p-3 rounded-lg ${message.role === 'user' ? 'bg-blue-100 ml-8' : 'bg-gray-100 mr-8'}`}>
                <strong className="block mb-1">{message.role === 'user' ? 'You' : 'Assistant'}</strong>
                <div>
                  {message.parts.map((part, idx) => {
                    switch (part.type) {
                      case 'text':
                        return (
                          <div key={idx} className="prose prose-sm max-w-none">
                            {message.role === 'user' ? (
                              // User messages as plain text
                              <div className="whitespace-pre-wrap">{part.text}</div>
                            ) : (
                              // Assistant messages as markdown
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  // Custom styling for markdown elements
                                  h1: ({ children }) => <h1 className="text-xl font-bold mb-2 text-gray-800">{children}</h1>,
                                  h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 text-gray-800">{children}</h2>,
                                  h3: ({ children }) => <h3 className="text-md font-semibold mb-1 text-gray-800">{children}</h3>,
                                  p: ({ children }) => <p className="mb-2 text-gray-700 leading-relaxed">{children}</p>,
                                  ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                                  ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                                  li: ({ children }) => <li className="text-gray-700">{children}</li>,
                                  code: ({ children, className }) => {
                                    const isInline = !className;
                                    return isInline ? (
                                      <code className="bg-gray-200 px-1 py-0.5 rounded text-sm font-mono">{children}</code>
                                    ) : (
                                      <code className="block bg-gray-800 text-gray-100 p-3 rounded overflow-x-auto text-sm font-mono">
                                        {children}
                                      </code>
                                    );
                                  },
                                  pre: ({ children }) => <pre className="mb-2">{children}</pre>,
                                  table: ({ children }) => (
                                    <div className="overflow-x-auto mb-2">
                                      <table className="min-w-full border-collapse border border-gray-300">{children}</table>
                                    </div>
                                  ),
                                  thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
                                  tbody: ({ children }) => <tbody>{children}</tbody>,
                                  tr: ({ children }) => <tr className="border-b border-gray-200">{children}</tr>,
                                  th: ({ children }) => (
                                    <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-800">{children}</th>
                                  ),
                                  td: ({ children }) => <td className="border border-gray-300 px-3 py-2 text-gray-700">{children}</td>,
                                  blockquote: ({ children }) => (
                                    <blockquote className="border-l-4 border-blue-500 pl-4 my-2 italic text-gray-600">{children}</blockquote>
                                  ),
                                  strong: ({ children }) => <strong className="font-semibold text-gray-800">{children}</strong>,
                                  em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
                                  a: ({ children, href }) => (
                                    <a href={href} className="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">
                                      {children}
                                    </a>
                                  ),
                                }}
                              >
                                {part.text}
                              </ReactMarkdown>
                            )}
                          </div>
                        );

                      case 'tool-invocation': {
                        const callId = part.toolInvocation.toolCallId;
                        const toolName = part.toolInvocation.toolName;

                        // Common styling for tool UI
                        const toolContainer = 'my-2 p-2 border rounded';

                        // First, handle askForConfirmation tool
                        if (toolName === 'askForConfirmation') {
                          switch (part.toolInvocation.state) {
                            case 'call':
                              return (
                                <div key={callId} className={`${toolContainer} border-yellow-300 bg-yellow-50`}>
                                  <div className="mb-2">{part.toolInvocation.args.message}</div>
                                  <div className="flex gap-2">
                                    <button
                                      className="px-3 py-1 bg-green-500 text-white rounded"
                                      onClick={() => handleToolResultWithLog(callId, 'Yes, confirmed.')}
                                    >
                                      Yes
                                    </button>
                                    <button
                                      className="px-3 py-1 bg-red-500 text-white rounded"
                                      onClick={() => handleToolResultWithLog(callId, 'No, denied')}
                                    >
                                      No
                                    </button>
                                  </div>
                                </div>
                              );
                            case 'result':
                              return (
                                <div key={callId} className={`${toolContainer} border-green-300 bg-green-50`}>
                                  Confirmation result: {part.toolInvocation.result}
                                </div>
                              );
                          }
                          break;
                        }

                        // Now handle the search tools
                        switch (part.toolInvocation.state) {
                          case 'partial-call':
                            return (
                              <div key={callId} className={`${toolContainer} border-blue-300 bg-blue-50`}>
                                <div className="text-sm font-mono">
                                  <div className="font-bold">⚡ Running: {toolName}</div>
                                  <div className="truncate">Arguments: {formatJSON(part.toolInvocation.args)}</div>
                                </div>
                              </div>
                            );
                          case 'call':
                            return (
                              <div key={callId} className={`${toolContainer} border-blue-300 bg-blue-50`}>
                                <div className="font-bold">🔍 Search: {toolName}</div>
                                {toolName === 'searchAllDocuments' && <div>Searching for: "{part.toolInvocation.args.query}"</div>}
                                {toolName === 'searchByComponentType' && (
                                  <div>
                                    <div>Searching for: "{part.toolInvocation.args.query}"</div>
                                    <div>Component type: {part.toolInvocation.args.componentType}</div>
                                  </div>
                                )}
                                {toolName === 'searchByManufacturer' && (
                                  <div>
                                    <div>Searching for: "{part.toolInvocation.args.query}"</div>
                                    <div>Manufacturer: {part.toolInvocation.args.manufacturer}</div>
                                  </div>
                                )}
                                {toolName === 'searchBySpecifications' && (
                                  <div>
                                    <div>Searching for: "{part.toolInvocation.args.query}"</div>
                                    {part.toolInvocation.args.componentType && <div>Component type: {part.toolInvocation.args.componentType}</div>}
                                    {part.toolInvocation.args.specifications && (
                                      <div>With specifications: {JSON.stringify(part.toolInvocation.args.specifications)}</div>
                                    )}
                                  </div>
                                )}
                                {toolName === 'searchByPartNumber' && <div>Searching for part number: "{part.toolInvocation.args.partNumber}"</div>}
                              </div>
                            );
                          case 'result':
                            let resultContent;
                            try {
                              const result = part.toolInvocation.result;
                              const documentCount = result.documents?.length || 0;

                              resultContent = (
                                <>
                                  <div className="font-bold text-green-700">✅ Search complete: Found {documentCount} results</div>
                                  {result.error && <div className="text-red-500">Error: {result.message}</div>}
                                </>
                              );
                            } catch (e) {
                              resultContent = <div className="text-red-500">Error displaying result</div>;
                            }

                            return (
                              <div key={callId} className={`${toolContainer} border-green-300 bg-green-50`}>
                                {resultContent}
                              </div>
                            );
                        }
                        break;
                      }

                      default:
                        return null;
                    }
                  })}
                </div>
              </div>
            ))}

            {isLoading && !messages.length && <div className="text-center py-4 text-gray-500">Loading...</div>}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              value={input}
              onChange={handleInputChange}
              className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ask about components..."
              disabled={isLoading}
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
              disabled={isLoading || !input.trim()}
            >
              Send
            </button>
          </form>
        </div>

        {/* Debug Panel */}
        {debugMode && (
          <div className="w-1/2 bg-gray-900 text-gray-100 rounded-lg shadow p-4">
            <h2 className="text-lg font-bold mb-2">Debug Panel</h2>
            <div className="h-[60vh] overflow-y-auto font-mono text-sm">
              {toolLogs.length === 0 ? (
                <div className="text-gray-500 italic p-4">No tool calls yet</div>
              ) : (
                toolLogs.map((log, idx) => (
                  <div key={idx} className="mb-4 border-b border-gray-700 pb-2">
                    <div className="flex justify-between items-center mb-1">
                      <span
                        className={`font-bold ${log.type === 'call' ? 'text-yellow-400' : log.type === 'result' ? 'text-green-400' : 'text-red-400'}`}
                      >
                        {log.type === 'call' ? '🛠️ Tool Call' : log.type === 'result' ? '✅ Tool Result' : '❌ Error'}
                      </span>
                      <span className="text-xs text-gray-500">{log.timestamp.toLocaleTimeString()}</span>
                    </div>

                    {log.type === 'call' && (
                      <>
                        <div>
                          Tool: <span className="text-blue-300">{log.data.toolName}</span>
                        </div>
                        <div className="mt-1">Arguments:</div>
                        <pre className="bg-gray-800 p-2 rounded mt-1 overflow-x-auto">{formatJSON(log.data.args)}</pre>
                      </>
                    )}

                    {log.type === 'result' && (
                      <>
                        <div>
                          Tool: <span className="text-blue-300">{log.data.toolCallId}</span>
                        </div>
                        <div className="mt-1">Result:</div>
                        <pre className="bg-gray-800 p-2 rounded mt-1 overflow-x-auto">{formatJSON(log.data.result)}</pre>
                      </>
                    )}

                    {log.type === 'error' && (
                      <>
                        <div className="text-red-400">Error:</div>
                        <pre className="bg-gray-800 p-2 rounded mt-1 overflow-x-auto">{formatJSON(log.data)}</pre>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="mt-2 flex justify-end">
              <button onClick={() => setToolLogs([])} className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm">
                Clear Logs
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
