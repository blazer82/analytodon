import * as React from 'react';
import {useTheme} from '@mui/material/styles';
import {LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar} from 'recharts';
import Title from '@/components/Title';
import {ChartData} from '@/types/ChartData';
import {ChartType} from '@/types/ChartType';

const Chart: React.FunctionComponent<{title?: string; data: ChartData; dataLabel?: string; type?: ChartType}> = ({title, data, dataLabel, type = 'line'}) => {
    const theme = useTheme();

    const isLineChart = React.useMemo(() => type === 'line', [type]);
    const isBarChart = React.useMemo(() => type === 'bar', [type]);

    return (
        <React.Fragment>
            {title && <Title>{title}</Title>}
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
                        <XAxis dataKey="time" stroke={theme.palette.text.secondary} style={theme.typography.body2} />
                        <YAxis stroke={theme.palette.text.secondary} style={theme.typography.body2} domain={['auto', 'auto']}></YAxis>
                        <Tooltip contentStyle={{backgroundColor: theme.palette.background.default}} />
                        <Line
                            type="monotone"
                            dataKey="value"
                            name={dataLabel}
                            stroke={theme.palette.primary.main}
                            strokeWidth={4}
                            dot={{r: 4}}
                            markerWidth={10}
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
                        <XAxis dataKey="time" stroke={theme.palette.text.secondary} style={theme.typography.body2} />
                        <YAxis stroke={theme.palette.text.secondary} style={theme.typography.body2} domain={['auto', 'auto']}></YAxis>
                        <Tooltip contentStyle={{backgroundColor: theme.palette.background.default}} />
                        <Bar dataKey="value" name={dataLabel} fill={theme.palette.primary.main} radius={[2, 2, 0, 0]} />
                    </BarChart>
                ) : (
                    <></>
                )}
            </ResponsiveContainer>
        </React.Fragment>
    );
};

export default Chart;
