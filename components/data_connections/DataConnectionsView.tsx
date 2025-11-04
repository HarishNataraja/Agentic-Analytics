import React, { useState } from 'react';
import { DataConnection, DataSourceType, Project } from '../../types';
import ConnectionModal from './ConnectionModal';
import { DatabaseIcon, GoogleSheetsIcon, SalesforceIcon, DrawIcon, TrashIcon, AddSlideIcon, CsvIcon, ExcelIcon, ProcessIcon } from '../icons';

interface DataConnectionsViewProps {
  projectConnections: DataConnection[];
  allProjects: Project[];
  onSaveConnection: (connection: DataConnection, fileContent?: string, shouldAnalyze?: boolean) => Promise<void>;
}

const SourceIcon: React.FC<{ type: DataSourceType, className?: string }> = ({ type, className }) => {
    switch (type) {
        case 'POSTGRESQL': case 'MYSQL': return <DatabaseIcon className={className} />;
        case 'GOOGLE_SHEETS': return <GoogleSheetsIcon className={className} />;
        case 'SALESFORCE': return <SalesforceIcon className={className} />;
        case 'CSV': return <CsvIcon className={className} />;
        case 'EXCEL': return <ExcelIcon className={className} />;
        default: return <DatabaseIcon className={className} />;
    }
};

const DataConnectionsView: React.FC<DataConnectionsViewProps> = ({ projectConnections, allProjects, onSaveConnection }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [connectionToEdit, setConnectionToEdit] = useState<DataConnection | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | 'all'>('current');

  const handleAddConnection = () => {
    setConnectionToEdit(null);
    setIsModalOpen(true);
  };
  
  const handleEditConnection = (connection: DataConnection) => {
    setConnectionToEdit(connection);
    setIsModalOpen(true);
  };
  
  const handleDeleteConnection = (connectionId: string) => {
    // This is tricky as it would require passing a setter for the entire projects array.
    // For now, we'll just log a message. A real implementation would use a global state manager (like Redux/Context).
    console.log("Delete functionality for project-based connections would require a global state manager.");
  };

  const ConnectionCard: React.FC<{connection: DataConnection, projectName?: string}> = ({ connection, projectName }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex flex-col">
        <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3">
                <SourceIcon type={connection.type} className="w-8 h-8 text-gray-500 dark:text-gray-400" />
                <div>
                    <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-100">{connection.name}</h3>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">{connection.type}</p>
                      {connection.transformations && connection.transformations.length > 0 && (
                        <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400" title={`${connection.transformations.length} transformation steps`}>
                          <ProcessIcon className="w-3.5 h-3.5" />
                          <span className="text-xs font-bold">{connection.transformations.length}</span>
                        </div>
                      )}
                    </div>
                </div>
            </div>
             <div className={`px-2 py-1 text-xs font-medium rounded-full ${ connection.status === 'connected' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' }`}>
                {connection.status}
            </div>
        </div>
        
        {projectName && (
            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2 truncate bg-blue-50 dark:bg-blue-900/30 p-1.5 rounded-md">
                Project: {projectName}
            </div>
        )}

        {(connection.type === 'CSV' || connection.type === 'EXCEL') && connection.credentials.fileName && (
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-md">
                File: <span className="font-medium text-gray-700 dark:text-gray-300">{connection.credentials.fileName}</span>
            </div>
        )}

        <div className="text-xs text-gray-400 dark:text-gray-500 mt-auto pt-3 border-t border-gray-100 dark:border-gray-700">
            Created: {new Date(connection.createdAt).toLocaleDateString()}
        </div>
        <div className="flex items-center justify-end space-x-2 mt-2">
             <button onClick={() => handleEditConnection(connection)} className="p-1.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                <DrawIcon className="w-4 h-4" />
            </button>
            <button onClick={() => handleDeleteConnection(connection.id)} className="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                <TrashIcon className="w-4 h-4" />
            </button>
        </div>
    </div>
  );

  const allConnections = allProjects.flatMap(p => p.dataConnections.map(c => ({ ...c, projectName: p.name })));

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Data Connections</h1>
            <div className="mt-2 border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                    <button onClick={() => setActiveTab('current')} className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'current' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Current Project
                    </button>
                    <button onClick={() => setActiveTab('all')} className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'all' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        All Connections
                    </button>
                </nav>
            </div>
        </div>
        {activeTab === 'current' && (
            <button onClick={handleAddConnection} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center space-x-2 self-center">
                <AddSlideIcon className="w-5 h-5" />
                <span>Add Connection</span>
            </button>
        )}
      </div>

      {activeTab === 'current' && (
        <>
          {projectConnections.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
              <div>
                <DatabaseIcon className="w-16 h-16 mx-auto text-gray-400" />
                <h2 className="mt-4 text-xl font-semibold text-gray-800 dark:text-white">No connections in this project</h2>
                <p className="mt-1 text-gray-500">Click "Add Connection" to get started.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {projectConnections.map(conn => <ConnectionCard key={conn.id} connection={conn} />)}
            </div>
          )}
        </>
      )}

      {activeTab === 'all' && (
         <>
          {allConnections.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                <DatabaseIcon className="w-16 h-16 mx-auto text-gray-400" />
                <h2 className="mt-4 text-xl font-semibold text-gray-800 dark:text-white">No data connections found</h2>
                <p className="mt-1 text-gray-500">Add a connection to a project to see it here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {allConnections.map(conn => <ConnectionCard key={`${conn.projectName}-${conn.id}`} connection={conn} projectName={conn.projectName} />)}
            </div>
          )}
        </>
      )}


      <ConnectionModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={onSaveConnection}
        connectionToEdit={connectionToEdit}
      />
    </div>
  );
};

export default DataConnectionsView;