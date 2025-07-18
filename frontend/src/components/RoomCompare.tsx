import React, { useState, useEffect, useRef } from "react";
import { Select, Button, Card, Checkbox, Space, Typography, Spin, message, Row, Col, Statistic } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined, ThunderboltOutlined, DashboardOutlined } from "@ant-design/icons";
import type { DefaultOptionType } from "antd/lib/select";
import * as d3 from "d3";
import { DefaultApi, Device, Measurement } from "../generated";
import "../styles/RoomCompare.css";

const { Title, Text } = Typography;
const api = new DefaultApi();

interface SelectedRoomInfo {
    value: string | number;
    label: React.ReactNode;
}

interface ChartData {
    roomA: Measurement | null;
    roomB: Measurement | null;
}

const RoomCompare: React.FC = () => {
    const [loading, setLoading] = useState<boolean>(false);
    const [chartLoading, setChartLoading] = useState<boolean>(false);
    const [options, setOptions] = useState<DefaultOptionType[]>([]);
    const [selectedRoomA, setSelectedRoomA] = useState<SelectedRoomInfo | undefined>(undefined);
    const [selectedRoomB, setSelectedRoomB] = useState<SelectedRoomInfo | undefined>(undefined);
    const [chartData, setChartData] = useState<ChartData>({ roomA: null, roomB: null });
    const [showTemperature, setShowTemperature] = useState<boolean>(true);
    const [showHumidity, setShowHumidity] = useState<boolean>(true);
    const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        setLoading(true);
        api.getAllDevices()
            .then((devices: Device[]) => {
                const opts: DefaultOptionType[] = devices.map((d) => ({
                    label: d.name,
                    value: d.macAddress,
                }));
                setOptions(opts);
            })
            .catch((err) => {
                console.error("Failed to load devices", err);
                message.error("Fehler beim Laden der Geräte");
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    const getOptionLabel = (value: string | number): React.ReactNode | undefined => {
        const selectedOption = options.find(option => option.value === value);
        return selectedOption?.label;
    };

    const onChangeSelectA = (value: string | number) => {
        const label = getOptionLabel(value);
        setSelectedRoomA(label ? { value, label } : undefined);
    };

    const onChangeSelectB = (value: string | number) => {
        const label = getOptionLabel(value);
        setSelectedRoomB(label ? { value, label } : undefined);
    };

    const fetchMeasurements = async () => {
        if (!selectedRoomA || !selectedRoomB) {
            message.warning("Bitte wähle zwei Räume zum Vergleichen aus.");
            return;
        }

        setChartLoading(true);
        try {
            const measurements = await api.getLatestMeasurementsByDevice();

            const roomAMeasurement = measurements.find(m => m.macAddress === selectedRoomA.value);
            const roomBMeasurement = measurements.find(m => m.macAddress === selectedRoomB.value);

            setChartData({
                roomA: roomAMeasurement || null,
                roomB: roomBMeasurement || null
            });

            if (!roomAMeasurement || !roomBMeasurement) {
                message.warning("Keine Messdaten für einen oder beide Räume gefunden.");
            }
        } catch (error) {
            console.error("Failed to fetch measurements", error);
            message.error("Fehler beim Laden der Messdaten");
        } finally {
            setChartLoading(false);
        }
    };

    const handleCompareClick = () => {
        fetchMeasurements();
    };

    useEffect(() => {
        if (chartData.roomA && chartData.roomB && svgRef.current) {
            if (chartType === 'bar') {
                drawBarChart();
            } else {
                drawLineChart();
            }
        }
    }, [chartData, showTemperature, showHumidity, chartType]);

    const drawBarChart = () => {
        if (!svgRef.current || !chartData.roomA || !chartData.roomB) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const margin = { top: 40, right: 80, bottom: 80, left: 80 };
        const width = 800 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Prepare data
        const data = [
            {
                room: selectedRoomA?.label as string,
                temperature: chartData.roomA.temperature || 0,
                humidity: chartData.roomA.humidity || 0,
                color: "#1890ff"
            },
            {
                room: selectedRoomB?.label as string,
                temperature: chartData.roomB.temperature || 0,
                humidity: chartData.roomB.humidity || 0,
                color: "#52c41a"
            }
        ];

        // Create scales
        const xScale = d3.scaleBand()
            .domain(data.map(d => d.room))
            .range([0, width])
            .padding(0.3);

        const tempScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.temperature)! * 1.1])
            .range([height, 0]);

        const humidityScale = d3.scaleLinear()
            .domain([0, 100])
            .range([height, 0]);

        // Create axes
        const xAxis = d3.axisBottom(xScale);
        const tempAxis = d3.axisLeft(tempScale);
        const humidityAxis = d3.axisRight(humidityScale);

        // Add axes
        g.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(xAxis)
            .selectAll("text")
            .style("font-size", "12px")
            .style("font-weight", "500")
            .style("fill", "#262626");

        if (showTemperature) {
            g.append("g")
                .call(tempAxis)
                .selectAll("text")
                .style("font-size", "11px")
                .style("fill", "#1890ff");
        }

        if (showHumidity) {
            g.append("g")
                .attr("transform", `translate(${width},0)`)
                .call(humidityAxis)
                .selectAll("text")
                .style("font-size", "11px")
                .style("fill", "#52c41a");
        }

        // Add axis labels
        if (showTemperature) {
            g.append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", 0 - margin.left)
                .attr("x", 0 - (height / 2))
                .attr("dy", "1em")
                .style("text-anchor", "middle")
                .style("font-size", "12px")
                .style("font-weight", "500")
                .style("fill", "#1890ff")
                .text("Temperatur (°C)");
        }

        if (showHumidity) {
            g.append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", width + margin.right)
                .attr("x", 0 - (height / 2))
                .attr("dy", "-1em")
                .style("text-anchor", "middle")
                .style("font-size", "12px")
                .style("font-weight", "500")
                .style("fill", "#52c41a")
                .text("Luftfeuchtigkeit (%)");
        }

        // Add temperature bars
        if (showTemperature) {
            g.selectAll(".temp-bar")
                .data(data)
                .enter().append("rect")
                .attr("class", "temp-bar")
                .attr("x", d => xScale(d.room)!)
                .attr("width", xScale.bandwidth() / 2)
                .attr("y", d => tempScale(d.temperature))
                .attr("height", d => height - tempScale(d.temperature))
                .attr("fill", "#1890ff")
                .attr("opacity", 0.8)
                .attr("rx", 4)
                .on("mouseover", function(event, d) {
                    d3.select(this).attr("opacity", 1);
                })
                .on("mouseout", function() {
                    d3.select(this).attr("opacity", 0.8);
                });

            // Add temperature value labels
            g.selectAll(".temp-label")
                .data(data)
                .enter().append("text")
                .attr("class", "temp-label")
                .attr("x", d => xScale(d.room)! + xScale.bandwidth() / 4)
                .attr("y", d => tempScale(d.temperature) - 5)
                .attr("text-anchor", "middle")
                .style("font-size", "11px")
                .style("font-weight", "500")
                .style("fill", "#1890ff")
                .text(d => `${d.temperature.toFixed(1)}°C`);
        }

        // Add humidity bars
        if (showHumidity) {
            g.selectAll(".humidity-bar")
                .data(data)
                .enter().append("rect")
                .attr("class", "humidity-bar")
                .attr("x", d => xScale(d.room)! + xScale.bandwidth() / 2)
                .attr("width", xScale.bandwidth() / 2)
                .attr("y", d => humidityScale(d.humidity))
                .attr("height", d => height - humidityScale(d.humidity))
                .attr("fill", "#52c41a")
                .attr("opacity", 0.8)
                .attr("rx", 4)
                .on("mouseover", function(event, d) {
                    d3.select(this).attr("opacity", 1);
                })
                .on("mouseout", function() {
                    d3.select(this).attr("opacity", 0.8);
                });

            // Add humidity value labels
            g.selectAll(".humidity-label")
                .data(data)
                .enter().append("text")
                .attr("class", "humidity-label")
                .attr("x", d => xScale(d.room)! + (3 * xScale.bandwidth() / 4))
                .attr("y", d => humidityScale(d.humidity) - 5)
                .attr("text-anchor", "middle")
                .style("font-size", "11px")
                .style("font-weight", "500")
                .style("fill", "#52c41a")
                .text(d => `${d.humidity.toFixed(1)}%`);
        }

        addChartTitleAndLegend(g, width);
    };

    const drawLineChart = () => {
        if (!svgRef.current || !chartData.roomA || !chartData.roomB) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const margin = { top: 40, right: 80, bottom: 80, left: 80 };
        const width = 800 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Prepare data for line chart
        const data = [
            {
                room: selectedRoomA?.label as string,
                temperature: chartData.roomA.temperature || 0,
                humidity: chartData.roomA.humidity || 0,
                x: 0
            },
            {
                room: selectedRoomB?.label as string,
                temperature: chartData.roomB.temperature || 0,
                humidity: chartData.roomB.humidity || 0,
                x: 1
            }
        ];

        // Create scales
        const xScale = d3.scaleLinear()
            .domain([0, 1])
            .range([100, width - 100]);

        const tempScale = d3.scaleLinear()
            .domain([d3.min(data, d => d.temperature)! - 2, d3.max(data, d => d.temperature)! + 2])
            .range([height, 0]);

        const humidityScale = d3.scaleLinear()
            .domain([d3.min(data, d => d.humidity)! - 5, d3.max(data, d => d.humidity)! + 5])
            .range([height, 0]);

        // Create axes
        const xAxis = d3.axisBottom(xScale)
            .tickFormat((d, i) => data[i]?.room || "");

        const tempAxis = d3.axisLeft(tempScale);
        const humidityAxis = d3.axisRight(humidityScale);

        // Add axes
        g.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(xAxis)
            .selectAll("text")
            .style("font-size", "12px")
            .style("font-weight", "500")
            .style("fill", "#262626");

        if (showTemperature) {
            g.append("g")
                .call(tempAxis)
                .selectAll("text")
                .style("font-size", "11px")
                .style("fill", "#1890ff");
        }

        if (showHumidity) {
            g.append("g")
                .attr("transform", `translate(${width},0)`)
                .call(humidityAxis)
                .selectAll("text")
                .style("font-size", "11px")
                .style("fill", "#52c41a");
        }

        // Add axis labels
        if (showTemperature) {
            g.append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", 0 - margin.left)
                .attr("x", 0 - (height / 2))
                .attr("dy", "1em")
                .style("text-anchor", "middle")
                .style("font-size", "12px")
                .style("font-weight", "500")
                .style("fill", "#1890ff")
                .text("Temperatur (°C)");
        }

        if (showHumidity) {
            g.append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", width + margin.right)
                .attr("x", 0 - (height / 2))
                .attr("dy", "-1em")
                .style("text-anchor", "middle")
                .style("font-size", "12px")
                .style("font-weight", "500")
                .style("fill", "#52c41a")
                .text("Luftfeuchtigkeit (%)");
        }

        // Create line generators
        const tempLine = d3.line<typeof data[0]>()
            .x(d => xScale(d.x))
            .y(d => tempScale(d.temperature))
            .curve(d3.curveMonotoneX);

        const humidityLine = d3.line<typeof data[0]>()
            .x(d => xScale(d.x))
            .y(d => humidityScale(d.humidity))
            .curve(d3.curveMonotoneX);

        // Add temperature line
        if (showTemperature) {
            g.append("path")
                .datum(data)
                .attr("class", "temp-line")
                .attr("fill", "none")
                .attr("stroke", "#1890ff")
                .attr("stroke-width", 3)
                .attr("d", tempLine);

            // Add temperature points
            g.selectAll(".temp-point")
                .data(data)
                .enter().append("circle")
                .attr("class", "temp-point")
                .attr("cx", d => xScale(d.x))
                .attr("cy", d => tempScale(d.temperature))
                .attr("r", 6)
                .attr("fill", "#1890ff")
                .attr("stroke", "#fff")
                .attr("stroke-width", 2);

            // Add temperature value labels
            g.selectAll(".temp-value")
                .data(data)
                .enter().append("text")
                .attr("class", "temp-value")
                .attr("x", d => xScale(d.x))
                .attr("y", d => tempScale(d.temperature) - 15)
                .attr("text-anchor", "middle")
                .style("font-size", "12px")
                .style("font-weight", "600")
                .style("fill", "#1890ff")
                .text(d => `${d.temperature.toFixed(1)}°C`);
        }

        // Add humidity line
        if (showHumidity) {
            g.append("path")
                .datum(data)
                .attr("class", "humidity-line")
                .attr("fill", "none")
                .attr("stroke", "#52c41a")
                .attr("stroke-width", 3)
                .attr("d", humidityLine);

            // Add humidity points
            g.selectAll(".humidity-point")
                .data(data)
                .enter().append("circle")
                .attr("class", "humidity-point")
                .attr("cx", d => xScale(d.x))
                .attr("cy", d => humidityScale(d.humidity))
                .attr("r", 6)
                .attr("fill", "#52c41a")
                .attr("stroke", "#fff")
                .attr("stroke-width", 2);

            // Add humidity value labels
            g.selectAll(".humidity-value")
                .data(data)
                .enter().append("text")
                .attr("class", "humidity-value")
                .attr("x", d => xScale(d.x))
                .attr("y", d => humidityScale(d.humidity) + 25)
                .attr("text-anchor", "middle")
                .style("font-size", "12px")
                .style("font-weight", "600")
                .style("fill", "#52c41a")
                .text(d => `${d.humidity.toFixed(1)}%`);
        }

        addChartTitleAndLegend(g, width);
    };

    const addChartTitleAndLegend = (g: any, width: number) => {
        // Add chart title
        g.append("text")
            .attr("x", width / 2)
            .attr("y", -20)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "600")
            .style("fill", "#262626")
            .text(`Raumvergleich - ${chartType === 'bar' ? 'Balkendiagramm' : 'Liniendiagramm'}`);

        // Add legend
        const legend = g.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${width - 150}, 20)`);

        if (showTemperature) {
            legend.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", 12)
                .attr("height", 12)
                .attr("fill", "#1890ff")
                .attr("rx", 2);

            legend.append("text")
                .attr("x", 18)
                .attr("y", 9)
                .style("font-size", "12px")
                .style("fill", "#262626")
                .text("Temperatur");
        }

        if (showHumidity) {
            legend.append("rect")
                .attr("x", 0)
                .attr("y", showTemperature ? 20 : 0)
                .attr("width", 12)
                .attr("height", 12)
                .attr("fill", "#52c41a")
                .attr("rx", 2);

            legend.append("text")
                .attr("x", 18)
                .attr("y", showTemperature ? 29 : 9)
                .style("font-size", "12px")
                .style("fill", "#262626")
                .text("Luftfeuchtigkeit");
        }
    };

    const getTemperatureDifference = () => {
        if (!chartData.roomA || !chartData.roomB) return 0;
        return (chartData.roomA.temperature || 0) - (chartData.roomB.temperature || 0);
    };

    const getHumidityDifference = () => {
        if (!chartData.roomA || !chartData.roomB) return 0;
        return (chartData.roomA.humidity || 0) - (chartData.roomB.humidity || 0);
    };

    return (
        <div>
            <Card className="dashboard-container">
                <Space direction="vertical" size="large" style={{ width: "100%" }}>
                    <Title level={3}>Raumvergleich</Title>

                    <Space size="large" wrap>
                        <div>
                            <Text strong>Raum A:</Text>
                            <Select
                                showSearch
                                id="room-selectA"
                                size="middle"
                                placeholder="Wähle einen Raum"
                                optionFilterProp="label"
                                onChange={onChangeSelectA}
                                loading={loading}
                                options={options}
                                value={selectedRoomA?.value}
                                style={{ width: 200, marginLeft: 8 }}
                            />
                        </div>

                        <div>
                            <Text strong>Raum B:</Text>
                            <Select
                                showSearch
                                id="room-selectB"
                                size="middle"
                                placeholder="Wähle einen Raum"
                                optionFilterProp="label"
                                onChange={onChangeSelectB}
                                loading={loading}
                                options={options}
                                value={selectedRoomB?.value}
                                style={{ width: 200, marginLeft: 8 }}
                            />
                        </div>

                        <Button
                            type="primary"
                            onClick={handleCompareClick}
                            loading={chartLoading}
                            disabled={!selectedRoomA || !selectedRoomB}
                        >
                            Vergleichen
                        </Button>
                    </Space>

                    <Space size="large" wrap>
                        <Checkbox
                            checked={showTemperature}
                            onChange={(e) => setShowTemperature(e.target.checked)}
                        >
                            Temperatur anzeigen
                        </Checkbox>
                        <Checkbox
                            checked={showHumidity}
                            onChange={(e) => setShowHumidity(e.target.checked)}
                        >
                            Luftfeuchtigkeit anzeigen
                        </Checkbox>
                        <Space>
                            <Text strong>Diagramm-Typ:</Text>
                            <Button.Group>
                                <Button
                                    type={chartType === 'bar' ? 'primary' : 'default'}
                                    onClick={() => setChartType('bar')}
                                    icon={<DashboardOutlined />}
                                >
                                    Balken
                                </Button>
                                <Button
                                    type={chartType === 'line' ? 'primary' : 'default'}
                                    onClick={() => setChartType('line')}
                                    icon={<ThunderboltOutlined />}
                                >
                                    Linie
                                </Button>
                            </Button.Group>
                        </Space>
                    </Space>

                    {chartLoading && (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <Spin size="large" />
                            <div style={{ marginTop: 16 }}>
                                <Text>Lade Messdaten...</Text>
                            </div>
                        </div>
                    )}

                    {chartData.roomA && chartData.roomB && !chartLoading && (
                        <>
                            {/* Statistics Cards */}
                            <Row gutter={[16, 16]}>
                                <Col xs={24} sm={12} md={6}>
                                    <Card>
                                        <Statistic
                                            title={`${selectedRoomA?.label} - Temperatur`}
                                            value={chartData.roomA.temperature || 0}
                                            precision={1}
                                            valueStyle={{ color: '#1890ff' }}
                                            prefix={<ThunderboltOutlined />}
                                            suffix="°C"
                                        />
                                    </Card>
                                </Col>
                                <Col xs={24} sm={12} md={6}>
                                    <Card>
                                        <Statistic
                                            title={`${selectedRoomB?.label} - Temperatur`}
                                            value={chartData.roomB.temperature || 0}
                                            precision={1}
                                            valueStyle={{ color: '#1890ff' }}
                                            prefix={<ThunderboltOutlined />}
                                            suffix="°C"
                                        />
                                    </Card>
                                </Col>
                                <Col xs={24} sm={12} md={6}>
                                    <Card>
                                        <Statistic
                                            title={`${selectedRoomA?.label} - Luftfeuchtigkeit`}
                                            value={chartData.roomA.humidity || 0}
                                            precision={1}
                                            valueStyle={{ color: '#52c41a' }}
                                            prefix={<DashboardOutlined />}
                                            suffix="%"
                                        />
                                    </Card>
                                </Col>
                                <Col xs={24} sm={12} md={6}>
                                    <Card>
                                        <Statistic
                                            title={`${selectedRoomB?.label} - Luftfeuchtigkeit`}
                                            value={chartData.roomB.humidity || 0}
                                            precision={1}
                                            valueStyle={{ color: '#52c41a' }}
                                            prefix={<DashboardOutlined />}
                                            suffix="%"
                                        />
                                    </Card>
                                </Col>
                            </Row>

                            {/* Comparison Statistics */}
                            <Row gutter={[16, 16]}>
                                <Col xs={24} sm={12}>
                                    <Card>
                                        <Statistic
                                            title="Temperatur-Unterschied"
                                            value={Math.abs(getTemperatureDifference())}
                                            precision={1}
                                            valueStyle={{
                                                color: getTemperatureDifference() > 0 ? '#3f8600' : '#cf1322'
                                            }}
                                            prefix={
                                                getTemperatureDifference() > 0 ?
                                                    <ArrowUpOutlined /> :
                                                    <ArrowDownOutlined />
                                            }
                                            suffix="°C"
                                        />
                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                            {getTemperatureDifference() > 0 ?
                                                `${selectedRoomA?.label} ist wärmer` :
                                                `${selectedRoomB?.label} ist wärmer`}
                                        </Text>
                                    </Card>
                                </Col>
                                <Col xs={24} sm={12}>
                                    <Card>
                                        <Statistic
                                            title="Luftfeuchtigkeit-Unterschied"
                                            value={Math.abs(getHumidityDifference())}
                                            precision={1}
                                            valueStyle={{
                                                color: getHumidityDifference() > 0 ? '#3f8600' : '#cf1322'
                                            }}
                                            prefix={
                                                getHumidityDifference() > 0 ?
                                                    <ArrowUpOutlined /> :
                                                    <ArrowDownOutlined />
                                            }
                                            suffix="%"
                                        />
                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                            {getHumidityDifference() > 0 ?
                                                `${selectedRoomA?.label} ist feuchter` :
                                                `${selectedRoomB?.label} ist feuchter`}
                                        </Text>
                                    </Card>
                                </Col>
                            </Row>

                            {/* Chart */}
                            <Card style={{ marginTop: 20 }}>
                                <div style={{ textAlign: 'center' }}>
                                    <svg
                                        ref={svgRef}
                                        width={800}
                                        height={400}
                                        style={{
                                            border: '1px solid #f0f0f0',
                                            borderRadius: '6px',
                                            background: '#fafafa'
                                        }}
                                    />
                                </div>
                            </Card>
                        </>
                    )}
                </Space>
            </Card>
        </div>
    );
};

export default RoomCompare;