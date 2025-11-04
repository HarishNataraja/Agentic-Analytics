import React, { useMemo } from 'react';
// Fix: Import the 'Responsive' component from 'react-grid-layout' for a responsive grid.
// Using the non-responsive default component with responsive props was causing render errors.
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { DashboardItem, KPIItem, TableItem, FilterItem, ChartItem, ChartData, Message, Agent } from '../../types';
import ChartRenderer from '../charts/ChartRenderer';
import { performAggregation, performTableAggregation } from '../../utils/dataUtils';
import { TrashIcon } from '../icons';
import ChatWindow from '../ChatWindow';
import MessageInput from '../MessageInput';

const ResponsiveGridLayout = WidthProvider(Responsive);

const KpiCard: React.FC<{ item: KPIItem }> = ({ item }) => (
  <div className="flex flex-col justify-between h-full">
    <h3 className="font-semibold text-gray-800 dark:text-gray-200 truncate">{item.title}</h3>
    <div>
      <p className="text-4xl font-bold text-gray-900 dark:text-white truncate">{item.value}</p>
      {item.change && (
        <p className={`text-sm font-medium ${item.changeType === 'positive' ? 'text-green-500' : 'text-red-500'}`}>
          {item.changeType === 'positive' ? '▲' : '▼'} {item.change}
        </p>
      )}
    </div>
  </div>
);

const TableCard: React.FC<{ item: TableItem }> = ({ item }) => (
  <div className="flex flex-col h-full">
    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4 truncate">{item.title}</h3>
    <div className="flex-1 overflow-auto">
      <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
          <tr>
            {item.headers.map((header, i) => <th key={i} scope="col" className="px-6 py-3 font-bold">{header}</th>)}
          </tr>
        </thead>
        <tbody>
          {(item.rows || []).map((row, i) => (
            <tr key={i} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
              {row.map((cell, j) => <td key={j} className={`px-6 py-4 ${j === 0 ? 'font-medium text-gray-900 dark:text-white whitespace-nowrap' : ''}`}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

interface FilterCardProps {
    item: FilterItem;
    value: string;
    onChange: (column: string, value: string) => void;
}

const FilterCard: React.FC<FilterCardProps> = ({ item, value, onChange }) => (
  <div>
    <label htmlFor={item.id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 truncate">{item.title}</label>
    {item.filterType === 'select' && item.options ? (
      <select 
        id={item.id} 
        value={value}
        onChange={(e) => onChange(item.column, e.target.value)}
        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500"
      >
        <option value="All">All</option>
        {item.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    ) : null }
  </div>
);

interface ChartCardProps {
  item: ChartItem;
  onChartTypeChange: (itemId: string, newType: ChartData['type']) => void;
}

const ChartCard: React.FC<ChartCardProps> = ({ item, onChartTypeChange }) => {
  const compatibleTypes: ChartData['type'][] = ['bar', 'line', 'pie'];
  const isInterchangeable = compatibleTypes.includes(item.data.type);

  return (
    <div className="flex flex-col h-full">
        <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 pr-2 truncate">{item.title}</h3>
            {isInterchangeable && (
            <select
                value={item.data.type}
                onChange={(e) => onChartTypeChange(item.id, e.target.value as ChartData['type'])}
                className="p-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 focus:ring-1 focus:ring-blue-500"
                onClick={(e) => e.stopPropagation()}
            >
                {compatibleTypes.map(type => (
                <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                ))}
            </select>
            )}
        </div>
        <div className="flex-1">
            <ChartRenderer chartData={item.data} />
        </div>
    </div>
  );
};


interface DashboardViewProps {
  items: DashboardItem[];
  dashboardData: any[] | null;
  activeFilters: { [column: string]: string };
  onFilterChange: (column: string, value: string) => void;
  onClearFilters: () => void;
  onChartTypeChange: (itemId: string, newType: ChartData['type']) => void;
  onLayoutChange: (layout: Layout[]) => void;
  onDeleteItem: (itemId: string) => void;
  messages: Message[];
  onSendMessage: (prompt: string, file?: File) => void;
  isThinkingMode: boolean;
  onThinkingChange: (isThinking: boolean) => void;
  isVoiceRecording: boolean;
  onVoiceRecordStart?: () => void;
  onVoiceRecordStop?: () => void;
  onSaveToDashboard: (chartData: ChartData, title: string) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ 
    items, 
    dashboardData, 
    activeFilters, 
    onFilterChange, 
    onClearFilters, 
    onChartTypeChange,
    onLayoutChange,
    onDeleteItem,
    messages,
    onSendMessage,
    isThinkingMode,
    onThinkingChange,
    isVoiceRecording,
    onVoiceRecordStart,
    onVoiceRecordStop,
    onSaveToDashboard,
}) => {
  
  const filterItems = useMemo(() => items.filter(item => item.type === 'filter') as FilterItem[], [items]);
  const gridItems = useMemo(() => items.filter(item => item.type !== 'filter'), [items]);

  const displayedGridItems = useMemo(() => {
    if (!dashboardData) return gridItems;

    let filteredData = dashboardData;
    const filters = Object.entries(activeFilters);
    if (filters.length > 0) {
        filteredData = dashboardData.filter(row => 
            filters.every(([column, value]) => 
                value === 'All' || !value || !row.hasOwnProperty(column) || String(row[column]) === value
            )
        );
    }
    
    return gridItems.map(item => {
        if (item.type === 'chart') {
            const chartDef = item.data;
            let finalChartData;
            if ('aggregation' in chartDef && chartDef.aggregation) {
                finalChartData = performAggregation(filteredData, chartDef.nameKey, chartDef.dataKey, chartDef.aggregation);
            } else if (chartDef.type === 'scatter') {
                finalChartData = filteredData.map(row => ({ x: row[chartDef.xKey], y: row[chartDef.yKey], ...(chartDef.zKey && { z: row[chartDef.zKey] }) }));
            } else {
                finalChartData = chartDef.data; 
            }
            return { ...item, data: { ...item.data, data: finalChartData } };
        }
        if (item.type === 'table') {
            const tableDef = item as TableItem;
            const newRows = tableDef.aggregation ? performTableAggregation(filteredData, tableDef.aggregation) : filteredData.map(dataRow => tableDef.headers.map(header => dataRow[header] ?? ''));
            return { ...item, rows: newRows };
        }
        return item;
    });
  }, [gridItems, dashboardData, activeFilters]);

  const renderItem = (item: DashboardItem) => {
    switch (item.type) {
      case 'kpi': return <KpiCard item={item} />;
      case 'table': return <TableCard item={item} />;
      case 'chart': return <ChartCard item={item as ChartItem} onChartTypeChange={onChartTypeChange}/>;
      default: return null;
    }
  };

  const hasActiveFilters = Object.values(activeFilters).some(v => v && v !== 'All');
  
  const layouts = { lg: gridItems.map(item => ({ i: item.id, ...item.layout })) };

  return (
     <div className="flex-1 flex overflow-hidden">
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-shrink-0 p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
            {hasActiveFilters && (
                <button onClick={onClearFilters} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">
                    Clear Filters
                </button>
            )}
          </div>
          {filterItems.length > 0 && (
            <div className="p-4 bg-gray-100 dark:bg-gray-800/50 rounded-lg">
                <h3 className="font-semibold mb-2 text-sm text-gray-600 dark:text-gray-300">Filters</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filterItems.map(item => (
                        <FilterCard key={item.id} item={item} value={activeFilters[item.column] || 'All'} onChange={onFilterChange} />
                    ))}
                </div>
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {gridItems.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-2">Your Dashboard is Empty</h2>
                <p className="text-gray-500">
                  Go to 'Data Connections' to add a file and automatically generate a dashboard, or go to 'Data Analysis' to create and save charts manually.
                </p>
              </div>
            </div>
          ) : (
            <ResponsiveGridLayout
              className="layout"
              layouts={layouts}
              onLayoutChange={(layout) => onLayoutChange(layout)}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
              rowHeight={80}
              draggableHandle=".drag-handle"
            >
              {displayedGridItems.map(item => (
                <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex flex-col group relative">
                   <div className="drag-handle absolute top-2 left-2 cursor-move opacity-0 group-hover:opacity-50 transition-opacity text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M7 2a1 1 0 1 1-2 0 1 1 0 0 1 2 0m3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0M7 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0m3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0m-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0m3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0m-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0m3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0"/>
                      </svg>
                   </div>
                   <button onClick={() => onDeleteItem(item.id)} className="absolute top-1 right-1 z-10 p-1 rounded-full text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <TrashIcon className="w-4 h-4" />
                   </button>
                   {renderItem(item)}
                </div>
              ))}
            </ResponsiveGridLayout>
          )}
        </div>
      </main>

      <aside className="w-96 border-l border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
         <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-lg">Dashboard Assistant</h2>
            <p className="text-sm text-gray-500">Ask questions about your dashboard data.</p>
        </div>
        <ChatWindow messages={messages} onSaveToDashboard={onSaveToDashboard} />
        <MessageInput 
            onSendMessage={onSendMessage}
            agent={Agent.DATA_ANALYSIS}
            isThinking={isThinkingMode}
            onThinkingChange={onThinkingChange}
            isVoiceRecording={isVoiceRecording}
            onVoiceRecordStart={onVoiceRecordStart}
            onVoiceRecordStop={onVoiceRecordStop}
            aspectRatio={"16:9"}
            onAspectRatioChange={() => {}}
        />
      </aside>
    </div>
  );
};

export default DashboardView;