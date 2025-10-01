import React, { useState, useMemo } from "react"
import { Card, Space, Typography, Checkbox } from "antd"
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine
} from "recharts"

import dayjs from "dayjs"

const { Text } = Typography

interface Measurement {
    timestamp: string
    temperature?: number | null
    humidity?: number | null
    device: string
}

export interface ChartMetric {
    key: "temperature" | "humidity"
    name: string
    colors: string[]
    unit: string
}

interface LineChartProps {
    data: Measurement[]
    devices: string[]
    title: string
    metrics: ChartMetric[]
}

type ProcessedData = {
    timestamp: string
    [key:string]: any
}

const LineChartCompare: React.FC<LineChartProps> = ({ data, devices, title, metrics }) => {
    const [activeLines, setActiveLines] = useState<string[]>(() =>
        devices.flatMap(device => metrics.map(metric => `${device}_${metric.key}`))
    )

    const handleLegendClick = (lineKey: string) => {
        setActiveLines(prev =>
            prev.includes(lineKey)
                ? prev.filter(key => key !== lineKey)
                : [...prev, lineKey]
        )
    }

    const processedData = useMemo<ProcessedData[]>(() => {
        const dataByTimestamp = new Map<string, ProcessedData>()
        for (const item of data) {
            if (!item.timestamp) continue
            const minuteTimestamp = dayjs(item.timestamp).format("YYYY-MM-DD HH:mm")
            if (!dataByTimestamp.has(minuteTimestamp)) {
                dataByTimestamp.set(minuteTimestamp, { timestamp: minuteTimestamp })
            }
            const entry = dataByTimestamp.get(minuteTimestamp)!
            for (const metric of metrics) {
                const dataKey = `${item.device}_${metric.key}`
                if (item[metric.key] !== undefined && item[metric.key] !== null) {
                    entry[dataKey] = item[metric.key]
                }
            }
        }
        return Array.from(dataByTimestamp.values()).sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
    }, [data, metrics])

    if (!metrics || metrics.length === 0) {
        return null
    }

    return (
        <Card title={title} style={{ marginTop: 20 }}>
            <ResponsiveContainer width="100%" height={400}>
                <LineChart
                    data={processedData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        dataKey="timestamp"
                        tickFormatter={timestamp => dayjs(timestamp).format("DD.MM.YYYY HH:mm")}
                        minTickGap={30}
                    />
                    <YAxis
                        yAxisId="left"
                        orientation="left"
                        stroke={metrics.find(m => m.key === "temperature")?.colors[0] || "#8884d8"}
                        domain={[17, 'auto']}
                        tickFormatter={value =>
                            `${value.toFixed(1)} ${
                                metrics.find(m => m.key === "temperature")?.unit || ""
                            }`
                        }
                        hide={!metrics.some(m => m.key === "temperature")}
                    />
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke={metrics.find(m => m.key === "humidity")?.colors[0] || "#82ca9d"}
                        tickFormatter={value =>
                            `${value.toFixed(1)} ${
                                metrics.find(m => m.key === "humidity")?.unit || ""
                            }`
                        }
                        hide={!metrics.some(m => m.key === "humidity")}
                    />
                    <Tooltip
                        labelFormatter={label => dayjs(label).format("DD.MM.YYYY HH:mm")}
                        formatter={(value: number, name: string, props) => {
                            const metricKey = props.dataKey!!.toString().split("_").pop()
                            const metric = metrics.find(m => m.key === metricKey)
                            const unit = metric ? metric.unit : ""
                            return [`${value.toFixed(1)} ${unit}`, name]
                        }}
                    />
                    <Legend />
                    {metrics.some(m => m.key === "temperature") && (
                        <ReferenceLine
                            y={21}
                            yAxisId="left"
                            stroke="red"
                            strokeDasharray="3 3"
                            label="21°C"
                        />
                    )}
                    {devices.flatMap((device, deviceIndex) =>
                        metrics.map(metric => {
                            const dataKey = `${device}_${metric.key}`
                            if (!activeLines.includes(dataKey)) return null

                            const color = metric.colors[deviceIndex % metric.colors.length]
                            const strokeDasharray = deviceIndex === 0 ? "1" : "5 5"

                            return (
                                <Line
                                    key={dataKey}
                                    yAxisId={metric.key === "temperature" ? "left" : "right"}
                                    type="monotone"
                                    dataKey={dataKey}
                                    name={`${device} - ${metric.name}`}
                                    stroke={color}
                                    strokeDasharray={strokeDasharray}
                                    strokeWidth={2}
                                    dot={false}
                                    connectNulls
                                />
                            )
                        })
                    )}
                </LineChart>
            </ResponsiveContainer>
            <div
                style={{
                    marginTop: 10,
                    display: "flex",
                    justifyContent: "center",
                    flexWrap: "wrap",
                    gap: "20px"
                }}
            >
                {devices.flatMap((device, deviceIndex) =>
                    metrics.map(metric => {
                        const lineKey = `${device}_${metric.key}`
                        const color = metric.colors[deviceIndex % metric.colors.length]
                        return (
                            <Space
                                key={lineKey}
                                onClick={() => handleLegendClick(lineKey)}
                                style={{ cursor: "pointer" }}
                            >
                                <Checkbox
                                    checked={activeLines.includes(lineKey)}
                                    style={
                                        {
                                            "--ant-checkbox-checked-bg": color,
                                            "--ant--checkbox-checked-border-color": color
                                        } as React.CSSProperties
                                    }
                                />
                                <Text>{`${device} - ${metric.name}`}</Text>
                            </Space>
                        )
                    })
                )}
            </div>
        </Card>
    )
}

export default LineChartCompare