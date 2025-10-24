import React, { useState, useRef } from 'react';
import { Agent, AspectRatio } from '../types';
import { SendIcon, UploadIcon, MicIcon, StopIcon, ThinkingIcon } from './icons';

interface MessageInputProps {
  onSendMessage: (prompt: string, file?: File) => void;
  agent: Agent;
  isThinking: boolean;
  onThinkingChange: (isThinking: boolean) => void;
  isVoiceRecording: boolean;
  onVoiceRecordStart?: () => void;
  onVoiceRecordStop?: () => void;
  // Kept for potential future use in presentation agent
  aspectRatio: AspectRatio;
  onAspectRatioChange: (aspectRatio: AspectRatio) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  agent,
  isThinking,
  onThinkingChange,
  isVoiceRecording,
  onVoiceRecordStart,
  onVoiceRecordStop,
}) => {
  const [input, setInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showFileUpload = agent === Agent.DATA_ANALYSIS;
  const showThinkingMode = agent === Agent.DATA_ANALYSIS;
  const canUseVoice = agent === Agent.DATA_ANALYSIS;

  const handleSend = () => {
    if (input.trim() || file) {
      onSendMessage(input, file || undefined);
      setInput('');
      setFile(null);
      if(fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isVoiceRecording && canUseVoice) {
    return (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-center items-center h-[76px]">
            <button 
              onClick={onVoiceRecordStop} 
              className="p-2 px-4 flex items-center gap-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
                <StopIcon className="w-6 h-6" />
                <span>Stop Voice Conversation</span>
            </button>
        </div>
    )
  }

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
      {file && (
        <div className="mb-2 text-sm text-gray-600 dark:text-gray-300">
          Attached: {file.name}
        </div>
      )}
      <div className="relative flex items-center">
        {showFileUpload && (
          <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400">
            <UploadIcon className="w-6 h-6" />
          </button>
        )}
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe your idea or ask about your data..."
            rows={1}
            className="flex-1 p-2 bg-transparent focus:outline-none resize-none dark:text-white"
          />

        <div className="flex items-center space-x-2">
          {showThinkingMode && (
            <button 
              onClick={() => onThinkingChange(!isThinking)}
              className={`flex items-center space-x-1 p-2 rounded-full text-sm ${isThinking ? 'bg-purple-200 text-purple-800 dark:bg-purple-800 dark:text-purple-200' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              <ThinkingIcon className="w-5 h-5"/>
            </button>
          )}

          {canUseVoice && onVoiceRecordStart && (
            <button onClick={onVoiceRecordStart} title="Start Voice Conversation" className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400">
                <MicIcon className="w-5 h-5" />
            </button>
          )}

          <button onClick={handleSend} className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:bg-gray-400" disabled={!input.trim() && !file}>
            <SendIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageInput;