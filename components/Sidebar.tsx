import React from 'react';
import { Agent, User } from '../types';
import { DataAnalysisIcon, PresentationIcon, UserIcon, LogoutIcon, DashboardIcon } from './icons';

interface SidebarProps {
  activeAgent: Agent;
  onAgentChange: (agent: Agent) => void;
  user: User | null;
  onLogout: () => void;
}

const agents = [
  { id: Agent.DATA_ANALYSIS, icon: DataAnalysisIcon },
  { id: Agent.DASHBOARD, icon: DashboardIcon },
  { id: Agent.PRESENTATION, icon: PresentationIcon },
];

const Sidebar: React.FC<SidebarProps> = ({ activeAgent, onAgentChange, user, onLogout }) => {
  return (
    <aside className="w-64 bg-gray-50 dark:bg-gray-800/50 p-4 flex flex-col border-r border-gray-200 dark:border-gray-700">
      <h1 className="text-xl font-bold text-gray-800 dark:text-white mb-8">Agentic Platform</h1>
      <nav className="flex flex-col space-y-2">
        {agents.map(({ id, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onAgentChange(id)}
            className={`flex items-center space-x-3 p-2 rounded-lg text-left text-sm font-medium transition-colors ${
              activeAgent === id
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                : 'text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span>{id}</span>
          </button>
        ))}
      </nav>
      <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
        {user && (
          <div className="flex items-center space-x-2 mb-3 p-2 rounded-lg bg-gray-100 dark:bg-gray-700/50">
             <UserIcon className="w-8 h-8 p-1.5 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 flex-shrink-0"/>
             <span className="text-sm font-medium truncate text-gray-700 dark:text-gray-200">{user.email}</span>
          </div>
        )}
        <button 
            onClick={onLogout} 
            className="w-full flex items-center space-x-3 p-2 rounded-lg text-left text-sm font-medium text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
        >
          <LogoutIcon className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;