import React, { } from 'react';
import RoomCompare from "./RoomCompare";
import CurrentTrend from "./CurrentTrend";
import "../styles/Dashboard.css"
import RoomsGrid from "./RoomsGrid";

const Dashboard: React.FC = () => {
    return (
        <div className="dashboard">
            <CurrentTrend/>
            <RoomCompare/>
            <RoomsGrid/>
        </div>
    );
};

export default Dashboard;