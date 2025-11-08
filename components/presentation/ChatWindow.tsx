

import React, { useRef, useEffect } from 'react';
import { Message } from '../../types';
import { GeneralChatIcon, ThinkingIcon, UserIcon } from '../icons';

interface ChatWindowProps {
  messages: Message[];
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);
  
  const renderMessageContent = (msg: Message) => {
    if (msg.isLoading) {
      return (
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
      );
    }
    if (msg.isThinking) {
      return (
        <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
          <ThinkingIcon className="w-5 h-5 animate-spin" />
          <span>Thinking...</span>
        </div>
      );
    }
    if (msg.image) {
      return <img src={msg.image} alt="Generated content" className="mt-2 rounded-lg max-w-full" />;
    }
     if (msg.video) {
      return <video src={msg.video} controls className="mt-2 rounded-lg max-w-full" />;
    }
    return <p className="whitespace-pre-wrap">{msg.text}</p>;
  };

  return (
    <div className="">
      <div className="space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className="flex items-start gap-3">
             <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.sender === 'user' ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-200 dark:bg-gray-700'}`}>
                {msg.sender === 'user' 
                    ? <UserIcon className="w-4 h-4 text-blue-600 dark:text-blue-300" />
                    : <GeneralChatIcon className="w-4 h-4 text-gray-500" />
                }
            </div>
            <div className="flex-1 space-y-1">
              <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">{msg.sender === 'user' ? 'You' : 'Presentation AI'}</span>
              <div className="text-sm text-gray-700 dark:text-gray-200">
                {renderMessageContent(msg)}
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