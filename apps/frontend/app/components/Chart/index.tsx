import * as React from 'react';

import { Box, useTheme } from '@mui/material';
import Title from '~/components/Title';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// Define types similar to legacy app
export interface ChartData {
  time: string;
  value: number;
}

export type ChartType = 'line' | 'bar' | 'area';

const Chart: React.FunctionComponent<{
  title?: string;
  data: ChartData[];
  dataLabel?: string;
  type?: ChartType;
}> = ({ title, data, dataLabel, type = 'line' }) => {
  const theme = useTheme();

  const isLineChart = React.useMemo(() => type === 'line', [type]);
  const isBarChart = React.useMemo(() => type === 'bar', [type]);
  const isAreaChart = React.useMemo(() => type === 'area', [type]);

  const gradientId = React.useMemo(() => `chart-gradient-${Math.random().toString(36).substring(2, 9)}`, []);

  return (
    <React.Fragment>
      {title && <Title>{title}</Title>}
      <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
        <ResponsiveContainer>
          {isLineChart ? (
            <LineChart
              data={data}
              margin={{
                top: 16,
                right: 16,
                bottom: 0,
                left: 24,
              }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} strokeOpacity={0.5} />
              <XAxis
                dataKey="time"
                stroke={theme.palette.text.secondary}
                style={theme.typography.body2}
                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
              />
              <YAxis
                stroke={theme.palette.text.secondary}
                style={theme.typography.body2}
                domain={['auto', 'auto']}
                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  borderRadius: 8,
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                  border: 'none',
                }}
                cursor={{ stroke: theme.palette.primary.main, strokeWidth: 1, strokeOpacity: 0.5 }}
              />
              <Line
                type="monotone"
                dataKey="value"
                name={dataLabel}
                stroke={theme.palette.primary.main}
                strokeWidth={3}
                dot={{
                  r: 4,
                  strokeWidth: 2,
                  fill: theme.palette.background.paper,
                  stroke: theme.palette.primary.main,
                }}
                activeDot={{
                  r: 6,
                  strokeWidth: 0,
                  fill: theme.palette.primary.main,
                }}
              />
            </LineChart>
          ) : isBarChart ? (
            <BarChart
              data={data}
              margin={{
                top: 16,
                right: 16,
                bottom: 0,
                left: 24,
              }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} strokeOpacity={0.5} />
              <XAxis
                dataKey="time"
                stroke={theme.palette.text.secondary}
                style={theme.typography.body2}
                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
              />
              <YAxis
                stroke={theme.palette.text.secondary}
                style={theme.typography.body2}
                domain={['auto', 'auto']}
                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  borderRadius: 8,
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                  border: 'none',
                }}
                cursor={{ fill: theme.palette.primary.main, fillOpacity: 0.1 }}
              />
              <Bar dataKey="value" name={dataLabel} fill={`url(#${gradientId})`} radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : isAreaChart ? (
            <AreaChart
              data={data}
              margin={{
                top: 16,
                right: 16,
                bottom: 0,
                left: 24,
              }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} strokeOpacity={0.5} />
              <XAxis
                dataKey="time"
                stroke={theme.palette.text.secondary}
                style={theme.typography.body2}
                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
              />
              <YAxis
                stroke={theme.palette.text.secondary}
                style={theme.typography.body2}
                domain={['auto', 'auto']}
                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  borderRadius: 8,
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                  border: 'none',
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                name={dataLabel}
                stroke={theme.palette.primary.main}
                fillOpacity={1}
                fill={`url(#${gradientId})`}
              />
            </AreaChart>
          ) : (
            <></>
          )}
        </ResponsiveContainer>
      </Box>
    </React.Fragment>
  );
};

export default Chart;
