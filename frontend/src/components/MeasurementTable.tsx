import React, {useCallback, useEffect, useState} from "react";
import {DefaultApi, Measurement, MeasurmentsWithCount} from "../generated";
import {Card, Table} from 'antd';
import type {TableProps, TablePaginationConfig} from 'antd';

const api = new DefaultApi();


const MeasurementTable: React.FC = () => {
    const [loading, setLoading] = useState<boolean>(false);
    const [data, setData] = useState<Measurement[]>([]);
    const [pagination, setPagination] = useState<TablePaginationConfig>({
        current: 1,
        pageSize: 10,
        total: 0,
    });

    const fetchMeasurements = useCallback((page: number, pageSize: number) => {
        setLoading(true);
        const offset = (page - 1) * pageSize;

        api.getAllMeasurements({offset, limit: pageSize})
            .then((response: MeasurmentsWithCount) => {
                setData(response.measurements);
                setPagination(prev => ({
                    ...prev,
                    total: response.count,
                }));
            })
            .catch((err) => {
                console.error("Failed to load measurements", err);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        fetchMeasurements(pagination.current!, pagination.pageSize!);
    }, [fetchMeasurements, pagination.current, pagination.pageSize]);

    const handleTableChange = (newPagination: TablePaginationConfig) => {
        setPagination(newPagination);
    };

    const columns: TableProps<Measurement>['columns'] = [
        {
            title: 'Raum',
            dataIndex: 'deviceName',
            key: 'deviceName',
        },
        {
            title: 'Zeitstempel',
            dataIndex: 'timestamp',
            key: 'timestamp',
            render: (text: string) => {
                const date = new Date(text);
                return date.toLocaleString('de-DE', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                });
            },
        },
        {
            title: 'Temperatur',
            dataIndex: 'temperature',
            key: 'temperature',
            render: (temp: number) => `${temp.toFixed(1)}°C`,
        },
        {
            title: 'Luftfeuchtigkeit',
            dataIndex: 'humidity',
            key: 'humidity',
            render: (humidity: number) => `${humidity.toFixed(1)}%`,
        }
    ];

    return (
        <Card>
            <Table<Measurement>
                columns={columns}
                dataSource={data}
                loading={loading}
                pagination={pagination}
                onChange={handleTableChange}
                rowKey="id"
            />
        </Card>
    );
};

export default MeasurementTable;