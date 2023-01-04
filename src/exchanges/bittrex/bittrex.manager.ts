import { getConnectionData } from "./bittrex.api";
import { handleResError } from "../common/utils";
import * as zlib from 'zlib';
import * as WebSocket from 'ws';
import { IManager, IMarket } from "../common/types";

const baseUrlSocket = 'wss://socket-v3.bittrex.com/signalr';
export class BittrexManager implements IManager {
    private _allMarkets: IMarket[]  = [];
    private ws: WebSocket;
    public name: string;

    constructor() {
        this.name = 'Bittrex';
        this.handlePrices();
    }

    get allMarkets() {
        return this._allMarkets;
    }

    private async handlePrices() {
        const cdRes = await getConnectionData();
        if (cdRes.error || !cdRes.data ) return handleResError(cdRes, 'handlePrices:getConnectionData');
        const { ConnectionToken, ConnectionId } = cdRes.data;
        if (!ConnectionToken || !ConnectionId) return handleResError(cdRes, 'handlePrices:getConnectionData');
        const token = encodeURIComponent(ConnectionToken);

        const url = baseUrlSocket + '/connect?transport=webSockets&connectionToken=' + token;
        this.ws = new WebSocket(url);
        this.ws.onopen = () => {
            const stringData = JSON.stringify({ H: "c3", M: "Subscribe", A: [["tickers"]], I: 1 });
            this.ws.send(stringData);
            console.log(`${this.name} Manager: Started Market-Prices-Handler`);
        }
        this.ws.onclose = () => console.log(`${this.name} Manager: Stopped Market-Prices-Handler`);
        this.ws.onerror = ({ message }) => console.log(`${this.name} Manager: Error: ${message}`);
        this.ws.onmessage = ({ data }) => this.onMessage(data);
    }

    private onMessage(data: WebSocket.Data) {
        try {
            const objData: any = JSON.parse(data as any);
            const { R, M } = objData;
            if (R) return;
            if (M?.length) {
                M.forEach((m: any) => {
                    const mA = m?.['A']?.[0];
                    if (!mA) return;
                    const buf = Buffer.from(mA, 'base64');
                    const r = zlib.inflateRawSync(buf);
                    const jsonData = JSON.parse(r.toString('utf8'));
                    const deltas = jsonData.deltas;
                    deltas.forEach((d: any) => {
                        const symbol = d['symbol']?.replace('-', '');
                        const price = parseFloat(d['lastTradeRate']);
                        const existingSymbol = this.allMarkets.find(e => e.symbol === symbol);
                        existingSymbol
                            ? existingSymbol.price = price
                            : this.allMarkets.push({ symbol, price });
                    });
                })
            }
        } catch (error) {
            console.log(error.message);
        }
    }
}