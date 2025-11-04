import React, { useRef, useEffect } from 'react';
import { ChartData, DataConnection, Message } from '../types';
import ChartRenderer from './charts/ChartRenderer';
import { GeneralChatIcon, SaveIcon, ThinkingIcon, FileIcon, UserIcon } from './icons';

interface ChatWindowProps {
  messages: Message[];
  onSaveToDashboard?: (chartData: ChartData, title: string) => void;
  dataConnections?: DataConnection[];
  onSelectDataConnection?: (fileContent: string) => void;
  hasDataContext?: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, onSaveToDashboard, dataConnections, onSelectDataConnection, hasDataContext }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  if (messages.length === 0) {
     if (!hasDataContext && dataConnections && dataConnections.length > 0 && onSelectDataConnection) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">Start a New Analysis</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Select a data source to begin chatting with it, or upload a new file below.</p>
                <div className="max-w-md w-full space-y-3 border-t border-gray-200 dark:border-gray-700 pt-6">
                    {dataConnections.map(conn => (
                        <button 
                          key={conn.id} 
                          onClick={() => onSelectDataConnection(conn.fileContent!)} 
                          className="w-full p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left flex items-center space-x-4"
                        >
                            <FileIcon className="w-6 h-6 text-gray-500 flex-shrink-0" />
                            <div className="flex-1 truncate">
                                <p className="font-semibold text-base truncate">{conn.name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{conn.credentials.fileName}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        );
     }

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">Agentic Platform</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">Start by uploading data or asking a question.</p>
        </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="space-y-8">
        {messages.map((msg) => (
          <div key={msg.id} className="flex items-start gap-4">
             <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.sender === 'user' ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-200 dark:bg-gray-700'}`}>
                {msg.sender === 'user' 
                    ? <UserIcon className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                    : <GeneralChatIcon className="w-5 h-5 text-gray-500" />
                }
            </div>
            <div className="flex-1 space-y-2">
              <span className="font-semibold text-gray-800 dark:text-gray-200">{msg.sender === 'user' ? 'You' : 'Bot'}</span>
              <div className="text-gray-800 dark:text-gray-200 space-y-2">
                {msg.isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                  </div>
                ) : msg.isThinking ? (
                  <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                    <ThinkingIcon className="w-5 h-5 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                ) : null}

                {msg.fileInfo && (
                  <div className="p-2 bg-gray-100 dark:bg-gray-700/50 rounded-lg flex items-center gap-2 border border-gray-200 dark:border-gray-600 max-w-sm">
                      <FileIcon className="w-5 h-5 flex-shrink-0 text-gray-500" />
                      <span className="text-sm font-medium truncate">{msg.fileInfo.name}</span>
                  </div>
                )}
                
                {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                {msg.image && <img src={msg.image} alt="Generated content" className="mt-2 rounded-lg max-w-sm" />}
                {msg.video && <video src={msg.video} controls className="mt-2 rounded-lg max-w-sm" />}
                {msg.chart && (
                  <div>
                    <div className="w-full h-80 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 my-2">
                        <ChartRenderer chartData={msg.chart} />
                    </div>
                    {onSaveToDashboard && (
                      <button
                        onClick={() => onSaveToDashboard(msg.chart!, msg.text || 'Untitled Chart')}
                        className="mt-2 flex items-center gap-2 px-3 py-1 text-xs font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600"
                      >
                        <SaveIcon className="w-4 h-4" />
                        Save to Dashboard
                      </button>
                    )}
                  </div>
                )}
                {msg.transcript && (
                    <p className={`text-sm italic ${msg.transcript.type === 'input' ? 'text-gray-500 dark:text-gray-400' : 'text-blue-600 dark:text-blue-400'}`}>
                        {msg.transcript.type === 'input' ? 'You: ' : 'Bot: '}{msg.transcript.text}
                    </p>
                )}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-2">
                    <h4 className="text-xs font-semibold mb-1">Sources:</h4>
                    <ul className="text-xs space-y-1">
                      {msg.sources.map((source, index) => (
                        <li key={index}>
                          <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                            {source.title || source.uri}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatWindow;