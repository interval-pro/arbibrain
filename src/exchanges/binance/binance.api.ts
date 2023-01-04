import axios, { AxiosResponse } from "axios"
import { resPipe } from "../common/utils";

const baseUrl = 'https://api.binance.com' + '/api/v3/';
export const testConnectivity = async () => {
    const url = baseUrl + 'ping';
    const response = axios.get(url);
    return resPipe(response);
};

export const exchangeInfo = async () => {
    const url = baseUrl + 'exchangeInfo';
    const response = axios.get(url);
    return resPipe(response);
};
