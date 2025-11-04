import { TableAggregation } from '../types';

export const parseCsv = (csvString: string): any[] => {
    if (!csvString) return [];
    const rows = csvString.trim().split('\n');
    if (rows.length < 2) return [];

    // Handles potential commas inside quoted fields
    const splitCsvLine = (line: string) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    };

    const headers = splitCsvLine(rows[0]).map(h => h.replace(/"/g, ''));
    const data = [];

    for (let i = 1; i < rows.length; i++) {
        if (!rows[i]) continue;
        const values = splitCsvLine(rows[i]).map(v => v.replace(/"/g, ''));
        if (values.length !== headers.length) continue; // Skip malformed rows

        const obj: { [key: string]: any } = {};
        headers.forEach((header, index) => {
            const value = values[index];
            // Attempt to convert to number if possible, but only if it's not an empty string
            obj[header] = !isNaN(Number(value)) && value.trim() !== '' ? Number(value) : value;
        });
        data.push(obj);
    }
    return data;
};

export const performAggregation = (
    data: any[], 
    nameKey: string, // group by key
    dataKey: string, // value key
    type: 'sum' | 'average' | 'count'
): any[] => {
    if (!data || data.length === 0) return [];

    const groups = data.reduce((acc, row) => {
        const group = row[nameKey];
        if (group === undefined || group === null) return acc;

        const groupKey = String(group);
        if (!acc[groupKey]) {
            acc[groupKey] = {
                values: [],
                count: 0
            };
        }
        
        // Don't count the group if the value for aggregation is missing
        if (row[dataKey] !== undefined && row[dataKey] !== null) {
            acc[groupKey].values.push(row[dataKey]);
        }
        acc[groupKey].count++; // We count rows per group regardless of value, unless type is 'count' of a specific column.
        
        return acc;
    }, {} as { [key: string]: { values: any[], count: number } });

    return Object.entries(groups).map(([name, groupData]) => {
        let value;
        // Fix: Explicitly type groupData to resolve 'unknown' type from Object.entries.
        const typedGroupData = groupData as { values: any[]; count: number };
        const numericValues = typedGroupData.values.map(Number).filter(n => !isNaN(n));
        
        switch(type) {
            case 'count':
                // 'count' will count all rows in the group, which is what 'bar' chart would expect.
                value = typedGroupData.count;
                break;
            case 'sum':
                value = numericValues.reduce((sum, v) => sum + v, 0);
                break;
            case 'average':
                value = numericValues.length > 0 ? numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length : 0;
                break;
            default:
                value = 0;
        }
        
        return {
            [nameKey]: name,
            [dataKey]: value
        };
    });
};

export const performTableAggregation = (data: any[], aggregation: TableAggregation): (string | number)[][] => {
    if (!data || data.length === 0 || !aggregation) return [];
    
    const groups: { [key: string]: any[] } = data.reduce((acc, row) => {
        const groupKey = row[aggregation.groupBy];
        if (groupKey === undefined || groupKey === null) return acc;
        if (!acc[groupKey]) acc[groupKey] = [];
        acc[groupKey].push(row);
        return acc;
    }, {});

    const aggregatedRows = Object.entries(groups).map(([groupName, groupData]) => {
        const row: (string | number)[] = [groupName];
        aggregation.metrics.forEach(metric => {
            let value: string | number = 0;
            const values = groupData.map(r => r[metric.sourceColumn]).filter(v => v !== null && v !== undefined);
            
            switch(metric.operation) {
                case 'sum':
                    value = values.reduce((sum, v) => sum + (Number(v) || 0), 0);
                    break;
                case 'average':
                    const sum = values.reduce((s, v) => s + (Number(v) || 0), 0);
                    value = values.length > 0 ? sum / values.length : 0;
                    break;
                case 'count':
                    value = values.length;
                    break;
            }
            if (typeof value === 'number') {
                value = parseFloat(value.toFixed(2));
            }
            row.push(value);
        });
        return row;
    });

    return aggregatedRows;
};

export const toCsv = (data: any[]): string => {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const headerRow = headers.join(',');

    const rows = data.map(row => {
        return headers.map(header => {
            let value = row[header];
            if (value === null || value === undefined) {
                return '';
            }
            value = String(value);
            // Escape quotes and handle commas
            if (value.includes('"') || value.includes(',')) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(',');
    });

    return [headerRow, ...rows].join('\n');
};