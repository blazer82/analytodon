import * as React from 'react';

import { Box, useTheme } from '@mui/material';
import Title from '~/components/Title';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const SERIES_COLORS = [
  '#1976d2', // blue
  '#388e3c', // green
  '#f57c00', // orange
  '#d32f2f', // red
  '#7b1fa2', // purple
  '#0097a7', // teal
  '#c2185b', // pink
  '#5d4037', // brown
  '#455a64', // blue grey
  '#fbc02d', // yellow
];

const MultiSeriesChart: React.FunctionComponent<{
  title?: string;
  data: Array<Record<string, string | number>>;
  seriesKeys: string[];
}> = ({ title, data, seriesKeys }) => {
  const theme = useTheme();

  return (
    <React.Fragment>
      {title && <Title>{title}</Title>}
      <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
        <ResponsiveContainer>
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
              {seriesKeys.map((key, index) => (
                <linearGradient key={key} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SERIES_COLORS[index % SERIES_COLORS.length]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={SERIES_COLORS[index % SERIES_COLORS.length]} stopOpacity={0.05} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} strokeOpacity={0.5} />
            <XAxis
              dataKey="day"
              stroke={theme.palette.text.secondary}
              style={theme.typography.body2}
              tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
              tickFormatter={(tick: string) =>
                new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(tick))
              }
            />
            <YAxis
              stroke={theme.palette.text.secondary}
              style={theme.typography.body2}
              tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: theme.palette.background.paper,
                borderRadius: 8,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                border: 'none',
              }}
              labelFormatter={(label: string) =>
                new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
                  new Date(label),
                )
              }
            />
            {seriesKeys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                name={`#${key}`}
                stroke={SERIES_COLORS[index % SERIES_COLORS.length]}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#gradient-${index})`}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </React.Fragment>
  );
};

export default MultiSeriesChart;
