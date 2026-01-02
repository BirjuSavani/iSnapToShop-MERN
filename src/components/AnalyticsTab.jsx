import React from "react";
import PropTypes from "prop-types";
import { Line, Pie } from "react-chartjs-2";
import { SearchIcon, CheckmarkIcon, MatchRateIcon, CalendarIcon } from "./Icons";

const MetricCard = ({ label, value, icon, color }) => {
  const iconStyle = {
    backgroundColor: color.replace(")", ", 0.1)").replace("rgb", "rgba"),
    color: color,
  };

  return (
    <div className="metric-card">
      <div className="metric-icon" style={iconStyle}>
        {icon}
      </div>
      <div className="metric-content">
        <div className="metric-label">{label}</div>
        <div className="metric-value">{value}</div>
      </div>
    </div>
  );
};

MetricCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  icon: PropTypes.node.isRequired,
  color: PropTypes.string.isRequired,
};
const baseChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
};

const lineChartOptions = {
  ...baseChartOptions, // Use the spread operator
  plugins: { legend: { display: false } },
  scales: {
    y: {
      beginAtZero: true,
      grid: { color: "#e9ecef", borderDash: [5, 5] },
      ticks: { color: "#6c757d" },
    },
    x: { grid: { display: false }, ticks: { color: "#6c757d" } },
  },
};

const pieChartOptions = {
  ...baseChartOptions,
  plugins: {
    legend: {
      position: "right",
      labels: {
        font: { family: "'Inter', sans-serif", size: 12 },
        color: "#6c757d",
        boxWidth: 15,
        padding: 20,
      },
    },
  },
};

export const AnalyticsTab = ({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  analyticsData,
  searchTrendsChart,
}) => {
  const deviceBreakdownChart = {
    labels: analyticsData.deviceBreakdown.map(item => item.device),
    datasets: [
      {
        data: analyticsData.deviceBreakdown.map(item => item.percentage),
        backgroundColor: ["#6d47d9", "#51D5A6", "#FFC107"],
        borderColor: "#FFFFFF",
        borderWidth: 2,
        hoverOffset: 4,
      },
    ],
  };

  const metrics = [
    {
      label: "Total Searches",
      value: analyticsData.totalSearches,
      color: "rgb(109, 71, 217)",
      icon: <SearchIcon />,
    },
    {
      label: "Successful Matches",
      value: analyticsData.successfulMatches,
      color: "rgb(81, 213, 166)",
      icon: <CheckmarkIcon />,
    },
    {
      label: "Match Rate",
      value: `${analyticsData.matchRate.toFixed(1)}%`,
      color: "rgb(255, 193, 7)",
      icon: <MatchRateIcon />,
    },
    {
      label: "Avg. Daily Searches",
      value: analyticsData.totalSearches ? Math.round(analyticsData.totalSearches / 7) : 0,
      color: "rgb(255, 99, 132)",
      icon: <CalendarIcon />,
    },
  ];

  return (
    <div className="analytics-dashboard">
      <div className="card common-filters-container">
        <h3>Analytics Overview</h3>
        <div className="date-filters">
          <input
            type="date"
            value={startDate}
            max={endDate}
            onChange={e => setStartDate(e.target.value)}
          />
          <span>to</span>
          <input
            type="date"
            value={endDate}
            min={startDate}
            max={new Date().toISOString().split("T")[0]}
            onChange={e => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div className="metrics-grid">
        {metrics.map(metric => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            icon={metric.icon}
            color={metric.color}
          />
        ))}
      </div>

      <div className="charts-grid">
        <div className="card chart-card-large">
          <div className="card-header">
            <h3>Search Trends</h3>
          </div>
          <div className="chart-container">
            <Line data={searchTrendsChart} options={lineChartOptions} />
          </div>
        </div>
        <div className="card chart-card-small">
          <div className="card-header">
            <h3>Device Breakdown</h3>
          </div>
          <div className="chart-container">
            {analyticsData.deviceBreakdown.length > 0 ? (
              <Pie data={deviceBreakdownChart} options={pieChartOptions} />
            ) : (
              <div className="chart-placeholder">
                <CheckmarkIcon />
                <p>No device data available for this period.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

AnalyticsTab.propTypes = {
  startDate: PropTypes.string.isRequired,
  endDate: PropTypes.string.isRequired,
  setStartDate: PropTypes.func.isRequired,
  setEndDate: PropTypes.func.isRequired,
  analyticsData: PropTypes.shape({
    totalSearches: PropTypes.number.isRequired,
    successfulMatches: PropTypes.number.isRequired,
    matchRate: PropTypes.number.isRequired,
    searchTrends: PropTypes.array.isRequired,
    deviceBreakdown: PropTypes.arrayOf(
      PropTypes.shape({
        device: PropTypes.string,
        percentage: PropTypes.number,
      })
    ).isRequired,
  }).isRequired,
  searchTrendsChart: PropTypes.shape({
    labels: PropTypes.arrayOf(PropTypes.string),
    datasets: PropTypes.arrayOf(PropTypes.object),
  }).isRequired,
};
