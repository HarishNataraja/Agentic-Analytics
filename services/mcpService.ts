import { DashboardItem, KPIItem, ChartItem, FilterItem, TableItem, TableAggregation } from '../types';
import { parseCsv } from '../utils/dataUtils';

// Helper to determine column types
const getColumnTypes = (data: any[]): Record<string, 'numeric' | 'categorical'> => {
    if (data.length === 0) return {};
    const headers = Object.keys(data[0]);
    const types: Record<string, 'numeric' | 'categorical'> = {};

    headers.forEach(header => {
        // Check first 50 rows to infer type. Assume numeric if all are numbers or null/undefined/empty.
        const isNumeric = data.slice(0, 50).every(row => {
            const value = row[header];
            return value === null || value === undefined || String(value).trim() === '' || !isNaN(Number(value));
        });
        types[header] = isNumeric ? 'numeric' : 'categorical';
    });

    return types;
};

const getBestCategoricalColumn = (data: any[], categoricalCols: string[]): string | null => {
    let candidates: { col: string, cardinality: number }[] = [];

    for (const col of categoricalCols) {
        const cardinality = new Set(data.map(row => row[col])).size;
        if (cardinality > 1 && cardinality <= 50) { // Only consider columns with reasonable cardinality
            candidates.push({ col, cardinality });
        }
    }

    if (candidates.length === 0) return null;
    
    // Sort by cardinality, preferring smaller numbers of groups
    candidates.sort((a, b) => a.cardinality - b.cardinality);
    
    // Prefer columns with <= 20 unique values for ideal charts
    const idealCandidate = candidates.find(c => c.cardinality <= 20);
    return idealCandidate ? idealCandidate.col : candidates[0].col;
};


// Main function to generate dashboard
export const generateDashboardFromData = async (csvContent: string): Promise<DashboardItem[]> => {
    const data = parseCsv(csvContent);
    if (data.length === 0) {
        return [];
    }

    const types = getColumnTypes(data);
    const headers = Object.keys(data[0]);
    const numericCols = headers.filter(h => types[h] === 'numeric');
    const categoricalCols = headers.filter(h => types[h] === 'categorical');
    
    const items: DashboardItem[] = [];
    let x = 0;
    let y = 0;
    const gridWidth = 12;

    // Add KPIs for first 4 numeric columns
    numericCols.slice(0, 4).forEach(col => {
        const total = data.reduce((sum, row) => sum + (Number(row[col]) || 0), 0);
        const kpi: KPIItem = {
            id: `kpi-${col.replace(/\s/g, '-')}`,
            type: 'kpi',
            title: `Total ${col}`,
            value: total.toLocaleString(undefined, { maximumFractionDigits: 0 }),
            layout: { x, y, w: 3, h: 1 },
        };
        items.push(kpi);
        x += 3;
        if (x >= gridWidth) {
            x = 0;
            y += 1;
        }
    });

    // Reset y for next row if we added KPIs
    if (x > 0) {
      x = 0;
      y += 1;
    }
    
    // Add up to 2 bar charts
    const bestCategoricalCol = getBestCategoricalColumn(data, categoricalCols);
    if (bestCategoricalCol) {
        numericCols.slice(0, 2).forEach(numericCol => {
             if (x + 6 > gridWidth) {
                x = 0;
                y += 4;
            }
            const chart: ChartItem = {
                id: `chart-bar-${numericCol.replace(/\s/g, '-')}`,
                type: 'chart',
                title: `${numericCol} by ${bestCategoricalCol}`,
                data: {
                    type: 'bar',
                    dataKey: numericCol,
                    nameKey: bestCategoricalCol,
                    aggregation: 'sum',
                    data: [], // Populated by DashboardView
                },
                layout: { x, y, w: 6, h: 4 },
            };
            items.push(chart);
            x += 6;
        });
    }

    // Add a Scatter plot if possible
    if (numericCols.length >= 2) {
        if (x + 6 > gridWidth) {
            x = 0;
            y += 4;
        }
        const xCol = numericCols[0];
        const yCol = numericCols[1];
        const scatterChart: ChartItem = {
            id: 'chart-scatter-1',
            type: 'chart',
            title: `${yCol} vs ${xCol}`,
            data: {
                type: 'scatter',
                xKey: xCol,
                yKey: yCol,
                xAxisLabel: xCol,
                yAxisLabel: yCol,
                data: [], // Populated by DashboardView
            },
            layout: { x, y, w: 6, h: 4 },
        };
        items.push(scatterChart);
        x += 6;
    }
    
    // Advance y to the next available row after the charts
    if (items.some(i => i.type === 'chart')) {
        const lastChart = items.filter(i => i.type === 'chart').sort((a,b) => (a.layout.y + a.layout.h) - (b.layout.y + b.layout.h)).pop();
        if (lastChart) {
             y = lastChart.layout.y + lastChart.layout.h;
             x = 0;
        }
    }

    // Add a raw data table as a fallback/final item
    const table: TableItem = {
        id: 'table-raw-1',
        type: 'table',
        title: 'Full Dataset',
        headers: headers.slice(0, 10), // Limit columns for display
        rows: [], // Populated by DashboardView
        layout: { x: 0, y, w: 12, h: 6 },
    };
    items.push(table);
    

    return items;
};