import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, ResponsiveContainer, ReferenceLine, ComposedChart } from 'recharts';import { Filter } from 'lucide-react';
import Papa from 'papaparse';

const Dashboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    selectedReps: [],
    selectedMetrics: [],
    selectedMonths: [],
    selectedQuarters: []
  });
  
  const [viewMode, setViewMode] = useState('individual');
  const [showTeamAverage, setShowTeamAverage] = useState(false);
  const [teamFilter, setTeamFilter] = useState('all'); // 'all', 'buyside', 'sellside'

  // Team definitions
  const buysideTeam = ['Arturo Alvarado', 'Brandon Monroe', 'Courtney Close', 'Isabella Diaz', 'Kyle Schaefer', 'Mark Romeo'];
  const sellsideTeam = ['Gabby Steele', "Jack O'Connell", 'Josh Huntsman', 'Louise Ryan', 'Marlon Sabo', 'Tabatha Silva'];

  // Load CSV data on component mount
  useEffect(() => {
    const loadCSV = async () => {
      try {
        const response = await fetch('/Gong_MoM_Jan_to_May_2025_Clean.csv');
        const csvText = await response.text();
        
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            // Clean and filter data, remove Total Calls (Interaction)
            const cleanData = results.data
              .filter(row => row['User Name'] && row['Month'] && row['Metric'])
              .filter(row => row['Metric'] !== 'Total Calls (Interaction)') // Remove this metric
              .map(row => ({
                ...row,
                'Value': row['Value'] === null || row['Value'] === '' ? null : Number(row['Value']),
                // Update metric names
                'Metric': row['Metric']
                  ?.replace('Longest Monologue (min)', 'Longest Monologue (sec)')
                  ?.replace('Longest Interview (min)', 'Longest Interview (sec)')
                  ?.replace('Total Call Time (min)', 'Total Call Time (Avg min)')
                  ?.replace('Avg Call Duration (min)', 'Avg Call Duration (Avg min)')
                  ?.replace('Call Time per Week (min)', 'Call Time per Week (Avg min)')
              }))
              .filter(row => row['Value'] !== null && !isNaN(row['Value']));
            
            setData(cleanData);
            setLoading(false);
            console.log(`Loaded ${cleanData.length} records from CSV`);
          },
          error: (error) => {
            console.error('Error parsing CSV:', error);
            setLoading(false);
          }
        });
      } catch (error) {
        console.error('Error loading CSV:', error);
        setLoading(false);
      }
    };

    loadCSV();
  }, []);

  // Get unique values for filters
  const uniqueReps = useMemo(() => [...new Set(data.map(item => item["User Name"]))].sort(), [data]);
  const uniqueMetrics = useMemo(() => [...new Set(data.map(item => item.Metric))].sort(), [data]);
  const uniqueMonths = useMemo(() => [...new Set(data.map(item => item.Month))].sort(), [data]);
  const uniqueQuarters = useMemo(() => {
    const quarters = data.map(item => {
      const month = item.Month;
      if (month?.includes('2025-01') || month?.includes('2025-02') || month?.includes('2025-03')) return 'Q1 2025';
      if (month?.includes('2025-04') || month?.includes('2025-05') || month?.includes('2025-06')) return 'Q2 2025';
      return null;
    }).filter(Boolean);
    return [...new Set(quarters)].sort();
  }, [data]);

  // Activity and Interaction metrics
  const activityMetrics = [
    'Total Calls',
    'Calls per Week', 
    'Total Call Time (Avg min)',
    'Avg Call Duration (Avg min)',
    'Call Time per Week (Avg min)'
  ];

  const interactionMetrics = [
    'Avg Talk %',
    'Longest Monologue (sec)',
    'Longest Interview (sec)',
    'Interactivity Score',
    'Patience (sec)',
    'Questions/hr'
  ];

  // Filter data based on selections (for individual rep display)
  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (filters.selectedReps.length > 0 && !filters.selectedReps.includes(item["User Name"])) return false;
      if (filters.selectedMetrics.length > 0 && !filters.selectedMetrics.includes(item.Metric)) return false;
      if (filters.selectedMonths.length > 0 && !filters.selectedMonths.includes(item.Month)) return false;
      
      // Quarter filtering
      if (filters.selectedQuarters.length > 0) {
        const itemQuarter = item.Month?.includes('2025-01') || item.Month?.includes('2025-02') || item.Month?.includes('2025-03') ? 'Q1 2025' :
                           item.Month?.includes('2025-04') || item.Month?.includes('2025-05') || item.Month?.includes('2025-06') ? 'Q2 2025' : null;
        if (!filters.selectedQuarters.includes(itemQuarter)) return false;
      }
      
      return item.Value !== null && item.Value !== undefined;
    });
  }, [data, filters]);

  // Calculate team averages from ALL data (not filtered by reps)
  const getTeamAverages = (metric) => {
    // Always use ALL data for team averages, only filter by metrics/months/quarters
    const teamData = data.filter(item => {
      if (item.Metric !== metric) return false;
      if (filters.selectedMetrics.length > 0 && !filters.selectedMetrics.includes(item.Metric)) return false;
      if (filters.selectedMonths.length > 0 && !filters.selectedMonths.includes(item.Month)) return false;
      
      // Quarter filtering
      if (filters.selectedQuarters.length > 0) {
        const itemQuarter = item.Month?.includes('2025-01') || item.Month?.includes('2025-02') || item.Month?.includes('2025-03') ? 'Q1 2025' :
                           item.Month?.includes('2025-04') || item.Month?.includes('2025-05') || item.Month?.includes('2025-06') ? 'Q2 2025' : null;
        if (!filters.selectedQuarters.includes(itemQuarter)) return false;
      }
      
      return item.Value !== null && item.Value !== undefined;
    });

    const monthlyAverages = {};
    
    teamData.forEach(item => {
      if (!monthlyAverages[item.Month]) {
        monthlyAverages[item.Month] = {
          buyside: [],
          sellside: [],
          all: []
        };
      }
      
      monthlyAverages[item.Month].all.push(item.Value);
      
      if (buysideTeam.includes(item["User Name"])) {
        monthlyAverages[item.Month].buyside.push(item.Value);
      }
      if (sellsideTeam.includes(item["User Name"])) {
        monthlyAverages[item.Month].sellside.push(item.Value);
      }
    });

    const result = {};
    Object.keys(monthlyAverages).forEach(month => {
      result[month] = {};
      
      const buysideValues = monthlyAverages[month].buyside;
      const sellsideValues = monthlyAverages[month].sellside;
      const allValues = monthlyAverages[month].all;
      
      if (buysideValues.length > 0) {
        result[month]['Buyside Team Avg'] = Math.round((buysideValues.reduce((sum, val) => sum + val, 0) / buysideValues.length) * 100) / 100;
      }
      
      if (sellsideValues.length > 0) {
        result[month]['Sellside Team Avg'] = Math.round((sellsideValues.reduce((sum, val) => sum + val, 0) / sellsideValues.length) * 100) / 100;
      }
      
      if (allValues.length > 0) {
        result[month]['Overall Team Avg'] = Math.round((allValues.reduce((sum, val) => sum + val, 0) / allValues.length) * 100) / 100;
      }
    });

    return result;
  };

  // Prepare chart data for individual metric
  const getChartDataForMetric = (metric) => {
    const metricData = filteredData.filter(item => item.Metric === metric);
    
    if (viewMode === 'individual') {
      const grouped = {};
      metricData.forEach(item => {
        const key = item.Month;
        if (!grouped[key]) {
          grouped[key] = { month: key };
        }
        grouped[key][item["User Name"]] = item.Value;
      });
      
      const result = Object.values(grouped);
      
      // Add team averages if toggled (calculated from ALL data)
      if (showTeamAverage) {
        const teamAverages = getTeamAverages(metric);
        
        result.forEach(monthData => {
          const month = monthData.month;
          if (teamAverages[month]) {
            if (teamFilter === 'all' || teamFilter === 'buyside') {
              monthData['Buyside Team Avg'] = teamAverages[month]['Buyside Team Avg'];
            }
            if (teamFilter === 'all' || teamFilter === 'sellside') {
              monthData['Sellside Team Avg'] = teamAverages[month]['Sellside Team Avg'];
            }
            if (teamFilter === 'all') {
              monthData['Overall Team Avg'] = teamAverages[month]['Overall Team Avg'];
            }
          }
        });
      }
      
      return result;
    } else {
      // Team average mode - show team averages as bars
      const teamAverages = getTeamAverages(metric);
      
      return Object.keys(teamAverages).map(month => ({
        month,
        'Team Average': teamAverages[month]['Overall Team Avg']
      }));
    }
  };

  // Get benchmark line value for specific metrics
  const getBenchmarkValue = (metric) => {
    switch (metric) {
      case 'Avg Talk %': return 65;
      case 'Longest Monologue (sec)': return 150; // 2:30 in seconds
      case 'Longest Interview (sec)': return 60; // 1 min in seconds  
      case 'Interactivity Score': return 5;
      case 'Patience (sec)': return 0.6;
      case 'Questions/hr': return 18;
      default: return null;
    }
  };

  // Format Y-axis values
  const formatYAxisValue = (value, metric) => {
    if (metric === 'Avg Talk %') return `${value}%`;
    if (metric.includes('(sec)')) return `${value}s`;
    return value;
  };

  // Get colors for team lines
  const getTeamLineColor = (key) => {
    if (key.includes('Buyside')) return '#10B981';
    if (key.includes('Sellside')) return '#F59E0B';  
    if (key.includes('Overall')) return '#8B5CF6';
    return '#6B7280';
  };

  const handleFilterChange = (filterType, value, checked) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: checked 
        ? [...prev[filterType], value]
        : prev[filterType].filter(item => item !== value)
    }));
  };

  const clearFilters = () => {
    setFilters({
      selectedReps: [],
      selectedMetrics: [],
      selectedMonths: [],
      selectedQuarters: []
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your Gong data...</p>
        </div>
      </div>
    );
  }

  const renderMetricChart = (metric) => {
    const chartData = getChartDataForMetric(metric);
    const benchmarkValue = getBenchmarkValue(metric);
    
    if (chartData.length === 0) return null;

    // Get all data keys except 'month'
    const dataKeys = Object.keys(chartData[0]).filter(key => key !== 'month');
    const repKeys = dataKeys.filter(key => !key.includes('Team') && !key.includes('Avg'));
    const teamKeys = dataKeys.filter(key => key.includes('Team') || key.includes('Avg'));

    if (viewMode === 'team') {
      // Team mode - show as bar chart
      return (
        <div key={metric} className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{metric}</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => formatYAxisValue(value, metric)} />
              <Tooltip 
                formatter={(value, name) => [
                  formatYAxisValue(value, metric),
                  name
                ]}
              />
              <Legend />
              
              {/* Benchmark line */}
              {benchmarkValue && (
                <ReferenceLine 
                  y={benchmarkValue} 
                  stroke="#10B981" 
                  strokeDasharray="3 3" 
                  strokeOpacity={0.6}
                  strokeWidth={2}
                />
              )}
              
              <Bar dataKey="Team Average" fill="#8B5CF6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    } else {
      // Individual mode - bars for reps + lines for team averages
      return (
        <div key={metric} className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{metric}</h3>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => formatYAxisValue(value, metric)} />
              <Tooltip 
                formatter={(value, name) => [
                  formatYAxisValue(value, metric),
                  name
                ]}
              />
              <Legend />
              
              {/* Benchmark line */}
              {benchmarkValue && (
                <ReferenceLine 
                  y={benchmarkValue} 
                  stroke="#10B981" 
                  strokeDasharray="3 3" 
                  strokeOpacity={0.6}
                  strokeWidth={2}
                />
              )}
              
              {/* Individual rep bars */}
              {repKeys.map((rep, index) => (
                <Bar
                  key={rep}
                  dataKey={rep}
                  fill={`hsl(${(index * 360) / repKeys.length}, 70%, 50%)`}
                />
              ))}
              
              {/* Team average lines */}
              {teamKeys.map(teamKey => (
                <Line
                  key={teamKey}
                  type="monotone"
                  dataKey={teamKey}
                  stroke={getTeamLineColor(teamKey)}
                  strokeWidth={4}
                  strokeDasharray="8 4"
                  dot={{ fill: getTeamLineColor(teamKey), strokeWidth: 2, r: 6 }}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gong Sales Dashboard</h1>
              <p className="text-gray-600 mt-1">Track sales rep performance and call metrics</p>
              <p className="text-sm text-gray-500 mt-1">Loaded {data.length} records</p>
            </div>
          </div>
        </div>

        {/* View Mode Selector */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">View Mode</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('individual')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'individual'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Individual Reps
              </button>
              <button
                onClick={() => setViewMode('team')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'team'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Team Average
              </button>
            </div>
          </div>

          {/* Team Average Toggle */}
          {viewMode === 'individual' && (
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showTeamAverage}
                  onChange={(e) => setShowTeamAverage(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-lg font-medium text-gray-700">Show Team Averages</span>
              </label>
              
              {showTeamAverage && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Team Selection:</h3>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setTeamFilter('all')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        teamFilter === 'all'
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      All Teams
                    </button>
                    <button
                      onClick={() => setTeamFilter('buyside')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        teamFilter === 'buyside'
                          ? 'bg-green-600 text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      Buyside Team
                    </button>
                    <button
                      onClick={() => setTeamFilter('sellside')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        teamFilter === 'sellside'
                          ? 'bg-orange-600 text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      Sellside Team
                    </button>
                  </div>
                  
                  {/* Team member display */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="bg-green-50 p-3 rounded border-l-4 border-green-500">
                      <h4 className="font-semibold text-green-800 mb-1">Buyside Team:</h4>
                      <p className="text-green-700">{buysideTeam.join(', ')}</p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded border-l-4 border-orange-500">
                      <h4 className="font-semibold text-orange-800 mb-1">Sellside Team:</h4>
                      <p className="text-orange-700">{sellsideTeam.join(', ')}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            <button
              onClick={clearFilters}
              className="ml-auto text-sm text-blue-600 hover:text-blue-700"
            >
              Clear All
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Sales Reps Filter */}
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Sales Reps</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {uniqueReps.map(rep => (
                  <label key={rep} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.selectedReps.includes(rep)}
                      onChange={(e) => handleFilterChange('selectedReps', rep, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{rep}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Metrics Filter */}
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Metrics</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {uniqueMetrics.map(metric => (
                  <label key={metric} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.selectedMetrics.includes(metric)}
                      onChange={(e) => handleFilterChange('selectedMetrics', metric, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{metric}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Months Filter */}
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Months</h3>
              <div className="space-y-2">
                {uniqueMonths.map(month => (
                  <label key={month} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.selectedMonths.includes(month)}
                      onChange={(e) => handleFilterChange('selectedMonths', month, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{month}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Quarters Filter */}
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Quarters</h3>
              <div className="space-y-2">
                {uniqueQuarters.map(quarter => (
                  <label key={quarter} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.selectedQuarters.includes(quarter)}
                      onChange={(e) => handleFilterChange('selectedQuarters', quarter, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{quarter}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Activity Metrics Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Activity Metrics</h2>
          {activityMetrics
            .filter(metric => filters.selectedMetrics.length === 0 || filters.selectedMetrics.includes(metric))
            .map(metric => renderMetricChart(metric))}
        </div>

        {/* Interaction Metrics Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Interaction Metrics</h2>
          {interactionMetrics
            .filter(metric => filters.selectedMetrics.length === 0 || filters.selectedMetrics.includes(metric))
            .map(metric => renderMetricChart(metric))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
