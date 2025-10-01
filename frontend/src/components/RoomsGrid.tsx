import {useEffect, useMemo, useState} from "react";
import "./components.css"
import { Card, CardHeader, CardContent, Typography } from '@mui/material';
import dayjs from "dayjs";
import relativeTime from 'dayjs/plugin/relativeTime';
import { useTranslation } from 'react-i18next';
import {Measurement} from "../generated";
import {apiClient} from "../apiClient";
import FancyTrendGraph from "./FancyTrendGraph";

dayjs.extend(relativeTime);

type LatestMeasurementMap = Record<string, Measurement>;

export default function RoomsGrid(){
    const [measurments, setMeasurments] = useState<Measurement[]>();
    const { t } = useTranslation();
    const now = dayjs(Date.now())
    const lastWeek = now.subtract(7, 'day');

    useEffect(() => {
        apiClient.getMeasurementsInTimeRange({startTime: lastWeek.toISOString(), endTime:  now.toISOString()}).then(r =>
            setMeasurments(r))
    }, []);

    const measurementsByDevice = useMemo(() => {
        const map: Record<string, Measurement[]> = {};
        (measurments || []).forEach((m) => {
            const name = m.deviceName || "";
            if (!name) return;
            if (!map[name]) map[name] = [];
            map[name].push(m);
        });
        Object.keys(map).forEach((k) => {
            map[k].sort((a, b) => dayjs(a.timestamp).valueOf() - dayjs(b.timestamp).valueOf());
        });
        return map;
    }, [measurments]);

    const latestMeasurements = (measurments || []).reduce<LatestMeasurementMap>((acc, current) => {
        const deviceName = current.deviceName || "";
        if (!deviceName) return acc;
        const prev = acc[deviceName];
        if (!prev || dayjs(current.timestamp).isAfter(dayjs(prev.timestamp))) {
            acc[deviceName] = current;
        }
        return acc;
    }, {});

    const latestMeasurementsArray = Object.values(latestMeasurements);

    if (!measurments) {
        return <Typography>{t('loading_measurements')}</Typography>;
    }

    if (latestMeasurementsArray.length === 0) {
        return <Typography>{t('no_measurements_last_week')}</Typography>;
    }

    return(
        <div className={"rooms-page-grid"}>
            {latestMeasurementsArray.map((m) => {
                const deviceName = m.deviceName || "";
                const series = measurementsByDevice[deviceName] || [];
                const timestamps = series.map(s => dayjs(s.timestamp).format('MMM D, HH:mm'));
                const temperatures = series.map(s => (s.temperature ?? 0));
                return (
                    <Card key={m.id} sx={{ marginBottom: 2 }}>
                        <CardHeader
                            title={m.deviceName}
                            className={"card-header-rooms"}
                        />
                        <CardContent>
                            <FancyTrendGraph xAxis={timestamps} yAxis={temperatures} />
                            <Typography color="text.secondary">
                                ({dayjs(m.timestamp).fromNow()})
                            </Typography>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    )
}