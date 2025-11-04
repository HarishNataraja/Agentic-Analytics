import React, { useState, useEffect, FormEvent } from 'react';
import { DataConnection, DataSourceType } from '../../types';
import { DatabaseIcon, GoogleSheetsIcon, SalesforceIcon, ThinkingIcon, CsvIcon, ExcelIcon } from '../icons';
import { readFileContent } from '../../utils/fileUtils';

interface DataSourceConfig {
    type: DataSourceType;
    name: string;
    icon: React.FC<{ className?: string }>;
    fields: {
        name: string;
        label: string;
        type: 'text' | 'password' | 'number' | 'file';
        placeholder: string;
        required: boolean;
    }[];
}

const DATA_SOURCES: DataSourceConfig[] = [
    {
        type: 'POSTGRESQL',
        name: 'PostgreSQL',
        icon: DatabaseIcon,
        fields: [
            { name: 'name', label: 'Connection Name', type: 'text', placeholder: 'My Prod DB', required: true },
            { name: 'host', label: 'Host', type: 'text', placeholder: 'localhost', required: true },
            { name: 'port', label: 'Port', type: 'number', placeholder: '5432', required: true },
            { name: 'user', label: 'User', type: 'text', placeholder: 'postgres', required: true },
            { name: 'password', label: 'Password', type: 'password', placeholder: '••••••••', required: true },
            { name: 'database', label: 'Database', type: 'text', placeholder: 'mydatabase', required: true },
        ],
    },
    {
        type: 'MYSQL',
        name: 'MySQL',
        icon: DatabaseIcon,
        fields: [
            { name: 'name', label: 'Connection Name', type: 'text', placeholder: 'My Web DB', required: true },
            { name: 'host', label: 'Host', type: 'text', placeholder: 'localhost', required: true },
            { name: 'port', label: 'Port', type: 'number', placeholder: '3306', required: true },
            { name: 'user', label: 'User', type: 'text', placeholder: 'root', required: true },
            { name: 'password', label: 'Password', type: 'password', placeholder: '••••••••', required: true },
            { name: 'database', label: 'Database', type: 'text', placeholder: 'webapp', required: true },
        ],
    },
    {
        type: 'GOOGLE_SHEETS',
        name: 'Google Sheets',
        icon: GoogleSheetsIcon,
        fields: [
            { name: 'name', label: 'Connection Name', type: 'text', placeholder: 'Q3 Sales Report', required: true },
            { name: 'sheet_url', label: 'Sheet URL', type: 'text', placeholder: 'https://docs.google.com/spreadsheets/...', required: true },
        ],
    },
    {
        type: 'SALESFORCE',
        name: 'Salesforce',
        icon: SalesforceIcon,
        fields: [
            { name: 'name', label: 'Connection Name', type: 'text', placeholder: 'Salesforce Prod', required: true },
            { name: 'username', label: 'Username', type: 'text', placeholder: 'user@example.com', required: true },
            { name: 'password', label: 'Password', type: 'password', placeholder: '••••••••', required: true },
            { name: 'security_token', label: 'Security Token', type: 'password', placeholder: '••••••••••••••••', required: true },
        ],
    },
    {
        type: 'CSV',
        name: 'CSV',
        icon: CsvIcon,
        fields: [
            { name: 'name', label: 'Connection Name', type: 'text', placeholder: 'My Sales Data (CSV)', required: true },
            { name: 'file', label: 'CSV File', type: 'file', placeholder: '', required: true },
        ],
    },
    {
        type: 'EXCEL',
        name: 'Excel',
        icon: ExcelIcon,
        fields: [
            { name: 'name', label: 'Connection Name', type: 'text', placeholder: 'Q4 Financials (Excel)', required: true },
            { name: 'file', label: 'Excel File', type: 'file', placeholder: '', required: true },
        ],
    },
];


interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (connection: DataConnection, fileContent?: string, shouldAnalyze?: boolean) => Promise<void>;
  connectionToEdit: DataConnection | null;
}

const ConnectionModal: React.FC<ConnectionModalProps> = ({ isOpen, onClose, onSave, connectionToEdit }) => {
  const [step, setStep] = useState(1);
  const [selectedSource, setSelectedSource] = useState<DataSourceConfig | null>(null);
  const [formData, setFormData] = useState<{ [key: string]: string }>({});
  const [file, setFile] = useState<File | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [shouldGenerateDashboard, setShouldGenerateDashboard] = useState(true);

  useEffect(() => {
    if (isOpen) {
        if (connectionToEdit) {
            const sourceConfig = DATA_SOURCES.find(s => s.type === connectionToEdit.type);
            setSelectedSource(sourceConfig || null);
            setFormData({ name: connectionToEdit.name, ...connectionToEdit.credentials });
            setStep(2);
        } else {
            setStep(1);
            setSelectedSource(null);
            setFormData({});
            setShouldGenerateDashboard(true);
        }
        setFile(null);
        setIsConnecting(false);
        setError('');
    }
  }, [isOpen, connectionToEdit]);

  const handleSelectSource = (source: DataSourceConfig) => {
    setSelectedSource(source);
    const nameField = source.fields.find(field => field.name === 'name');
    const initialFormData = nameField ? { name: nameField.placeholder } : {};
    setFormData(initialFormData);
    setFile(null);
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setSelectedSource(null);
    setFormData({});
    setFile(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setFile(e.target.files[0]);
    }
  };


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedSource) return;
    
    setError('');
    setIsConnecting(true);
    
    try {
        const isFileSource = selectedSource.type === 'CSV' || selectedSource.type === 'EXCEL';
        const { name, ...credentials } = formData;
        
        if (!name) {
            throw new Error('Please provide a connection name.');
        }

        const newConnection: DataConnection = {
            id: connectionToEdit?.id || `conn-${Date.now()}`,
            name,
            type: selectedSource.type,
            credentials: {}, // will populate below
            status: 'connected',
            createdAt: connectionToEdit?.createdAt || new Date().toISOString(),
        };

        if (isFileSource) {
            if (!file && !connectionToEdit) {
                throw new Error('Please select a file to upload.');
            }
            newConnection.credentials = {
                fileName: file ? file.name : connectionToEdit!.credentials.fileName
            };

            let fileContent: string | undefined;
            if (file) {
                fileContent = await readFileContent(file);
            }
            
            const shouldAnalyze = !connectionToEdit && shouldGenerateDashboard;
            
            if (shouldAnalyze) {
                onClose(); // Close before analysis to show loading overlay
                await onSave(newConnection, fileContent, true);
            } else {
                await onSave(newConnection, fileContent, false);
                onClose(); // Close after saving
            }

        } else {
            // Database connections
            await new Promise(res => setTimeout(res, 1500)); // Mock connection test
            if (formData.password === 'fail') {
                throw new Error('Connection failed. Please check your credentials.');
            }
            newConnection.credentials = credentials;
            await onSave(newConnection);
            onClose();
        }

    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
        setIsConnecting(false);
    }
  };
  
  if (!isOpen) return null;
  
  const isFileSource = selectedSource?.type === 'CSV' || selectedSource?.type === 'EXCEL';

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            {step === 1 && (
                <div>
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-bold">Add New Data Connection</h2>
                        <p className="text-sm text-gray-500">Select a data source to connect to.</p>
                    </div>
                    <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                        {DATA_SOURCES.map(source => (
                            <button key={source.type} onClick={() => handleSelectSource(source)} className="p-4 flex flex-col items-center justify-center space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:shadow-md transition-all">
                                <source.icon className="w-10 h-10 text-gray-600 dark:text-gray-300" />
                                <span className="text-sm font-medium">{source.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
            {step === 2 && selectedSource && (
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center space-x-4">
                        <selectedSource.icon className="w-8 h-8 text-gray-600 dark:text-gray-300" />
                        <div>
                            <h2 className="text-xl font-bold">{connectionToEdit ? 'Edit' : 'Configure'} {selectedSource.name}</h2>
                            <p className="text-sm text-gray-500">Enter the connection details below.</p>
                        </div>
                    </div>
                    <div className="p-6 space-y-4">
                        {error && <div className="p-3 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-900/50 dark:text-red-300">{error}</div>}
                        {selectedSource.fields.map(field => (
                            <div key={field.name}>
                                <label htmlFor={field.name} className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">{field.label}</label>
                                {field.type === 'file' ? (
                                    <>
                                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                                            <div className="space-y-1 text-center">
                                                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                                <div className="flex text-sm text-gray-600 dark:text-gray-400">
                                                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-gray-700 rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 dark:focus-within:ring-offset-gray-800 focus-within:ring-blue-500">
                                                        <span>Upload a file</span>
                                                        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept={selectedSource.type === 'CSV' ? '.csv' : '.xlsx, .xls'} required={field.required && !connectionToEdit} />
                                                    </label>
                                                    <p className="pl-1">or drag and drop</p>
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                                    {selectedSource.type === 'CSV' ? 'CSV up to 10MB' : 'XLSX, XLS up to 10MB'}
                                                </p>
                                            </div>
                                        </div>
                                        {file && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Selected: {file.name}</p>}
                                        {!file && connectionToEdit && connectionToEdit.credentials.fileName && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Current file: {connectionToEdit.credentials.fileName}</p>
                                        )}
                                    </>
                                ) : (
                                    <input
                                        type={field.type}
                                        id={field.name}
                                        name={field.name}
                                        value={formData[field.name] || ''}
                                        onChange={handleChange}
                                        placeholder={field.placeholder}
                                        required={field.required}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                )}
                            </div>
                        ))}
                         {isFileSource && !connectionToEdit && (
                            <div className="flex items-center space-x-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="generate-dashboard-toggle"
                                    checked={shouldGenerateDashboard}
                                    onChange={(e) => setShouldGenerateDashboard(e.target.checked)}
                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                                />
                                <label htmlFor="generate-dashboard-toggle" className="text-sm text-gray-700 dark:text-gray-300">
                                    Automatically generate dashboard from this file.
                                </label>
                            </div>
                        )}
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
                        <button type="button" onClick={handleBack} disabled={!!connectionToEdit} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">
                            Back
                        </button>
                        <div className="flex items-center space-x-2">
                           <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-500">
                                Cancel
                            </button>
                           <button type="submit" disabled={isConnecting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800 flex items-center justify-center w-36">
                               {isConnecting ? <ThinkingIcon className="w-5 h-5 animate-spin" /> : (connectionToEdit ? 'Save Changes' : (isFileSource ? (shouldGenerateDashboard ? 'Save & Analyze' : 'Save Connection') : 'Test & Connect'))}
                            </button>
                        </div>
                    </div>
                </form>
            )}
        </div>
    </div>
  );
};

export default ConnectionModal;