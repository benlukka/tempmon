// src/components/Dashboard.tsx
import React, { } from 'react';
import RoomCompare from "./RoomCompare";
import MeasurementTable from "./MeasurementTable";
import CurrentTrend from "./CurrentTrend";
import "../styles/Dashboard.css"
const Dashboard: React.FC = () => {
    return (
        <div className="dashboard">
            <CurrentTrend/>
            <RoomCompare/>
            <MeasurementTable/>
        </div>
    );
};

export default Dashboard;