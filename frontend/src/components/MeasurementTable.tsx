import React, {useEffect, useState} from "react";
import {DefaultApi, Measurement} from "../generated";
import {Card, Space, Table, Tag} from 'antd';
import type { TableProps } from 'antd';const api = new DefaultApi();

const MeasurementTable: React.FC = () => {
    const [loading, setLoading] = useState<boolean>(false);
    const [data, setData] = useState<Measurement[]>([]);
    useEffect(() => {
        setLoading(true);
        api.getAllMeasurements()
            .then((measurments: Measurement[]) => {
                setData(measurments);
            })
            .catch((err) => {
                console.error("Failed to load devices", err);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);
    const columns: TableProps<Measurement>['columns'] = [
        {
            title: 'Raum',
            dataIndex: 'deviceName',
            key: 'deviceName',
            render: (text) => <div>{text}</div>,
        },
        {
            title: 'Zeitstempel',
            dataIndex: 'timestamp',
            key: 'timestamp',
            render: (text) => {
                const date = new Date(text); // Create a Date object from your ISO string
                const formattedDateTime = date.toLocaleString(undefined, { // `undefined` uses default locale, or you can specify a locale like 'de-DE'
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                });
                return <div>{formattedDateTime}</div>;
            },
        },
        {
            title: 'Temperatur',
            dataIndex: 'temperature',
            key: 'temperature',
            render: (text) => <div>{text}°C</div>,
        },
        {
            title: 'Luftfeuchtigkeit',
            dataIndex: 'humidity',
            key: 'humidity',
            render: (text) => <div>{text}%</div>,
        }]
return(
    <Card>
    <div>
        <Table<Measurement> columns={columns} dataSource={data} />
    </div>
    </Card>
)
}
export default MeasurementTable;