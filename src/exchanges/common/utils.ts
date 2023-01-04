import { AxiosResponse } from "axios";
import { IApiRes } from "./types";

export const handleResError = (response: IApiRes, func: string): IApiRes => {
    const error = response.error || 'Undefined Error';
    console.log(`Error ${func}: ${error}; status: ${response.status}`);
    return { ...response, error };
};

export const resPipe = async (res: Promise<AxiosResponse>): Promise<IApiRes> => {
    try {
        const { status, statusText, headers, data } = await res;
        // const usedWeight = parseFloat(headers['x-mbx-used-weight']);
        // console.log(`Used Weight: ${usedWeight}`);
        return status === 200 && statusText === "OK"
            ? { data, status }
            : { error: statusText, status };
    } catch (error) {
        return { error: error.message, status: 601 };
    }
};
