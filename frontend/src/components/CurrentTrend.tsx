import React, { useState, useEffect } from 'react';
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import { Card, Col, Row, Skeleton, Statistic, Typography } from 'antd';
import { DefaultApi } from "../generated";
import { Gauge } from '@mui/x-charts/Gauge';
import { apiClient as api } from "../apiClient";
const { Text } = Typography;

// --- Dynamic Date Calculation Helper Functions ---
const getMondayOfWeek = (date: Date): Date => {
    const d = new Date(date);
    const dayOfWeek = d.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
};

const getEndOfDay = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
};

// --- Helper: safely coerce any value to a number or null ---
const toNumberOrNull = (value: unknown): number | null => {
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : null;
};

// --- Helper function to calculate development and determine arrow ---
interface DevelopmentResult {
    development: number | null;
    arrow: React.ReactNode | null;
    color: string;
}

const calculateDevelopment = (current: number | null, previous: number | null): DevelopmentResult => {
    let development: number | null = null;
    let arrow: React.ReactNode | null = null;
    let color: string = 'inherit';

    if (previous !== null && current !== null) {
        if (previous === 0) {
            development = current > 0 ? 100 : 0;
        } else {
            development = ((current - previous) / previous) * 100;
        }

        if (development > 0) {
            arrow = <ArrowUpOutlined />;
            color = '#3f8600';
        } else if (development < 0) {
            arrow = <ArrowDownOutlined />;
            color = '#cf1322';
        } else {
            arrow = null;
            color = 'rgba(0, 0, 0, 0.45)';
        }
    }
    return { development, arrow, color };
};

const CurrentTrend: React.FC = () => {
    // State for Temperature
    const [thisWeekTemp, setThisWeekTemp] = useState<number | null>(null);
    const [tempDevelopmentData, setTempDevelopmentData] = useState<DevelopmentResult>({ development: null, arrow: null, color: 'inherit' });

    // State for Humidity
    const [thisWeekHumidity, setThisWeekHumidity] = useState<number | null>(null);
    const [humidityDevelopmentData, setHumidityDevelopmentData] = useState<DevelopmentResult>({ development: null, arrow: null, color: 'inherit' });

    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const fetchAllData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const today = new Date();

            // Calculate Date Ranges
            const thisWeekStartTime = getMondayOfWeek(today);
            const thisWeekEndTime = getEndOfDay(today);

            const lastWeekMonday = new Date(thisWeekStartTime);
            lastWeekMonday.setDate(thisWeekStartTime.getDate() - 7);
            const lastWeekSunday = new Date(thisWeekStartTime);
            lastWeekSunday.setDate(thisWeekStartTime.getDate() - 1);

            const lastWeekStartTime = getMondayOfWeek(lastWeekMonday);
            const lastWeekEndTime = getEndOfDay(lastWeekSunday);

            // --- Fetch Temperature Data ---
            const currentWeekAvgTempRaw = await api.getAvgTemperatureInTimeRange({
                startTime: thisWeekStartTime.toISOString(),
                endTime: thisWeekEndTime.toISOString()
            });
            const previousWeekAvgTempRaw = await api.getAvgTemperatureInTimeRange({
                startTime: lastWeekStartTime.toISOString(),
                endTime: lastWeekEndTime.toISOString()
            });

            const currentWeekAvgTemp = toNumberOrNull(currentWeekAvgTempRaw);
            const previousWeekAvgTemp = toNumberOrNull(previousWeekAvgTempRaw);

            setThisWeekTemp(currentWeekAvgTemp);

            // --- Fetch Humidity Data ---
            const currentWeekAvgHumidityRaw = await api.getAvgHumidityInTimeRange({
                startTime: thisWeekStartTime.toISOString(),
                endTime: thisWeekEndTime.toISOString()
            });
            const previousWeekAvgHumidityRaw = await api.getAvgHumidityInTimeRange({
                startTime: lastWeekStartTime.toISOString(),
                endTime: lastWeekEndTime.toISOString()
            });

            const currentWeekAvgHumidity = toNumberOrNull(currentWeekAvgHumidityRaw);
            const previousWeekAvgHumidity = toNumberOrNull(previousWeekAvgHumidityRaw);

            setThisWeekHumidity(currentWeekAvgHumidity);

            // --- Calculate Development for both ---
            setTempDevelopmentData(calculateDevelopment(currentWeekAvgTemp, previousWeekAvgTemp));
            setHumidityDevelopmentData(calculateDevelopment(currentWeekAvgHumidity, previousWeekAvgHumidity));

        } catch (err) {
            console.error("Failed to fetch environmental data:", err);
            setError("Failed to load environmental data.");
        } finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        fetchAllData();
    }, []);

    if (error) {
        return <p style={{ color: 'red' }}>Error: {error}</p>;
    }

    // --- Temperature Card Display Values ---
    const displayCurrentTemp = thisWeekTemp !== null ? Number(thisWeekTemp.toFixed(2)) : undefined;
    const displayTempDevelopment = tempDevelopmentData.development !== null ? Number(tempDevelopmentData.development.toFixed(2)) : undefined;

    // --- Humidity Card Display Values ---
    const displayCurrentHumidity = thisWeekHumidity !== null ? Number(thisWeekHumidity.toFixed(2)) : undefined;
    const displayHumidityDevelopment = humidityDevelopmentData.development !== null ? Number(humidityDevelopmentData.development.toFixed(2)) : undefined;
    return (
        <Row gutter={16}>
            {/* Temperature Card */}
            <Col span={12}>
                <Card variant="borderless" title="Temperatur Übersicht">
                    <Statistic
                        title="Durschnittliche Temperatur Diese Woche"
                        value={displayCurrentTemp}
                        precision={1}
                        suffix="°C"
                    />
                    <div style={{ marginTop: 16 }}>
                        <Text type="secondary" style={{ fontSize: '14px' }}>
                            Veränderung vs. Letzte Woche: {' '}
                        </Text>
                        {isLoading ? (
                            <Skeleton.Input style={{ width: 100 }} active size="small" />
                        ) : (
                            <Text style={{ color: tempDevelopmentData.color, fontSize: '16px', fontWeight: 'bold' }}>
                                {tempDevelopmentData.arrow} {displayTempDevelopment !== undefined ? `${displayTempDevelopment}%` : 'N/A'}
                            </Text>
                        )}
                    </div>
                </Card>
            </Col>

            {/* Humidity Card */}
            <Col span={12}>
                <Card variant="borderless" title="Luftfeuchtigkeit Übersicht">
                    <Statistic
                        title="Durschnittliche Luftfeuchtigkeit Diese Woche"
                        value={displayCurrentHumidity}
                        precision={1}
                        suffix="%"
                    />
                    <div style={{ marginTop: 16 }}>
                        <Text type="secondary" style={{ fontSize: '14px' }}>
                            Veränderung vs. Letzte Woche: {' '}
                        </Text>
                        {isLoading ? (
                            <Skeleton.Input style={{ width: 100 }} active size="small" />
                        ) : (
                            <Text style={{ color: humidityDevelopmentData.color, fontSize: '16px', fontWeight: 'bold' }}>
                                {humidityDevelopmentData.arrow} {displayHumidityDevelopment !== undefined ? `${displayHumidityDevelopment}%` : 'N/A'}
                            </Text>
                        )}
                    </div>
                </Card>
            </Col>
        </Row>
    );
};

export default CurrentTrend;