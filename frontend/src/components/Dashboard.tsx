import React, { useContext, useEffect, useMemo, useState, useCallback } from "react";
import { ApiContext } from "../apiClient";
import { Measurement, Device, Room } from "../generated";
import Highcharts from "highcharts";
import HighchartsMore from "highcharts/highcharts-more";
import HighchartsReact from "highcharts-react-official";
import { subDays, subHours, format } from "date-fns";

// Initialize the Highcharts module
if (typeof HighchartsMore === 'function') {
    HighchartsMore(Highcharts);
}

// Global Highcharts theme
Highcharts.setOptions({
    colors: [
        '#6366f1', '#06b6d4', '#f59e0b', '#10b981', '#ef4444',
        '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b'
    ],
    chart: {
        style: { fontFamily: "'Inter', 'Segoe UI', sans-serif" },
        backgroundColor: '#ffffff',
        borderRadius: 12,
    },
    title: {
        style: { fontSize: '16px', fontWeight: '600', color: '#1e293b' }
    },
    subtitle: {
        style: { fontSize: '12px', color: '#64748b' }
    },
    credits: { enabled: false },
    tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderColor: 'transparent',
        borderRadius: 8,
        style: { color: '#f8fafc', fontSize: '12px' },
        shadow: false,
    },
});

const UPDATE_INTERVAL_MS = 60 * 1000;
const OFFLINE_THRESHOLD_MS = 2 * UPDATE_INTERVAL_MS;
const REFRESH_INTERVAL = 60000;

// -- Stat Card --
function StatCard({ title, value, subtitle, color, icon }: {
    title: string; value: string | number; subtitle?: string; color: string; icon: string;
}) {
    return (
        <div style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            minWidth: 200,
            flex: '1 1 200px',
        }}>
            <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: color + '15',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, flexShrink: 0,
            }}>
                {icon}
            </div>
            <div>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {title}
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                    {value}
                </div>
                {subtitle && (
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                        {subtitle}
                    </div>
                )}
            </div>
        </div>
    );
}

// -- Time Range Selector --
function TimeRangeSelector({ value, onChange }: {
    value: string; onChange: (v: string) => void;
}) {
    const options = [
        { label: '6h', value: '6h' },
        { label: '24h', value: '24h' },
        { label: '3d', value: '3d' },
        { label: '7d', value: '7d' },
    ];
    return (
        <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 8, padding: 3 }}>
            {options.map(opt => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    style={{
                        padding: '6px 14px',
                        borderRadius: 6,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 500,
                        transition: 'all 0.15s',
                        background: value === opt.value ? '#6366f1' : 'transparent',
                        color: value === opt.value ? '#fff' : '#64748b',
                    }}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

function getStartDate(range: string): Date {
    const now = new Date();
    switch (range) {
        case '6h': return subHours(now, 6);
        case '24h': return subDays(now, 1);
        case '3d': return subDays(now, 3);
        case '7d': return subDays(now, 7);
        default: return subDays(now, 3);
    }
}

export default function Dashboard() {
    const apiClient = useContext(ApiContext);
    const [measurements, setMeasurements] = useState<Measurement[]>([]);
    const [devices, setDevices] = useState<Device[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [offlineDevices, setOfflineDevices] = useState<Device[]>([]);
    const [latestMeasurements, setLatestMeasurements] = useState<Measurement[]>([]);
    const [avgTemp, setAvgTemp] = useState<number | null>(null);
    const [avgHumidity, setAvgHumidity] = useState<number | null>(null);
    const [timeRange, setTimeRange] = useState('24h');
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!apiClient) return;
        try {
            const now = new Date();
            const start = getStartDate(timeRange);

            const [deviceList, measurementList, roomList, offlineList, latest, aTemp, aHum] =
                await Promise.all([
                    apiClient.getAllDevices(),
                    apiClient.getMeasurementsInTimeRange({
                        startTime: start.toISOString(),
                        endTime: now.toISOString(),
                    }),
                    apiClient.getAllRooms(),
                    apiClient.getOfflineDevices(),
                    apiClient.getLatestMeasurementsByDevice(),
                    apiClient.getAvgTemperatureInTimeRange({
                        startTime: start.toISOString(),
                        endTime: now.toISOString(),
                    }),
                    apiClient.getAvgHumidityInTimeRange({
                        startTime: start.toISOString(),
                        endTime: now.toISOString(),
                    }),
                ]);

            setDevices(deviceList);
            setMeasurements(measurementList);
            setRooms(roomList);
            setOfflineDevices(offlineList);
            setLatestMeasurements(latest);
            setAvgTemp(typeof aTemp === 'number' ? aTemp : null);
            setAvgHumidity(typeof aHum === 'number' ? aHum : null);
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    }, [apiClient, timeRange]);

    useEffect(() => {
        setLoading(true);
        fetchData();
        const interval = setInterval(fetchData, REFRESH_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchData]);

    // Group measurements by device
    const measurementsByDevice = useMemo(() => {
        const map: Record<string, Measurement[]> = {};
        measurements.forEach(m => {
            const name = m.deviceName || 'Unknown';
            if (!map[name]) map[name] = [];
            map[name].push(m);
        });
        // Sort each device's measurements by time
        Object.values(map).forEach(arr => arr.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)));
        return map;
    }, [measurements]);

    // -- Temperature Chart --
    const temperatureOptions = useMemo((): Highcharts.Options => {
        const series: Highcharts.SeriesOptionsType[] = Object.entries(measurementsByDevice)
            .filter(([, ms]) => ms.some(m => m.temperature != null))
            .map(([name, ms]) => ({
                name,
                type: 'spline' as const,
                data: ms
                    .filter(m => m.temperature != null)
                    .map(m => [Date.parse(m.timestamp), Math.round(m.temperature! * 10) / 10]),
                marker: { enabled: false },
                lineWidth: 2,
            }));

        return {
            chart: { height: 360, zooming: { type: 'x' } },
            title: { text: 'Temperature' },
            subtitle: { text: 'Per device over time' },
            xAxis: { type: 'datetime', crosshair: true },
            yAxis: {
                title: { text: undefined },
                labels: { format: '{value}°C' },
                softMin: 15, softMax: 30,
                plotBands: [{
                    from: 19, to: 22,
                    color: 'rgba(16, 185, 129, 0.06)',
                    label: { text: 'Comfort zone', style: { color: '#10b981', fontSize: '10px' } }
                }],
            },
            tooltip: {
                shared: true,
                valueSuffix: '°C',
                xDateFormat: '%b %d, %H:%M',
            },
            legend: {
                enabled: series.length <= 10,
                layout: 'horizontal',
                align: 'center',
                verticalAlign: 'bottom',
                itemStyle: { fontSize: '11px', color: '#475569' },
            },
            plotOptions: {
                spline: {
                    connectNulls: false,
                    states: { hover: { lineWidth: 3 } },
                }
            },
            series,
        };
    }, [measurementsByDevice]);

    // -- Humidity Chart --
    const humidityOptions = useMemo((): Highcharts.Options => {
        const series: Highcharts.SeriesOptionsType[] = Object.entries(measurementsByDevice)
            .filter(([, ms]) => ms.some(m => m.humidity != null))
            .map(([name, ms]) => ({
                name,
                type: 'areaspline' as const,
                data: ms
                    .filter(m => m.humidity != null)
                    .map(m => [Date.parse(m.timestamp), Math.round(m.humidity! * 10) / 10]),
                marker: { enabled: false },
                lineWidth: 2,
                fillOpacity: 0.05,
            }));

        return {
            chart: { height: 360, zooming: { type: 'x' } },
            title: { text: 'Humidity' },
            subtitle: { text: 'Per device over time' },
            xAxis: { type: 'datetime', crosshair: true },
            yAxis: {
                title: { text: undefined },
                labels: { format: '{value}%' },
                min: 0, max: 100,
                plotBands: [{
                    from: 40, to: 60,
                    color: 'rgba(6, 182, 212, 0.06)',
                    label: { text: 'Ideal range', style: { color: '#06b6d4', fontSize: '10px' } }
                }],
            },
            tooltip: {
                shared: true,
                valueSuffix: '%',
                xDateFormat: '%b %d, %H:%M',
            },
            legend: {
                enabled: series.length <= 10,
                layout: 'horizontal',
                align: 'center',
                verticalAlign: 'bottom',
                itemStyle: { fontSize: '11px', color: '#475569' },
            },
            series,
        };
    }, [measurementsByDevice]);

    // -- Room Comparison Chart --
    const roomChartOptions = useMemo((): Highcharts.Options | null => {
        if (latestMeasurements.length === 0 || rooms.length === 0) return null;

        // Build room -> latest temps map
        const deviceToRoom: Record<string, string> = {};
        rooms.forEach(r => r.devices.forEach(d => { deviceToRoom[d.name] = r.name; }));

        const roomTemps: Record<string, number[]> = {};
        latestMeasurements.forEach(m => {
            if (m.temperature == null || !m.deviceName) return;
            const room = deviceToRoom[m.deviceName] || m.deviceName;
            if (!roomTemps[room]) roomTemps[room] = [];
            roomTemps[room].push(m.temperature);
        });

        const categories = Object.keys(roomTemps).sort();
        const avgTemps = categories.map(r => {
            const temps = roomTemps[r];
            return Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10;
        });

        if (categories.length === 0) return null;

        return {
            chart: { type: 'bar', height: Math.max(250, categories.length * 40 + 80) },
            title: { text: 'Current Temperature by Room' },
            subtitle: { text: 'Latest readings averaged per room' },
            xAxis: {
                categories,
                labels: { style: { fontSize: '12px' } },
            },
            yAxis: {
                title: { text: undefined },
                labels: { format: '{value}°C' },
                plotLines: [{
                    value: 20,
                    color: '#10b981',
                    width: 2,
                    dashStyle: 'Dash',
                    label: { text: '20°C target', style: { color: '#10b981', fontSize: '10px' } },
                }],
            },
            tooltip: { valueSuffix: '°C' },
            legend: { enabled: false },
            plotOptions: {
                bar: {
                    borderRadius: 4,
                    dataLabels: { enabled: true, format: '{y}°C', style: { fontSize: '11px' } },
                    colorByPoint: true,
                }
            },
            series: [{
                name: 'Temperature',
                type: 'bar' as const,
                data: avgTemps.map(t => ({
                    y: t,
                    color: t > 23 ? '#ef4444' : t < 18 ? '#3b82f6' : '#10b981',
                })),
            }],
        };
    }, [latestMeasurements, rooms]);

    // -- Device Connectivity Timeline --
    const connectivityOptions = useMemo((): Highcharts.Options => {
        const deviceData: Record<string, Measurement[]> = {};
        devices.forEach(d => { deviceData[d.name] = []; });
        measurements.forEach(m => {
            const name = m.deviceName || 'Unknown';
            if (!deviceData[name]) deviceData[name] = [];
            deviceData[name].push(m);
        });

        const now = Date.now();
        const startTime = getStartDate(timeRange).getTime();
        const deviceNames = Object.keys(deviceData).sort();

        const series: Highcharts.SeriesOptionsType[] = deviceNames.map((deviceName, index) => {
            const ascMs = [...(deviceData[deviceName] || [])]
                .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

            const points: Highcharts.PointOptionsObject[] = [];
            const zones: Highcharts.SeriesZonesOptionsObject[] = [];

            if (ascMs.length === 0) {
                points.push({ x: startTime, y: index });
                points.push({ x: now, y: index });
                zones.push({ value: now, color: '#ef4444' });
            } else {
                const firstTime = Date.parse(ascMs[0].timestamp);
                if (firstTime > startTime + OFFLINE_THRESHOLD_MS) {
                    points.push({ x: startTime, y: index });
                    points.push({ x: firstTime - 1000, y: index });
                    zones.push({ value: firstTime, color: '#ef4444' });
                } else {
                    zones.push({ value: firstTime, color: '#ef4444' });
                }

                for (let i = 0; i < ascMs.length; i++) {
                    const currentTime = Date.parse(ascMs[i].timestamp);
                    points.push({ x: currentTime, y: index });

                    if (i < ascMs.length - 1) {
                        const nextTime = Date.parse(ascMs[i + 1].timestamp);
                        if (nextTime - currentTime > OFFLINE_THRESHOLD_MS) {
                            const offlineStart = currentTime + UPDATE_INTERVAL_MS;
                            points.push({ x: offlineStart, y: index });
                            points.push({ x: nextTime - 1000, y: index });
                            zones.push({ value: offlineStart, color: '#10b981' });
                            zones.push({ value: nextTime, color: '#ef4444' });
                        }
                    } else {
                        if (now - currentTime > OFFLINE_THRESHOLD_MS) {
                            const offlineStart = currentTime + UPDATE_INTERVAL_MS;
                            points.push({ x: offlineStart, y: index });
                            points.push({ x: now, y: index });
                            zones.push({ value: offlineStart, color: '#10b981' });
                            zones.push({ value: now, color: '#ef4444' });
                        } else {
                            zones.push({ value: now, color: '#10b981' });
                        }
                    }
                }
            }

            return {
                name: deviceName,
                type: 'line' as const,
                data: points,
                lineWidth: 6,
                marker: { enabled: false },
                zoneAxis: 'x',
                zones,
                tooltip: {
                    pointFormat: '<b>{series.name}</b><br/>Time: {point.x:%b %d, %H:%M:%S}'
                },
            };
        });

        return {
            chart: {
                height: Math.max(300, deviceNames.length * 45 + 100),
            },
            title: { text: 'Device Connectivity' },
            subtitle: { text: 'Green = online, Red = offline' },
            xAxis: {
                type: 'datetime',
                min: startTime,
                max: now,
                crosshair: true,
            },
            yAxis: {
                categories: deviceNames,
                title: { text: undefined },
                reversed: true,
                min: 0,
                max: deviceNames.length > 0 ? deviceNames.length - 1 : 0,
                tickInterval: 1,
                gridLineWidth: 0,
                labels: { style: { fontSize: '11px' } },
            },
            legend: { enabled: false },
            series,
        };
    }, [measurements, devices, timeRange]);

    // -- Latest Readings Table --
    const latestReadingsContent = useMemo(() => {
        if (latestMeasurements.length === 0) return null;

        const offlineSet = new Set(offlineDevices.map(d => d.macAddress));
        const sorted = [...latestMeasurements].sort((a, b) =>
            (a.deviceName || '').localeCompare(b.deviceName || '')
        );

        return (
            <div style={{
                background: '#ffffff', borderRadius: 12, padding: 24,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
            }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
                    Latest Readings
                </h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                                <th style={thStyle}>Device</th>
                                <th style={thStyle}>Temperature</th>
                                <th style={thStyle}>Humidity</th>
                                <th style={thStyle}>Last Seen</th>
                                <th style={thStyle}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map(m => {
                                const isOffline = m.macAddress ? offlineSet.has(m.macAddress) : false;
                                return (
                                    <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={tdStyle}>
                                            <span style={{ fontWeight: 500, color: '#1e293b' }}>{m.deviceName || 'Unknown'}</span>
                                        </td>
                                        <td style={tdStyle}>
                                            {m.temperature != null ? `${m.temperature.toFixed(1)}°C` : '—'}
                                        </td>
                                        <td style={tdStyle}>
                                            {m.humidity != null ? `${m.humidity.toFixed(1)}%` : '—'}
                                        </td>
                                        <td style={{ ...tdStyle, color: '#64748b' }}>
                                            {format(new Date(m.timestamp), 'MMM d, HH:mm')}
                                        </td>
                                        <td style={tdStyle}>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                                padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 500,
                                                background: isOffline ? '#fef2f2' : '#f0fdf4',
                                                color: isOffline ? '#dc2626' : '#16a34a',
                                            }}>
                                                <span style={{
                                                    width: 6, height: 6, borderRadius: '50%',
                                                    background: isOffline ? '#dc2626' : '#16a34a',
                                                }} />
                                                {isOffline ? 'Offline' : 'Online'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }, [latestMeasurements, offlineDevices]);

    if (loading) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '100vh', color: '#64748b', fontSize: 16,
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: 40, height: 40, border: '3px solid #e2e8f0',
                        borderTopColor: '#6366f1', borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
                    }} />
                    Loading dashboard...
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        );
    }

    const onlineCount = devices.length - offlineDevices.length;

    return (
        <div style={{
            padding: '24px 32px',
            background: '#f8fafc',
            minHeight: '100vh',
            maxWidth: 1400,
            margin: '0 auto',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 24, flexWrap: 'wrap', gap: 12,
            }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a' }}>
                        TempMon Dashboard
                    </h1>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>
                        Last updated: {format(new Date(), 'MMM d, HH:mm:ss')}
                    </p>
                </div>
                <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
            </div>

            {/* Stat Cards */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
                <StatCard
                    title="Devices"
                    value={devices.length}
                    subtitle={`${onlineCount} online`}
                    color="#6366f1"
                    icon="📡"
                />
                <StatCard
                    title="Avg Temperature"
                    value={avgTemp != null ? `${avgTemp.toFixed(1)}°C` : '—'}
                    subtitle="Selected period"
                    color="#f59e0b"
                    icon="🌡"
                />
                <StatCard
                    title="Avg Humidity"
                    value={avgHumidity != null ? `${avgHumidity.toFixed(1)}%` : '—'}
                    subtitle="Selected period"
                    color="#06b6d4"
                    icon="💧"
                />
                <StatCard
                    title="Offline Alerts"
                    value={offlineDevices.length}
                    subtitle="Last 3 hours"
                    color={offlineDevices.length > 0 ? '#ef4444' : '#10b981'}
                    icon={offlineDevices.length > 0 ? '⚠' : '✓'}
                />
            </div>

            {/* Temperature & Humidity Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div style={{
                    background: '#ffffff', borderRadius: 12, padding: 16,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
                }}>
                    <HighchartsReact highcharts={Highcharts} options={temperatureOptions} />
                </div>
                <div style={{
                    background: '#ffffff', borderRadius: 12, padding: 16,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
                }}>
                    <HighchartsReact highcharts={Highcharts} options={humidityOptions} />
                </div>
            </div>

            {/* Room Comparison & Latest Readings */}
            <div style={{ display: 'grid', gridTemplateColumns: roomChartOptions ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 16 }}>
                {roomChartOptions && (
                    <div style={{
                        background: '#ffffff', borderRadius: 12, padding: 16,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
                    }}>
                        <HighchartsReact highcharts={Highcharts} options={roomChartOptions} />
                    </div>
                )}
                {latestReadingsContent}
            </div>

            {/* Connectivity Timeline */}
            <div style={{
                background: '#ffffff', borderRadius: 12, padding: 16,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
            }}>
                <HighchartsReact highcharts={Highcharts} options={connectivityOptions} />
            </div>
        </div>
    );
}

const thStyle: React.CSSProperties = {
    textAlign: 'left', padding: '10px 12px', color: '#64748b',
    fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = {
    padding: '10px 12px', color: '#334155',
};
