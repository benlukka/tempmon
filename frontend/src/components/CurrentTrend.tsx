import React, { useState, useEffect } from 'react';
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import { Card, Col, Row, Statistic, Typography } from 'antd'; // Import Typography for styling
import { DefaultApi } from "../generated";

const api = new DefaultApi();
const { Text } = Typography; // Destructure Text for colored text

// --- Dynamic Date Calculation Helper Functions ---
const getMondayOfWeek = (date: Date): Date => {
    const d = new Date(date);
    const dayOfWeek = d.getDay(); // Sunday is 0, Monday is 1, ..., Saturday is 6
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Days to subtract to get to Monday
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0); // Set to start of the day
    return d;
};

const getEndOfDay = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999); // Set to end of the day (milliseconds for completeness)
    return d;
};

// --- Helper function to calculate development and determine arrow ---
interface DevelopmentResult {
    development: number | null;
    arrow: React.ReactNode | null;
    color: string; // Add color for styling the trend text
}

const calculateDevelopment = (current: number | null, previous: number | null): DevelopmentResult => {
    let development: number | null = null;
    let arrow: React.ReactNode | null = null;
    let color: string = 'inherit'; // Default color

    if (previous !== null && current !== null) {
        if (previous === 0) {
            // Handle division by zero: if previous was 0 and current is >0, it's a 100% (or infinite) increase
            development = current > 0 ? 100 : 0;
        } else {
            development = ((current - previous) / previous) * 100;
        }

        if (development > 0) {
            arrow = <ArrowUpOutlined />;
            color = '#3f8600'; // Green for positive
        } else if (development < 0) {
            arrow = <ArrowDownOutlined />;
            color = '#cf1322'; // Red for negative
        } else {
            arrow = null; // No change
            color = 'rgba(0, 0, 0, 0.45)'; // Ant Design default grey for no change
        }
    }
    return { development, arrow, color };
};


const CurrentTrend: React.FC = () => {
    // State for Temperature
    const [thisWeekTemp, setThisWeekTemp] = useState<number | null>(null);
    const [lastWeekTemp, setLastWeekTemp] = useState<number | null>(null);
    const [tempDevelopmentData, setTempDevelopmentData] = useState<DevelopmentResult>({ development: null, arrow: null, color: 'inherit' });

    // State for Humidity
    const [thisWeekHumidity, setThisWeekHumidity] = useState<number | null>(null);
    const [lastWeekHumidity, setLastWeekHumidity] = useState<number | null>(null);
    const [humidityDevelopmentData, setHumidityDevelopmentData] = useState<DevelopmentResult>({ development: null, arrow: null, color: 'inherit' });

    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
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
                const currentWeekAvgTemp: number = await api.getAvgTemperatureInTimeRange({
                    startTime: thisWeekStartTime.toISOString(),
                    endTime: thisWeekEndTime.toISOString()
                });
                setThisWeekTemp(currentWeekAvgTemp);

                const previousWeekAvgTemp = await api.getAvgTemperatureInTimeRange({
                    startTime: lastWeekStartTime.toISOString(),
                    endTime: lastWeekEndTime.toISOString()
                });
                setLastWeekTemp(previousWeekAvgTemp);

                // --- Fetch Humidity Data ---
                const currentWeekAvgHumidity: number = await api.getAvgHumidityInTimeRange({
                    startTime: thisWeekStartTime.toISOString(),
                    endTime: thisWeekEndTime.toISOString()
                });
                setThisWeekHumidity(currentWeekAvgHumidity);

                const previousWeekAvgHumidity = await api.getAvgHumidityInTimeRange({
                    startTime: lastWeekStartTime.toISOString(),
                    endTime: lastWeekEndTime.toISOString()
                });
                setLastWeekHumidity(previousWeekAvgHumidity);

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

        fetchAllData();
    }, []); // Empty dependency array means this effect runs once after the initial render

    if (isLoading) {
        return <p>Loading environmental trends...</p>;
    }

    if (error) {
        return <p style={{ color: 'red' }}>Error: {error}</p>;
    }

    // --- Temperature Card Display Values ---
    const displayCurrentTemp = thisWeekTemp !== null ? thisWeekTemp.toFixed(2) : "N/A";
    const displayTempDevelopment = tempDevelopmentData.development !== null ? tempDevelopmentData.development.toFixed(2) : "N/A";

    // --- Humidity Card Display Values ---
    const displayCurrentHumidity = thisWeekHumidity !== null ? thisWeekHumidity.toFixed(2) : "N/A";
    const displayHumidityDevelopment = humidityDevelopmentData.development !== null ? humidityDevelopmentData.development.toFixed(2) : "N/A";


    return (
        <Row gutter={16}>
            {/* Temperature Card */}
            <Col span={12}>
                <Card variant="borderless" title="Temperatur Übersicht">
                    <Statistic
                        title="Durschnittliche Temperatur Diese Woche"
                        value={displayCurrentTemp}
                        precision={0}
                        suffix="°C"
                    />
                    <div style={{ marginTop: 16 }}> {/* Add some space */}
                        <Text type="secondary" style={{ fontSize: '14px' }}>
                            Veränderung vs. Letzte Woche: {' '}
                        </Text>
                        <Text style={{ color: tempDevelopmentData.color, fontSize: '16px', fontWeight: 'bold' }}>
                            {tempDevelopmentData.arrow} {displayTempDevelopment}%
                        </Text>
                    </div>
                </Card>
            </Col>

            {/* Humidity Card */}
            <Col span={12}>
                <Card variant="borderless" title="Luftfeuchtigkeit Übersicht">
                    <Statistic
                        title="Durschnittliche Luftfeuchtigkeit Diese Woche"
                        value={displayCurrentHumidity}
                    precision={0}
                    suffix="%"
                    />
                    <div style={{ marginTop: 16 }}> {/* Add some space */}
                        <Text type="secondary" style={{ fontSize: '14px' }}>
                            Veränderung vs. Letzte Woche: {' '}
                        </Text>
                        <Text style={{ color: humidityDevelopmentData.color, fontSize: '16px', fontWeight: 'bold' }}>
                            {humidityDevelopmentData.arrow} {displayHumidityDevelopment}%
                        </Text>
                    </div>
                </Card>
            </Col>
        </Row>
    );
};

export default CurrentTrend;