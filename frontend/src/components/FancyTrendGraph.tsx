import * as React from 'react';
import Stack from '@mui/material/Stack';
import { SparkLineChart, SparkLineChartProps } from '@mui/x-charts/SparkLineChart';
import { areaElementClasses, lineElementClasses } from '@mui/x-charts/LineChart';
import { chartsAxisHighlightClasses } from '@mui/x-charts/ChartsAxisHighlight';
import Box from '@mui/material/Box';
import { useTranslation } from 'react-i18next';

interface Graphdata {
    xAxis: string[];
    yAxis: number[];
}
export default function FancyTrendGraph(graphData: Graphdata) {
    const { t } = useTranslation();
    const settings: SparkLineChartProps = {
        data: graphData.yAxis,
        baseline: 15,
        margin: { bottom: 0, top: 5, left: 4, right: 0 },
        xAxis: { id: 'week-axis', data: graphData.xAxis },
        yAxis: {
            domainLimit: () => ({
                min: 15,
                max: 30,
            }),
        },
        sx: {
            [`& .${areaElementClasses.root}`]: { opacity: 0.2 },
            [`& .${lineElementClasses.root}`]: { strokeWidth: 3 },
            [`& .${chartsAxisHighlightClasses.root}`]: {
                stroke: 'rgb(86,145,255)',
                strokeDasharray: 'none',
                strokeWidth: 0,
            },
        },
        slotProps: {
            lineHighlight: { r: 4 },
        },
        clipAreaOffset: { top: 2, bottom: 2 },
        axisHighlight: { x: 'line' },
    };

    const [weekIndex, setWeekIndex] = React.useState<null | number>(null);
    return (
        <Box
            role="button"
            aria-label={t('aria_showing_weekly_downloads')}
            tabIndex={0}
            width="100%"
            height="100%"
            display="flex"
            justifyContent="center"
            alignItems="center"
        >
            <Stack direction="column" width={320}>
                <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-end"
                >
                    <SparkLineChart
                        height={80}
                        width={320}
                        area
                        className={"temperature-line-chart"}
                        color="rgb(86,145,255)"
                        onHighlightedAxisChange={(axisItems) => {
                            setWeekIndex(axisItems[0]?.dataIndex ?? null);
                        }}
                        highlightedAxis={
                            weekIndex === null
                                ? []
                                : [{ axisId: 'week-axis', dataIndex: weekIndex }]
                        }
                        {...settings}
                    />
                </Stack>
            </Stack>
        </Box>
    );
}


