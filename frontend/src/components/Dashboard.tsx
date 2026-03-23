import React, {useContext, useEffect, useMemo, useState} from "react";
import { ApiContext } from "../apiClient";
import { Measurement, Device } from "../generated/models";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { subDays } from "date-fns";

// The firmware update interval is 1 minute.
// "missed more than one timeslot" = gap > 2 * 1 minute = 120 seconds.
const UPDATE_INTERVAL_MS = 60 * 1000;
const OFFLINE_THRESHOLD_MS = 2 * UPDATE_INTERVAL_MS;

export default function Dashboard() {
    const apiClient = useContext(ApiContext);
    const [measurements, setMeasurements] = useState<Measurement[]>([]);
    const [devices, setDevices] = useState<Device[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (apiClient) {
                    const now = new Date();
                    const threeDaysAgo = subDays(now, 3);

                    const [deviceList, measurementList] = await Promise.all([
                        apiClient.getAllDevices(),
                        apiClient.getMeasurementsInTimeRange({
                            startTime: threeDaysAgo.toISOString(),
                            endTime: now.toISOString()
                        })
                    ]);
                    setDevices(deviceList);
                    setMeasurements(measurementList);
                }
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, [apiClient]);

    const chartOptions = useMemo(() => {
        // Prepare data map with all devices
        const deviceData: Record<string, Measurement[]> = {};
        devices.forEach(d => {
            deviceData[d.name] = [];
        });

        // Populate with measurements
        measurements.forEach(m => {
            const dName = m.deviceName || "Unknown Device";
            // Ensure device exists in map even if not in getAllDevices (though it should be)
            if (!deviceData[dName]) {
                deviceData[dName] = [];
            }
            deviceData[dName].push(m);
        });

        const now = Date.now();
        const startTime = subDays(now, 3).getTime();

        const series: Highcharts.SeriesOptionsType[] = Object.keys(deviceData).map((deviceName, index) => {
            const ms = deviceData[deviceName];
            // Sort ascending for processing points and zones
            const ascMs = [...ms].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

            const points: Highcharts.PointOptionsObject[] = [];
            const zones: Highcharts.SeriesZonesOptionsObject[] = [];

            if (ascMs.length === 0) {
                // Always offline
                points.push({ x: startTime, y: index, color: 'red', name: deviceName, custom: { status: 'offline' } });
                points.push({ x: now, y: index, color: 'red', name: deviceName, custom: { status: 'offline' } });
                zones.push({ value: now, color: 'red' });
            } else {
                // Check start gap
                const firstTime = Date.parse(ascMs[0].timestamp);
                if (firstTime > startTime + OFFLINE_THRESHOLD_MS) {
                    // Offline from start to first measurement
                    points.push({ x: startTime, y: index, color: 'red', name: deviceName, custom: { status: 'offline' } });
                    points.push({ x: firstTime - 1000, y: index, color: 'red', name: deviceName, custom: { status: 'offline' } });
                    zones.push({ value: firstTime, color: 'red' });
                } else {
                     // Assume red before first measurement if it started late, or just start zones
                     zones.push({ value: firstTime, color: 'red' });
                }

                for (let i = 0; i < ascMs.length; i++) {
                    const current = ascMs[i];
                    const currentTime = Date.parse(current.timestamp);

                    // Add green point for the measurement
                    points.push({
                        x: currentTime,
                        y: index,
                        color: 'green',
                        name: deviceName,
                        custom: { status: 'online', measurement: current }
                    });

                    // Check gap to next
                    if (i < ascMs.length - 1) {
                        const nextTime = Date.parse(ascMs[i+1].timestamp);
                        if (nextTime - currentTime > OFFLINE_THRESHOLD_MS) {
                            // Gap detected
                            const offlineStart = currentTime + UPDATE_INTERVAL_MS;
                            const offlineEnd = nextTime;

                            points.push({
                                x: offlineStart,
                                y: index,
                                color: 'red',
                                name: deviceName,
                                custom: { status: 'offline' }
                            });
                            points.push({
                                x: offlineEnd - 1000,
                                y: index,
                                color: 'red',
                                name: deviceName,
                                custom: { status: 'offline' }
                            });

                            zones.push({ value: offlineStart, color: 'green' });
                            zones.push({ value: offlineEnd, color: 'red' });
                        }
                    } else {
                        // Last point, check gap to now
                        if (now - currentTime > OFFLINE_THRESHOLD_MS) {
                             const offlineStart = currentTime + UPDATE_INTERVAL_MS;
                             points.push({
                                x: offlineStart,
                                y: index,
                                color: 'red',
                                name: deviceName,
                                custom: { status: 'offline' }
                            });
                             points.push({
                                x: now,
                                y: index,
                                color: 'red',
                                name: deviceName,
                                custom: { status: 'offline' }
                            });

                            zones.push({ value: offlineStart, color: 'green' });
                            zones.push({ value: now, color: 'red' });
                        } else {
                            zones.push({ value: now, color: 'green' });
                        }
                    }
                }
            }

            return {
                name: deviceName,
                type: 'line',
                data: points,
                lineWidth: 5,
                connectNulls: false,
                marker: {
                    symbol: 'square',
                    radius: 4
                },
                zoneAxis: 'x',
                zones: zones,
                tooltip: {
                    pointFormat: '<b>{point.name}</b><br/>Status: {point.custom.status}<br/>Time: {point.x:%Y-%m-%d %H:%M:%S}'
                }
            } as Highcharts.SeriesLineOptions;
        });

        // Get unique device names for Y axis
        const deviceNames = Object.keys(deviceData);
        const chartHeight = Math.max(600, deviceNames.length * 50);

        return {
            chart: {
                height: chartHeight,
                type: 'line'
            },
            title: {
                text: 'Device Connectivity Timegraph (Last 3 Days)'
            },
            xAxis: {
                type: 'datetime',
                title: { text: 'Time' },
                min: startTime,
                max: now
            },
            yAxis: {
                categories: deviceNames,
                title: { text: 'Devices' },
                reversed: true,
                min: 0,
                max: deviceNames.length > 0 ? deviceNames.length - 1 : 0,
                tickInterval: 1
            },
            legend: {
                enabled: true
            },
            plotOptions: {
                line: {
                    lineWidth: 5,
                    marker: {
                        radius: 5
                    }
                }
            },
            series: series
        } as Highcharts.Options;
    }, [measurements, devices]);

    return (
        <div style={{ padding: '20px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <h2>Dashboard</h2>
            <div style={{ flex: 1, overflow: 'auto' }}>
                <HighchartsReact
                    highcharts={Highcharts}
                    options={chartOptions}
                />
            </div>
        </div>
    );
}
