import {Configuration, DefaultApi} from "./generated";
import {createContext} from "react";



const configuration = new Configuration({basePath: window.location.origin})
export const api_client = new DefaultApi(configuration)
export const ApiContext = createContext<DefaultApi>(api_client)