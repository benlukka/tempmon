import {Card} from "antd";
import Icon from "./Icon";
import "../index.css";
interface RoomComponentProps {
    roomName: string;
    temperature: number;
    humidity: number;
}

export default function RoomComponent({roomName, temperature, humidity}: RoomComponentProps) {
    return (
        <div>
            <Card>
                {roomName}
                <br/>
                <p className={"Room-info"}>
                    <Icon className={""}>
                        thermometer
                    </Icon>
                    Temperature: {temperature}°C
                </p>
                <Icon className={""}>
                    water_drop
                </Icon>
                  Humidity: {humidity}%
            </Card>
        </div>
    )
}