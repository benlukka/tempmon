import React, { useState, useEffect } from "react"
import {
    Select,
    Button,
    Card,
    Checkbox,
    Space,
    Typography,
    Spin,
    message,
    Row,
    Col,
    Statistic,
    DatePicker
} from "antd"
import {
    ArrowUpOutlined,
    ArrowDownOutlined,
    ThunderboltOutlined,
    DashboardOutlined,
    HistoryOutlined
} from "@ant-design/icons"
import type { DefaultOptionType } from "antd/lib/select"
import dayjs, { Dayjs } from "dayjs"

import { Room, Measurement } from "../generated"
import LineChartCompare, { ChartMetric } from "./LineChartCompare"
import { apiClient as api } from "../apiClient"

const { Title, Text } = Typography
const { RangePicker } = DatePicker

export interface SelectedRoomInfo {
    value: string
    label: React.ReactNode
    macAddress: string
}

interface LatestData {
    roomA: Measurement | null
    roomB: Measurement | null
}

interface HistoricData {
    roomA: Measurement[]
    roomB: Measurement[]
}

const RoomCompare = () => {
    const [loading, setLoading] = useState<boolean>(false)
    const [latestLoading, setLatestLoading] = useState<boolean>(false)
    const [historicLoading, setHistoricLoading] = useState<boolean>(false)
    const [rooms, setRooms] = useState<Room[]>([])
    const [options, setOptions] = useState<DefaultOptionType[]>([])
    const [selectedRoomA, setSelectedRoomA] = useState<SelectedRoomInfo | undefined>(undefined)
    const [selectedRoomB, setSelectedRoomB] = useState<SelectedRoomInfo | undefined>(undefined)
    const [latestData, setLatestData] = useState<LatestData>({ roomA: null, roomB: null })
    const [historicData, setHistoricData] = useState<HistoricData>({ roomA: [], roomB: [] })
    const [filteredHistoricData, setFilteredHistoricData] = useState<HistoricData>({ roomA: [], roomB: [] })
    const [showTemperature, setShowTemperature] = useState<boolean>(true)
    const [showHumidity, setShowHumidity] = useState<boolean>(false)
    const [timeRange, setTimeRange] = useState<[Dayjs, Dayjs] | null>([
        dayjs().subtract(1, "day"),
        dayjs()
    ])

    useEffect(() => {
        setLoading(true)
        api.getAllRooms()
            .then((fetchedRooms: Room[]) => {
                setRooms(fetchedRooms)
                const opts: DefaultOptionType[] = fetchedRooms.map(r => ({
                    label: r.name,
                    value: r.name
                }))
                setOptions(opts)
                if (fetchedRooms.length >= 2) {
                    const roomA = fetchedRooms[0]
                    const roomB = fetchedRooms[1]
                    setSelectedRoomA({
                        value: roomA.name,
                        label: roomA.name,
                        macAddress: roomA.devices[0].macAddress
                    })
                    setSelectedRoomB({
                        value: roomB.name,
                        label: roomB.name,
                        macAddress: roomB.devices[0].macAddress
                    })
                }
            })
            .catch(err => {
                console.error("Failed to load rooms", err)
                message.error("Fehler beim Laden der Räume")
            })
            .finally(() => {
                setLoading(false)
            })
    }, [])

    const getRoomByValue = (roomName: string): Room | undefined => {
        return rooms.find(r => r.name === roomName)
    }

    const onChangeSelectA = (value: string) => {
        const room = getRoomByValue(value)
        if (room) {
            setSelectedRoomA({
                value: room.name,
                label: room.name,
                macAddress: room.devices[0].macAddress
            })
        }
    }

    const onChangeSelectB = (value: string) => {
        const room = getRoomByValue(value)
        if (room) {
            setSelectedRoomB({
                value: room.name,
                label: room.name,
                macAddress: room.devices[0].macAddress
            })
        }
    }

    const fetchLatestMeasurements = async () => {
        if (!selectedRoomA || !selectedRoomB) {
            message.warning("Bitte wähle zwei Räume zum Vergleichen aus")
            return
        }

        setLatestLoading(true)
        try {
            const measurements = await api.getLatestMeasurementsByDevice()
            const roomAMeasurement = measurements.find(
                m => m.macAddress === selectedRoomA.macAddress
            )
            const roomBMeasurement = measurements.find(
                m => m.macAddress === selectedRoomB.macAddress
            )
            setLatestData({
                roomA: roomAMeasurement || null,
                roomB: roomBMeasurement || null
            })
            if (!roomAMeasurement || !roomBMeasurement) {
                message.warning("Keine aktuellen Messdaten für einen oder beide Räume gefunden")
            }
        } catch (error) {
            console.error("Failed to fetch latest measurements", error)
            message.error("Fehler beim Laden der aktuellen Messdaten")
        } finally {
            setLatestLoading(false)
        }
    }

    const fetchHistoricData = async () => {
        if (!selectedRoomA || !selectedRoomB || !timeRange) {
            message.warning("Bitte wähle zwei Räume und einen Zeitbereich aus")
            return
        }

        setHistoricLoading(true)
        try {
            const [historicMeasurementsA, historicMeasurementsB] = await Promise.all([
                api.getMeasurementsForRoom({ room: selectedRoomA.value }),
                api.getMeasurementsForRoom({ room: selectedRoomB.value })
            ])
            setHistoricData({
                roomA: historicMeasurementsA || [],
                roomB: historicMeasurementsB || []
            })
            if (historicMeasurementsA.length === 0 && historicMeasurementsB.length === 0) {
                message.warning("Keine historischen Daten für beide Räume gefunden")
            }
        } catch (error) {
            console.error("Failed to fetch historic measurements", error)
            message.error("Fehler beim Laden der historischen Daten")
        } finally {
            setHistoricLoading(false)
        }
    }

    useEffect(() => {
        if (!timeRange) {
            setFilteredHistoricData({ roomA: [], roomB: [] })
            return
        }
        const [start, end] = timeRange
        const filterData = (data: Measurement[]) =>
            data.filter(item => {
                const itemTime = dayjs(item.timestamp)
                return itemTime.isAfter(start) && itemTime.isBefore(end)
            })

        setFilteredHistoricData({
            roomA: filterData(historicData.roomA),
            roomB: filterData(historicData.roomB)
        })
    }, [historicData, timeRange])

    const getTemperatureDifference = (): number => {
        if (!latestData.roomA?.temperature || !latestData.roomB?.temperature) return 0
        return latestData.roomA.temperature - latestData.roomB.temperature
    }

    const getHumidityDifference = (): number => {
        if (!latestData.roomA?.humidity || !latestData.roomB?.humidity) return 0
        return latestData.roomA.humidity - latestData.roomB.humidity
    }

    const allHistoricData = [
        ...filteredHistoricData.roomA.map(d => ({ ...d, device: selectedRoomA?.label as string })),
        ...filteredHistoricData.roomB.map(d => ({ ...d, device: selectedRoomB?.label as string }))
    ]
    const selectedDeviceNames = [selectedRoomA?.label as string, selectedRoomB?.label as string].filter(Boolean)

    const chartMetrics: ChartMetric[] = []
    if (showTemperature) {
        chartMetrics.push({
            key: "temperature",
            name: "Temperatur",
            colors: ["#1890ff", "#00c49f"],
            unit: "°C"
        })
    }
    if (showHumidity) {
        chartMetrics.push({
            key: "humidity",
            name: "Luftfeuchtigkeit",
            colors: ["#ff7300", "#ffc658"],
            unit: "%"
        })
    }

    return (
        <div>
            <Card className="dashboard-container">
                <Space direction="vertical" size="large" style={{ width: "100%" }}>
                    <Title level={3}>Raumvergleich</Title>
                    <Space size="large" wrap>
                        <Select
                            showSearch
                            placeholder="Raum A wählen"
                            optionFilterProp="label"
                            onChange={onChangeSelectA}
                            loading={loading}
                            options={options}
                            value={selectedRoomA?.value}
                            style={{ width: 200 }}
                        />
                        <Select
                            showSearch
                            placeholder="Raum B wählen"
                            optionFilterProp="label"
                            onChange={onChangeSelectB}
                            loading={loading}
                            options={options}
                            value={selectedRoomB?.value}
                            style={{ width: 200 }}
                        />
                        <Button
                            type="primary"
                            onClick={fetchLatestMeasurements}
                            loading={latestLoading}
                            disabled={!selectedRoomA || !selectedRoomB}
                        >
                            Aktuelle Werte vergleichen
                        </Button>
                    </Space>

                    {latestLoading && (
                        <div style={{ textAlign: "center", padding: "40px" }}>
                            <Spin size="large" />
                            <div style={{ marginTop: 16 }}>
                                <Text>Lade aktuelle Messdaten...</Text>
                            </div>
                        </div>
                    )}

                    {latestData.roomA && latestData.roomB && !latestLoading && (
                        <>
                            <Row gutter={[16, 16]}>
                                <Col xs={24} sm={12} md={6}>
                                    <Card>
                                        <Statistic
                                            title={`${selectedRoomA?.label} - Temperatur`}
                                            value={latestData.roomA.temperature || 0}
                                            precision={1}
                                            valueStyle={{ color: "#1890ff" }}
                                            prefix={<ThunderboltOutlined />}
                                            suffix="°C"
                                        />
                                    </Card>
                                </Col>
                                <Col xs={24} sm={12} md={6}>
                                    <Card>
                                        <Statistic
                                            title={`${selectedRoomB?.label} - Temperatur`}
                                            value={latestData.roomB.temperature || 0}
                                            precision={1}
                                            valueStyle={{ color: "#1890ff" }}
                                            prefix={<ThunderboltOutlined />}
                                            suffix="°C"
                                        />
                                    </Card>
                                </Col>
                                <Col xs={24} sm={12} md={6}>
                                    <Card>
                                        <Statistic
                                            title={`${selectedRoomA?.label} - Luftfeuchtigkeit`}
                                            value={latestData.roomA.humidity || 0}
                                            precision={1}
                                            valueStyle={{ color: "#52c41a" }}
                                            prefix={<DashboardOutlined />}
                                            suffix="%"
                                        />
                                    </Card>
                                </Col>
                                <Col xs={24} sm={12} md={6}>
                                    <Card>
                                        <Statistic
                                            title={`${selectedRoomB?.label} - Luftfeuchtigkeit`}
                                            value={latestData.roomB.humidity || 0}
                                            precision={1}
                                            valueStyle={{ color: "#52c41a" }}
                                            prefix={<DashboardOutlined />}
                                            suffix="%"
                                        />
                                    </Card>
                                </Col>
                            </Row>

                            <Row gutter={[16, 16]}>
                                <Col xs={24} sm={12}>
                                    <Card>
                                        <Statistic
                                            title="Temperatur-Unterschied"
                                            value={Math.abs(getTemperatureDifference())}
                                            precision={1}
                                            valueStyle={{ color: getTemperatureDifference() >= 0 ? "#3f8600" : "#cf1322" }}
                                            prefix={getTemperatureDifference() >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                                            suffix="°C"
                                        />
                                        <Text type="secondary" style={{ fontSize: "12px" }}>
                                            {getTemperatureDifference() >= 0 ? `${selectedRoomA?.label} ist wärmer/gleich` : `${selectedRoomB?.label} ist wärmer`}
                                        </Text>
                                    </Card>
                                </Col>
                                <Col xs={24} sm={12}>
                                    <Card>
                                        <Statistic
                                            title="Luftfeuchtigkeit-Unterschied"
                                            value={Math.abs(getHumidityDifference())}
                                            precision={1}
                                            valueStyle={{ color: getHumidityDifference() >= 0 ? "#3f8600" : "#cf1322" }}
                                            prefix={getHumidityDifference() >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                                            suffix="%"
                                        />
                                        <Text type="secondary" style={{ fontSize: "12px" }}>
                                            {getHumidityDifference() >= 0 ? `${selectedRoomA?.label} ist feuchter/gleich` : `${selectedRoomB?.label} ist feuchter`}
                                        </Text>
                                    </Card>
                                </Col>
                            </Row>
                        </>
                    )}

                    <Title level={4} style={{ marginTop: 40 }}>
                        Historischer Vergleich
                    </Title>
                    <Space size="large" wrap>
                        <RangePicker
                            showTime
                            value={timeRange}
                            onChange={value => setTimeRange(value as [Dayjs, Dayjs] | null)}
                        />
                        <Button
                            type="primary"
                            icon={<HistoryOutlined />}
                            onClick={fetchHistoricData}
                            loading={historicLoading}
                            disabled={!selectedRoomA || !selectedRoomB || !timeRange}
                        >
                            Historische Daten laden
                        </Button>
                    </Space>
                    <Space size="large" wrap>
                        <Checkbox
                            checked={showTemperature}
                            onChange={e => setShowTemperature(e.target.checked)}
                        >
                            Temperatur anzeigen
                        </Checkbox>
                        <Checkbox
                            checked={showHumidity}
                            onChange={e => setShowHumidity(e.target.checked)}
                        >
                            Luftfeuchtigkeit anzeigen
                        </Checkbox>
                    </Space>

                    {historicLoading && (
                        <div style={{ textAlign: "center", padding: "40px" }}>
                            <Spin size="large" />
                            <div style={{ marginTop: 16 }}>
                                <Text>Lade historische Daten...</Text>
                            </div>
                        </div>
                    )}

                    {!historicLoading && allHistoricData.length > 0 && (
                        <LineChartCompare
                            data={allHistoricData}
                            devices={selectedDeviceNames}
                            title="Historische Messdaten"
                            metrics={chartMetrics}
                        />
                    )}

                    {!historicLoading && allHistoricData.length === 0 && historicData.roomA.length > 0 && (
                        <div style={{ marginTop: 20 }}>
                            <Text type="secondary">
                                Keine historischen Daten für diesen Zeitraum verfügbar. Versuche einen anderen Zeitraum.
                            </Text>
                        </div>
                    )}
                </Space>
            </Card>
        </div>
    )
}

export default RoomCompare