
import React from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ScatterChart, Scatter, ZAxis, ComposedChart, ErrorBar, TooltipProps,
} from 'recharts';
import { ChartData, ScatterChartData, HeatmapChartData, BoxPlotChartData } from '../../types';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

interface ChartRendererProps {
  chartData: ChartData;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// Custom Tooltip for Heatmap
// Fix: Correctly type custom tooltip props. The `TooltipProps` from recharts can be missing `payload` for custom content.
const CustomHeatmapTooltip = ({ active, payload, xLabels, yLabels }: TooltipProps<ValueType, NameType> & { payload?: any[], xLabels: string[], yLabels: string[] }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-700 p-2 border border-gray-300 dark:border-gray-600 rounded shadow-lg text-sm text-gray-900 dark:text-gray-100">
        <p className="font-bold">{`${xLabels[data.x]} vs ${yLabels[data.y]}`}</p>
        <p className="label">{`Value: ${data.value}`}</p>
      </div>
    );
  }
  return null;
};

// Custom Tooltip for Scatter Plot
// Fix: Correctly type custom tooltip props. The `TooltipProps` from recharts can be missing `payload` for custom content.
const CustomScatterTooltip = ({ active, payload, xKey, yKey, zKey, xAxisLabel, yAxisLabel }: TooltipProps<ValueType, NameType> & { payload?: any[], xKey: string, yKey: string, zKey?: string, xAxisLabel: string, yAxisLabel: string }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-700 p-2 border border-gray-300 dark:border-gray-600 rounded shadow-lg text-sm text-gray-900 dark:text-gray-100">
        <p className="label">{`${xAxisLabel}: ${data[xKey]}`}</p>
        <p className="label">{`${yAxisLabel}: ${data[yKey]}`}</p>
        {zKey && <p className="label">{`Size: ${data[zKey]}`}</p>}
      </div>
    );
  }
  return null;
};


const ChartRenderer: React.FC<ChartRendererProps> = ({ chartData }) => {
  
  const renderChart = () => {
    switch (chartData.type) {
      case 'bar':
        return (
          <BarChart data={chartData.data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={chartData.nameKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey={chartData.dataKey} fill="#8884d8" />
          </BarChart>
        );
      case 'line':
        return (
          <LineChart data={chartData.data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={chartData.nameKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey={chartData.dataKey} stroke="#82ca9d" />
          </LineChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Pie data={chartData.data} dataKey={chartData.dataKey} nameKey={chartData.nameKey} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
              {chartData.data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        );
      case 'scatter':
        const scatterData = chartData as ScatterChartData;
        return (
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid />
                <XAxis type="number" dataKey={scatterData.xKey} name={scatterData.xAxisLabel} label={{ value: scatterData.xAxisLabel, position: 'insideBottom', offset: -10 }} />
                <YAxis type="number" dataKey={scatterData.yKey} name={scatterData.yAxisLabel} label={{ value: scatterData.yAxisLabel, angle: -90, position: 'insideLeft' }}/>
                {scatterData.zKey && <ZAxis dataKey={scatterData.zKey} range={[10, 400]} name="size" />}
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }} 
                  content={<CustomScatterTooltip {...scatterData} />}
                />
                <Legend />
                <Scatter name="Data points" data={scatterData.data} fill="#8884d8" />
            </ScatterChart>
        );
    case 'heatmap':
        const heatmap = chartData as HeatmapChartData;
        const processedHeatmapData = heatmap.data.map(d => ({
            x: heatmap.xLabels.indexOf(d.x),
            y: heatmap.yLabels.indexOf(d.y),
            value: d.value,
        }));
        const values = processedHeatmapData.map(d => d.value);
        const min = Math.min(...values);
        const max = Math.max(...values);
        // Simple blue-to-red color scale
        const getColor = (value: number) => {
            const ratio = (value - min) / (max - min);
            const blue = Math.round(255 * (1 - ratio));
            const red = Math.round(255 * ratio);
            return `rgb(${red}, 0, ${blue})`;
        };

        return (
            <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 40 }}>
                <CartesianGrid />
                <XAxis type="number" dataKey="x" name="X" ticks={heatmap.xLabels.map((_, i) => i)} tickFormatter={(tick) => heatmap.xLabels[tick]} interval={0} angle={-45} textAnchor="end" height={50} />
                <YAxis type="number" dataKey="y" name="Y" ticks={heatmap.yLabels.map((_, i) => i)} tickFormatter={(tick) => heatmap.yLabels[tick]} interval={0} />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  content={<CustomHeatmapTooltip xLabels={heatmap.xLabels} yLabels={heatmap.yLabels} />}
                />
                <Scatter data={processedHeatmapData} shape="square" isAnimationActive={false}>
                    {processedHeatmapData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getColor(entry.value)} />
                    ))}
                </Scatter>
            </ScatterChart>
        );
    case 'boxplot':
        const boxplot = chartData as BoxPlotChartData;
        const processedBoxPlotData = boxplot.data.map(d => ({
            name: d.name,
            iqr: [d.box[1], d.box[3]], // [q1, q3] for floating bar
            median: d.box[2], // median for scatter point
            // for error bars (whiskers)
            whiskerTop: d.box[4] - d.box[2], // max - median
            whiskerBottom: d.box[2] - d.box[0], // median - min
        }));
        return (
            <ComposedChart data={processedBoxPlotData}>
                <CartesianGrid />
                <XAxis dataKey="name" />
                <YAxis label={{ value: boxplot.yAxisLabel, angle: -90, position: 'insideLeft' }}/>
                <Tooltip />
                <Bar dataKey="iqr" fill="#8884d8" barSize={40} />
                <Scatter dataKey="median" fill="white">
                    <ErrorBar dataKey="whiskerTop" width={10} strokeWidth={2} stroke="black" direction="y" />
                    <ErrorBar dataKey="whiskerBottom" width={10} strokeWidth={2} stroke="black" direction="y" />
                </Scatter>
            </ComposedChart>
        );
      default:
        return <p>Unsupported chart type</p>;
    }
  };

  return (
    <div className="w-full h-80 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md my-2">
      <ResponsiveContainer>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};

export default ChartRenderer;