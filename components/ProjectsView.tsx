import React, { useState } from 'react';
import { Project } from '../types';
import { AddSlideIcon, DataAnalysisIcon, TrashIcon } from './icons';

interface ProjectsViewProps {
  projects: Project[];
  onSelectProject: (projectId: string) => void;
  onCreateProject: (name: string) => void;
  onDeleteProject: (projectId: string) => void;
}

const ProjectsView: React.FC<ProjectsViewProps> = ({ projects, onSelectProject, onCreateProject, onDeleteProject }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const handleCreate = () => {
    if (newProjectName.trim()) {
      onCreateProject(newProjectName.trim());
      setNewProjectName('');
      setIsCreating(false);
    }
  };

  return (
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Your Projects</h2>
          {!isCreating && (
             <button
                onClick={() => setIsCreating(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center space-x-2"
            >
                <AddSlideIcon className="w-5 h-5" />
                <span>New Project</span>
            </button>
          )}
        </div>

        {isCreating && (
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-6 flex items-center space-x-4">
                <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Enter new project name..."
                    className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                    autoFocus
                    onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
                />
                <button onClick={handleCreate} className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700">Create</button>
                <button onClick={() => setIsCreating(false)} className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
            </div>
        )}

        {projects.length === 0 && !isCreating ? (
           <div className="text-center py-16">
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">No projects found.</h3>
            <p className="text-gray-500">Click "New Project" to get started.</p>
           </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {projects.map(project => (
                    <div key={project.id} onClick={() => onSelectProject(project.id)} className="relative group bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all">
                        <DataAnalysisIcon className="w-8 h-8 text-blue-500 mb-3" />
                        <h3 className="font-bold text-lg truncate">{project.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Created: {new Date(project.createdAt).toLocaleDateString()}</p>
                         <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDeleteProject(project.id);
                            }}
                            className="absolute top-2 right-2 p-1.5 rounded-full text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete project"
                        >
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    </div>
                ))}
            </div>
        )}
      </div>
  );
};

export default ProjectsView;