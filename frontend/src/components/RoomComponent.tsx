import {Card} from "antd";
import "../index.css";
import {useEffect, useState} from "react";
import {GetMeasurementsForRoomRequest, Measurement} from "../generated";
import {apiClient} from "../apiClient";
interface RoomComponentProps {
    roomName: string;
    temperature: number;
    humidity: number;
}
export default function RoomComponent({roomName}: RoomComponentProps) {
    const [measurments, setMeasurments] = useState<Measurement[]>()
    useEffect(() => {
        apiClient.getMeasurementsForRoom({room: "Zimmer"})
            .then((fetchedMeasurments: Measurement[]) => {
                console.log(fetchedMeasurments)
                setMeasurments(fetchedMeasurments)
            })
            .catch(err => {
                console.error("Failed to load rooms", err)
            })
    }, [])
    return (
        <div>
            <Card>
                {roomName}
                <br/>
            </Card>
        </div>
    )
}