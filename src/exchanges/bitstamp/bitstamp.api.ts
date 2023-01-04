import axios from "axios";
import { resPipe } from "../common/utils";

const baseUrl = 'https://www.bitstamp.net' + '/api/v2/';
export const getAllMarkets = async () => {
    const url = baseUrl + 'trading-pairs-info';
    const response = axios.get(url);
    return resPipe(response);
};
