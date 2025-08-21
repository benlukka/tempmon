import React from "react"
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ResponsiveContainer
} from "recharts"
import { Measurement } from "../generated"
import { SelectedRoomInfo } from "./RoomCompare"

interface ChartData {
    roomA: Measurement | null
    roomB: Measurement | null
}

interface LiveCompareChartProps {
    data: ChartData
    showTemperature: boolean
    showHumidity: boolean
    chartType: 'bar' | 'line'
    selectedRoomA: SelectedRoomInfo | undefined
    selectedRoomB: SelectedRoomInfo | undefined
}

const LiveCompareChart: React.FC<LiveCompareChartProps> = ({
                                                               data,
                                                               showTemperature,
                                                               showHumidity,
                                                               chartType,
                                                               selectedRoomA,
                                                               selectedRoomB
                                                           }) => {
    const chartData = [
        {
            name: selectedRoomA?.label as string,
            temperature: data.roomA?.temperature,
            humidity: data.roomA?.humidity,
        },
        {
            name: selectedRoomB?.label as string,
            temperature: data.roomB?.temperature,
            humidity: data.roomB?.humidity,
        },
    ]

    const ChartComponent = chartType === 'bar' ? BarChart : LineChart
    const DataComponent = chartType === 'bar' ? Bar : Line

    return (
        <ResponsiveContainer width="100%" height={400}>
            <ChartComponent
                data={chartData}
                margin={{top: 20, right: 30, left: 20, bottom: 5}}
            >
                <XAxis dataKey="name" />
                {showTemperature && (
                    <YAxis
                        yAxisId="left"
                        label={{
                            value: 'Temperatur (°C)',
                            angle: -90,
                            position: 'insideLeft',
                            style: {textAnchor: 'middle', fill: '#1890ff'}
                        }}
                        tickFormatter={(value) => value.toFixed(1)} // Precision limit
                    />
                )}
                {showHumidity && (
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        label={{
                            value: 'Luftfeuchtigkeit (%)',
                            angle: 90,
                            position: 'insideRight',
                            style: {textAnchor: 'middle', fill: '#52c41a'}
                        }}
                        tickFormatter={(value) => value.toFixed(1)}
                    />
                )}
                <Tooltip
                    formatter={(value) => [Number(value).toFixed(1)]}
                />
                <Legend />
                {showTemperature && (
                    <DataComponent
                        yAxisId="left"
                        dataKey="temperature"
                        name="Temperatur"
                        fill="#1890ff"
                        barSize={40}
                        stroke="#1890ff"
                    />
                )}
                {showHumidity && (
                    <DataComponent
                        yAxisId="right"
                        dataKey="humidity"
                        name="Luftfeuchtigkeit"
                        fill="#52c41a"
                        barSize={40}
                        stroke="#52c41a"
                    />
                )}
            </ChartComponent>
        </ResponsiveContainer>
    )
}

export default LiveCompareChart