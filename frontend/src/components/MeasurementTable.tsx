import React, {useCallback, useEffect, useState} from "react";
import {Measurement, MeasurmentsWithCount} from "../generated";
import {Card, Table} from 'antd';
import type {TableProps, TablePaginationConfig} from 'antd';
import { apiClient as api } from "../apiClient";
import { useTranslation } from 'react-i18next';


const MeasurementTable: React.FC = () => {
    const { t } = useTranslation();
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
            title: t('table_room'),
            dataIndex: 'deviceName',
            key: 'deviceName',
        },
        {
            title: t('table_timestamp'),
            dataIndex: 'timestamp',
            key: 'timestamp',
            render: (text: string) => {
                const date = new Date(text);
                return date.toLocaleString(undefined, {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                });
            },
        },
        {
            title: t('table_temperature'),
            dataIndex: 'temperature',
            key: 'temperature',
            render: (temp: number) => {
                const n = temp;
                return Number.isFinite(n) ? `${n.toFixed(1)}°C` : t('not_available_short');
            },
        },
        {
            title: t('table_humidity'),
            dataIndex: 'humidity',
            key: 'humidity',
            render: (humidity: number) => {
                const n = humidity;
                return Number.isFinite(n) ? `${n.toFixed(1)}%` : t('not_available_short');
            },
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