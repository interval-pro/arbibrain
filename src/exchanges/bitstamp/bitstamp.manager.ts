import { getAllMarkets } from "./bitstamp.api";
import { handleResError } from "../common/utils";
import * as WebSocket from 'ws';
import { IManager, IMarket } from "../common/types";

const baseUrlSocket = 'wss://ws.bitstamp.net';
export class BitStampManager implements IManager {
    private _allMarkets: IMarket[]  = [];
    private privateMarkets: string[];
    private ws: WebSocket;
    public name: string;

    constructor() {
        this.name = 'Bitstamp';
        this.handlePrices();
    }

    get allMarkets() {
        return this._allMarkets;
    }

    private async handlePrices() {
        const gamRes = await getAllMarkets();
        if (gamRes.error || !gamRes.data ) return handleResError(gamRes, 'handlePrices:getAllMarkets');
        const markets = gamRes.data.map((m: any) => m['name'].replace('/', '').toLowerCase());
        this.privateMarkets = markets;

        const url = baseUrlSocket;
        this.ws = new WebSocket(url);
        this.ws.onopen = () => {
            console.log(`${this.name} Manager: Started Market-Prices-Handler`);
            this.privateMarkets.forEach(m => {
                    const stringData = JSON.stringify({event: "bts:subscribe", data: { channel: `live_trades_${m}` }});
                    this.ws.send(stringData);
                });
        }
        this.ws.onclose = () => console.log(`${this.name} Manager: Stopped Market-Prices-Handler`);
        this.ws.onerror = ({ message }) => console.log(`${this.name} Manager: Error: ${message}`);
        this.ws.onmessage = ({ data }) => this.onMessage(data);
    }

    private onMessage(_data: WebSocket.Data) {
        try {
            const objData: any = JSON.parse(_data as any);
            const { data, channel } = objData;
            const { price } = data;
            if (!price) return;
            const symbol = channel.replace('live_trades_', '').toUpperCase();
            const existingSymbol = this.allMarkets.find(e => e.symbol === symbol);
            existingSymbol
                ? existingSymbol.price = price
                : this.allMarkets.push({ symbol, price });
        } catch (error) {
            console.log(error.message);
        }
    }
}