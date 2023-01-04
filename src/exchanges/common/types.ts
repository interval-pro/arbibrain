export interface IApiRes {
    data?: any;
    error?: string;
    status: number;
}

export interface IManager {
    allMarkets: any[];
    name: string;
}


export interface IMarket {
    price: number;
    symbol: string;
}