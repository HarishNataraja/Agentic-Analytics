import React from 'react';
import { DashboardItem } from '../../types';
import ChartRenderer from '../charts/ChartRenderer';

interface DashboardViewProps {
  items: DashboardItem[];
}

const DashboardView: React.FC<DashboardViewProps> = ({ items }) => {
  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Your Dashboard is Empty</h2>
          <p className="text-gray-500">
            Go to the 'Data Analysis' agent, generate some charts, and save them to see them here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Dashboard</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
        {items.map((item) => (
          <div key={item.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">{item.title}</h3>
            {item.type === 'chart' && (
              <div className="h-64">
                <ChartRenderer chartData={item.data} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardView;
