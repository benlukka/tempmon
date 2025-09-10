import {List} from "antd";
import RoomComponent from "../../components/RoomComponent";
export default function TestPage(){
    return(
        <div>
            <List style={{width: "300px", margin: "20px auto"}} bordered>
                {["livingroom", "bedroom", "kitchen"].map((roomName)=>
                        <RoomComponent roomName={roomName} temperature={22} humidity={60}/>
                )}
            </List>
        </div>
    )
}