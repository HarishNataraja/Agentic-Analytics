import React from 'react';
// Fix: Import Agent enum to resolve 'Cannot find name 'Agent''.
import { Presentation, DashboardItem, Message, Agent } from '../../types';
import PresentationEditor from './PresentationEditor';
import ChatWindow from '../ChatWindow';
import MessageInput from '../MessageInput';

interface PresentationWorkspaceProps {
  presentation: Presentation;
  dashboardItems: DashboardItem[];
  onPresentationChange: (presentation: Presentation) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onPresent: () => void;
  messages: Message[];
  onSendMessage: (prompt: string) => void;
}

const PresentationWorkspace: React.FC<PresentationWorkspaceProps> = (props) => {
  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 flex flex-col">
        <PresentationEditor
          initialPresentation={props.presentation}
          dashboardItems={props.dashboardItems}
          onPresentationChange={props.onPresentationChange}
          onUndo={props.onUndo}
          onRedo={props.onRedo}
          canUndo={props.canUndo}
          canRedo={props.canRedo}
          onPresent={props.onPresent}
        />
      </div>
      <aside className="w-80 border-l border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-800/50">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-lg">Presentation Assistant</h2>
            <p className="text-sm text-gray-500">Ask the AI to make changes.</p>
        </div>
        <ChatWindow messages={props.messages} />
        <MessageInput
          onSendMessage={(prompt) => props.onSendMessage(prompt)}
          agent={Agent.PRESENTATION}
          isThinking={false}
          onThinkingChange={() => {}}
          isVoiceRecording={false}
          aspectRatio="16:9"
          onAspectRatioChange={() => {}}
        />
      </aside>
    </div>
  );
};

export default PresentationWorkspace;