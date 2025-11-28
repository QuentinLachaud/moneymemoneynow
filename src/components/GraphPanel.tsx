/**
 * GraphPanel — Wrapper component for charts with right-side tray
 *
 * FEATURES:
 * - Right-side tray with download and table toggle buttons
 * - Collapsible tray that shrinks graph when expanded
 * - Data table view mode
 * - CSV download functionality
 *
 * PROPS:
 * - title: Panel header text
 * - data: Array of data objects for the chart/table
 * - columns: Column definitions for table view
 * - children: The chart component to render
 */

import { useState, ReactNode } from 'react';
import { Download, Table, LineChart } from 'lucide-react';

interface Column {
  key: string;
  label: string;
  format?: (value: number | string) => string;
}

interface GraphPanelProps {
  title: string;
  data: Array<Record<string, number | string>>;
  columns: Column[];
  children: ReactNode;
  /** Additional controls to show in header (e.g., log/linear toggle) */
  headerControls?: ReactNode;
}

/**
 * Convert data to CSV and trigger download
 */
function downloadCSV(data: Array<Record<string, number | string>>, columns: Column[], filename: string) {
  const headers = columns.map(col => col.label).join(',');
  const rows = data.map(row => 
    columns.map(col => {
      const val = row[col.key];
      // Escape commas and quotes in values
      const strVal = String(val ?? '');
      return strVal.includes(',') || strVal.includes('"') 
        ? `"${strVal.replace(/"/g, '""')}"` 
        : strVal;
    }).join(',')
  ).join('\n');
  
  const csv = `${headers}\n${rows}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function GraphPanel({ title, data, columns, children, headerControls }: GraphPanelProps) {
  const [showTable, setShowTable] = useState(false);

  const filename = title.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`graph-panel-wrapper card ${showTable ? 'show-table' : ''}`}>
      {/* Main content area */}
      <div className={`graph-panel-main ${showTable ? 'with-table' : ''}`}>
        {/* Header */}
        <div className="graph-header">
          <h3>{title}</h3>
          <div className="graph-controls">
            {headerControls}
            {/* Data/Graph toggle button - prominent in header */}
            <button
              className={`data-toggle-btn ${showTable ? 'active' : ''}`}
              onClick={() => setShowTable(!showTable)}
              title={showTable ? 'Show graph' : 'Show data'}
            >
              {showTable ? (
                <>
                  <LineChart size={14} />
                  Graph
                </>
              ) : (
                <>
                  <Table size={14} />
                  Data
                </>
              )}
            </button>
          </div>
        </div>

        {/* Content: Chart or Table */}
        {showTable ? (
          <div className="data-table-container graph-data-table">
            <table className="data-table">
              <thead>
                <tr>
                  {columns.map(col => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx}>
                    {columns.map(col => (
                      <td key={col.key}>
                        {col.format 
                          ? col.format(row[col.key]) 
                          : row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="graph-container">
            {children}
          </div>
        )}
      </div>

      {/* Right-side tray - download only */}
      <div className="graph-tray collapsed">
        {/* Tray actions */}
        <div className="tray-actions">
          {/* Download button */}
          <button
            className="tray-button"
            onClick={() => downloadCSV(data, columns, filename)}
            title="Download data as CSV"
          >
            <Download size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
