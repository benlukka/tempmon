import { useState, useEffect } from 'react';
import { List, Box, Card, CardHeader, CardContent, Typography } from '@mui/material'; // Using MUI components for loading state
import dayjs from 'dayjs';
import {apiClient} from "../../apiClient";
import {Measurement, OtaDevice} from "../../generated";
import Icon from "../../components/Icon";
import { useTranslation } from 'react-i18next';

// Mock data and API client for demonstration purposes
// In a real application, you would use your actual apiClient and generated types.

const getWifiSignalStrength = (rssi: number) => {
    if (rssi >= -60) {
        // Strong signal, considered perfect
        return 'wifi';
    } else if (rssi >= -80) {
        // Medium signal
        return 'wifi_2_bar';
    } else {
        // Low signal
        return 'wifi_1_bar';
    }
};

export default function BeautifulTemperatureChart() {
    const { t } = useTranslation();
    const [measurements, setMeasurements] = useState<Measurement[]>();
    const [otaDevices, setOtaDevices] = useState<OtaDevice[]>();

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const endTime = dayjs().toISOString();
        const startTime = dayjs().subtract(1, "month").toISOString();

        apiClient.getMeasurementsInTimeRange({ startTime, endTime })
            .then((data) => {
                setMeasurements(data);
            })
            .catch((error) => {
                console.error("Failed to fetch measurements:", error);
            })
            .finally(() => {
                setLoading(false);
            });
        apiClient.getAllOtaDevices()
            .then((data) => {
                setOtaDevices(data);
            })
            .catch((error) => {
                console.error("Failed to fetch measurements:", error);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);
    {/*
    if (loading) {
        return (
            <Box className="w-full h-96 flex flex-col justify-center items-center text-gray-500">
                <CircularProgress />
                <Typography variant="body1" sx={{ mt: 2 }}>
                    Loading chart data...
                </Typography>
            </Box>
        );
    }

    if (!measurements!!.length) {
        return (
            <Box className="w-full h-96 flex flex-col justify-center items-center text-gray-500">
                <Typography variant="h6">No data available</Typography>
                <Typography variant="body1">Could not load temperature data for the selected range.</Typography>
            </Box>
        );
    }

    // Prepare data for MUI LineChart
    const xAxisData = measurements!!.map(m => new Date(m.timestamp));
    const temperatureData = measurements!!.map(m => m.temperature || 0);

    const hotZoneData = temperatureData.map(temp => Math.max(temp, TEMPERATURE_THRESHOLD));
    */}
    return (
        <Box className="w-full h-96 p-4 bg-white rounded-lg shadow-md">
            <svg width="0" height="0" style={{ position: 'absolute' }}>
                <defs>
                    <linearGradient id="hotGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.5}/>
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0.05}/>
                    </linearGradient>
                </defs>
            </svg>
            {/*
            <LineChart
                xAxis={[{
                    data: xAxisData,
                    scaleType: 'time',
                    valueFormatter: (date) => dayjs(date).format('MMM DD'),
                    tickLabelStyle: { fill: '#6B7280' } // Tailwind gray-500
                }]}
                yAxis={[{
                    label: 'Temperature (°C)',
                    labelStyle: { fill: '#374151' }, // Tailwind gray-700
                    tickLabelStyle: { fill: '#6B7280' }
                }]}
                series={[
                    {
                        data: hotZoneData,
                        type: 'line',
                        area: true,
                        color: 'url(#hotGradient)', // Apply the gradient to the area
                        curve: 'monotoneX',
                        showMark: false,
                        label: `Above ${TEMPERATURE_THRESHOLD}°C`,
                    },
                    {
                        data: temperatureData,
                        type: 'line',
                        color: '#3B82F6', // A nice blue color
                        curve: 'monotoneX',
                        showMark: false,
                        label: 'Temperature',
                    },
                ]}
                grid={{ horizontal: true, vertical: true }}
                margin={{ top: 20, right: 20, bottom: 30, left: 60 }}
                slotProps={{
                    tooltip: {
                        trigger: 'axis',
                    },
                }}
            /> */}
            <Box>
            {t('devices_heading')}
                <List padding={2} sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 2 }}>
                {otaDevices?.map(
                    (device) => (
                        <Card>
                            <CardHeader
                                title={device.deviceName}
                                subheader={device.ipAddress}
                                avatar={<Icon className={""}>{getWifiSignalStrength(Number(device.wifiRssi))}</Icon>}
                            />
                            <CardContent>
                                <Typography variant="body2" color="textSecondary">
                                    {t('version_label')}: {device.version}
                                    <br/>
                                    {t('board_label')}: {device.deviceBoard}
                                    <br/>
                                    {t('chip_label')}: {device.chipModel}
                                    <br/>
                                    {t('last_seen_label')}: {dayjs(device.lastSeen).format('DD.MM.YYYY HH:mm:ss')}
                                </Typography>
                            </CardContent>
                        </Card>
                ))}
                </List>
            </Box>
        </Box>
    );
}
