import React, { useRef, useEffect } from 'react';
import { ChartData, Message } from '../types';
import ChartRenderer from './charts/ChartRenderer';
import { GeneralChatIcon, SaveIcon, ThinkingIcon } from './icons';

interface ChatWindowProps {
  messages: Message[];
  onSaveToDashboard?: (chartData: ChartData, title: string) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, onSaveToDashboard }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {messages.map((msg) => (
        <div key={msg.id} className={`flex items-start gap-4 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
          {msg.sender === 'bot' && (
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
              <GeneralChatIcon className="w-5 h-5 text-gray-500" />
            </div>
          )}
          <div className={`max-w-xl p-4 rounded-xl ${
            msg.sender === 'user' 
              ? 'bg-blue-500 text-white' 
              : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-sm'
          }`}>
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
            {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
            {msg.image && <img src={msg.image} alt="Generated content" className="mt-2 rounded-lg max-w-sm" />}
            {msg.video && <video src={msg.video} controls className="mt-2 rounded-lg max-w-sm" />}
            {msg.chart && (
              <div>
                <ChartRenderer chartData={msg.chart} />
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
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatWindow;
