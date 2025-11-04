import React from 'react';
import { Agent, User } from '../types';
import { DataAnalysisIcon, PresentationIcon, UserIcon, LogoutIcon, DashboardIcon, ChevronLeftIcon, ChevronRightIcon, DatabaseIcon } from './icons';

interface SidebarProps {
  activeAgent: Agent;
  onAgentChange: (agent: Agent) => void;
  user: User | null;
  onLogout: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isProjectView: boolean;
}

const agents = [
  { id: Agent.DATA_ANALYSIS, icon: DataAnalysisIcon, name: 'Data Analysis' },
  { id: Agent.DASHBOARD, icon: DashboardIcon, name: 'Dashboard' },
  { id: Agent.PRESENTATION, icon: PresentationIcon, name: 'Presentation' },
  { id: Agent.DATA_CONNECTIONS, icon: DatabaseIcon, name: 'Data Connections' },
];

const Sidebar: React.FC<SidebarProps> = ({ activeAgent, onAgentChange, user, onLogout, isCollapsed, onToggleCollapse, isProjectView }) => {
  return (
    <aside className={`relative bg-gray-50 dark:bg-gray-800/50 flex flex-col border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20 items-center p-2' : 'w-64 p-4'}`}>
      
      <button
        onClick={onToggleCollapse}
        className="absolute top-1/2 -translate-y-1/2 -right-3 h-6 w-6 bg-white dark:bg-gray-700 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-600 z-10"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronLeftIcon className="w-4 h-4" />}
      </button>

      <div className={`mb-8 ${isCollapsed ? 'h-7 flex items-center justify-center' : ''}`}>
         <div className={`flex items-center gap-2 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-lg">A</div>
            {!isCollapsed && <h1 className="text-xl font-bold text-gray-800 dark:text-white">Agentic</h1>}
        </div>
      </div>

      {!isProjectView && (
        <nav className="flex-1 flex flex-col space-y-2 w-full">
          {agents.map(({ id, icon: Icon, name }) => (
            <button
              key={id}
              title={isCollapsed ? name : undefined}
              onClick={() => onAgentChange(id)}
              className={`flex items-center space-x-3 rounded-lg text-left text-sm font-medium transition-colors ${isCollapsed ? 'p-3 justify-center' : 'p-2'} ${
                activeAgent === id
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                  : 'text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span>{name}</span>}
            </button>
          ))}
        </nav>
      )}
      
      {isProjectView && <div className="flex-1"></div>}

      <div className="pt-4 border-t border-gray-200 dark:border-gray-700 w-full">
        {user && (
          <div title={isCollapsed ? user.email : undefined} className={`flex items-center space-x-2 mb-3 rounded-lg ${isCollapsed ? 'justify-center' : 'p-2 bg-gray-100 dark:bg-gray-700/50'}`}>
             <UserIcon className="w-8 h-8 p-1.5 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 flex-shrink-0"/>
             {!isCollapsed && <span className="text-sm font-medium truncate text-gray-700 dark:text-gray-200">{user.email}</span>}
          </div>
        )}
        <button 
            onClick={onLogout} 
            title={isCollapsed ? "Logout" : undefined}
            className={`w-full flex items-center space-x-3 p-2 rounded-lg text-left text-sm font-medium text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors ${isCollapsed ? 'justify-center' : ''}`}
        >
          <LogoutIcon className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;