import axios from "axios";
import { resPipe } from "../common/utils";

const baseUrl = 'https://socket-v3.bittrex.com';

export const getConnectionData = () => {
    const url = baseUrl + '/signalr/negotiate';
    const connectionData = JSON.stringify([{ name: "c3" }]);
    const params = { connectionData };
    const response = axios.get(url, { params });
    return resPipe(response);
};
