import * as WebSocket from 'ws';
import { IManager, IMarket } from '../common/types';
import { handleResError } from '../common/utils';
import { exchangeInfo } from './binance.api';

const baseUrlSocket = 'wss://stream.binance.com:9443' + '/ws/' + '';
// Maker/Taker 0.001;
export class BinanceManager implements IManager {
    private _allMarkets: IMarket[]  = [];
    private ws: WebSocket;
    public name: string;

    constructor() {
        this.name = 'Binance';
        this.handlePrices();
    }

    get allMarkets() {
        return this._allMarkets;
    }

    private async handlePrices() {
        const url = baseUrlSocket + '!ticker@arr';
        this.ws = new WebSocket(url);
        this.ws.onopen = () => console.log(`${this.name} Manager: Started Market-Prices-Handler`);
        this.ws.onclose = () => console.log(`${this.name} Manager: Stopped Market-Prices-Handler`);
        this.ws.onerror = ({ message }) => console.log(`${this.name} Manager: Error: ${message}`);
        this.ws.onmessage = ({ data }) => this.onMessage(data);

        const reconnectTime = 12 * 60 * 60 * 1000;
        setTimeout(() => this.socketReconnect(), reconnectTime);
    }

    private socketReconnect() {
        this.ws.close();
        this.handlePrices();
    }

    private onMessage(data: WebSocket.Data) {
        try {
            const dataArray: any[] = JSON.parse(data as string);
            dataArray.forEach((d) => {
                const symbol = d['s'];
                const price = parseFloat(d['c']);
                const existingSymbol = this.allMarkets.find(e => e.symbol === symbol);
                existingSymbol
                    ? existingSymbol.price = price
                    : this.allMarkets.push({ symbol, price });
            });
        } catch (error) {
            console.log(error.message);
        }
    }

    async getExchangeInfo() {
        const eiRes = await exchangeInfo();
        if (eiRes.error || !eiRes.data?.symbols) return handleResError(eiRes, 'getExchangeInfo:exchangeInfo');
        const allMarkets = eiRes.data.symbols
            .map(({ baseAsset, quoteAsset }) => ({ baseAsset, quoteAsset })) as { baseAsset: string, quoteAsset: string }[];
            
        // console.log({allMarkets});
        const twoMarkets: { baseAsset: string, quoteAsset: string }[][] = [];
        const tripleMarket: { baseAsset: string, quoteAsset: string, price?: number }[][] = [];

        allMarkets.forEach(m => {
            const elseMarkets = allMarkets.filter(m2 => m2 !== m);
            elseMarkets.forEach(m2 => {
                const v1 = [m.baseAsset, m.quoteAsset].some(a => [m2.baseAsset, m2.quoteAsset].includes(a));
                if (v1) twoMarkets.push([m, m2]);
            });
        });
        twoMarkets.forEach(m3 => {
            const else2Markets = allMarkets.filter(e => !m3.some(m => m === e));
            else2Markets.forEach(m4 => {
                const [ firstmarket, secondMarket ] = m3;
                if (firstmarket.baseAsset === secondMarket.baseAsset) {
                    const v1 = m4.baseAsset === firstmarket.quoteAsset && m4.quoteAsset === secondMarket.quoteAsset;
                    const v2 =  m4.baseAsset === secondMarket.quoteAsset && m4.quoteAsset === firstmarket.quoteAsset;
                    if (v1 || v2) tripleMarket.push([...m3, m4]);
                }

                if (firstmarket.quoteAsset === secondMarket.quoteAsset) {
                    const v1 = m4.baseAsset === firstmarket.baseAsset && m4.quoteAsset === secondMarket.baseAsset;
                    const v2 =  m4.baseAsset === secondMarket.baseAsset && m4.quoteAsset === firstmarket.baseAsset;
                    if (v1 || v2) tripleMarket.push([...m3, m4]);
                }
            });
        });

        setInterval(() => {
            tripleMarket.forEach(f => {
                f.forEach(m => {
                    const symbol = `${m.baseAsset}${m.quoteAsset}`;
                    const existPrice = this.allMarkets.find(e => e.symbol === symbol);
                    if (existPrice) m.price = existPrice.price;
                });
            });
            const withPrice = tripleMarket.filter(f => f.every(e => e.price));
            const fullTrinagleObjArray = withPrice.map(markets => {
                const triangle: { asset: string, amount: number }[] = [];
                markets.forEach(market => {
                    [market.baseAsset, market.quoteAsset]
                        .forEach(a => !triangle.find(({asset}) => asset === a) ? triangle.push({asset: a, amount: 0}) : null)
                });
                return { markets, triangle };
            });
            const triangleBaseAsset = 'USDT';
            const onlyUSDTTriangles = fullTrinagleObjArray.filter(e => e.triangle.find(t => t.asset === triangleBaseAsset));
            const hahArr = [];
            onlyUSDTTriangles.forEach(triangleObj => {
                const variants = triangleObj.markets.filter(m => [m.quoteAsset, m.baseAsset].includes(triangleBaseAsset));
                variants.forEach((firstMarket, index) => {
                    // console.log(`Variant: ${index + 1}`);
                    const baseTriangle: {
                        asset: string;
                        amount: number;
                    }[] = JSON.parse(JSON.stringify(triangleObj.triangle));
                    const initAmount = 1;
                    baseTriangle.find(e => e.asset === triangleBaseAsset).amount = initAmount;
                    // console.log(baseTriangle);

                    const isFirstReversed = firstMarket.baseAsset === triangleBaseAsset;
                    const firstAmount = isFirstReversed
                        ? firstMarket.price * initAmount
                        : parseFloat(((1 / firstMarket.price) * initAmount).toFixed(10));
                    const firstStepMessage = isFirstReversed
                        ? `Sell ${initAmount} ${firstMarket.baseAsset} for ${firstAmount} ${firstMarket.quoteAsset}`
                        : `Buy ${firstAmount} ${firstMarket.baseAsset} for ${initAmount} ${firstMarket.quoteAsset}`
                    // console.log(`Step 1: ${firstStepMessage}`);
                    baseTriangle.find(e => e.asset === triangleBaseAsset).amount = 0;
                    baseTriangle.find(e => isFirstReversed ? e.asset === firstMarket.quoteAsset : e.asset === firstMarket.baseAsset).amount = firstAmount;
                    // console.log(baseTriangle);

                    const secondMarket = triangleObj.markets
                        .filter(m => m !== firstMarket)
                        .find(m => [m.baseAsset, m.quoteAsset].includes(isFirstReversed ? firstMarket.quoteAsset : firstMarket.baseAsset))
                    const existing = baseTriangle.find(e => e.amount);
                    const isSecondReversed = secondMarket.baseAsset === existing.asset;

                    const secondAmount = isSecondReversed
                        ? secondMarket.price * existing.amount
                        : parseFloat(((1 / secondMarket.price) * existing.amount).toFixed(10));

                    const secondStepMessage = isFirstReversed
                        ? `Sell ${existing.amount} ${secondMarket.baseAsset} for ${secondAmount} ${secondMarket.quoteAsset}`
                        : `Buy ${secondAmount} ${secondMarket.baseAsset} for ${existing.amount} ${secondMarket.quoteAsset}`
                    //  console.log(`Step 2: ${secondStepMessage}`);
                     baseTriangle.find(e => isSecondReversed ? e.asset === secondMarket.baseAsset : e.asset === secondMarket.quoteAsset).amount = 0;
                     baseTriangle.find(e => isSecondReversed ? e.asset === secondMarket.quoteAsset : e.asset === secondMarket.baseAsset).amount = secondAmount;

                    //  console.log(baseTriangle);

                     const thirdMarket = triangleObj.markets
                        .find((m) => m !== firstMarket && m !== secondMarket);
                    const existing2 = baseTriangle.find(e => e.amount);
                    const isThirdReversed = thirdMarket.baseAsset === existing2.asset;

                    const thirdAmount = isThirdReversed
                        ? thirdMarket.price * existing2.amount
                        : parseFloat(((1 / thirdMarket.price) * existing2.amount).toFixed(10));

                    const thirdStepMessage = isFirstReversed
                        ? `Sell ${existing2.amount} ${thirdMarket.baseAsset} for ${thirdAmount} ${thirdMarket.quoteAsset}`
                        : `Buy ${thirdAmount} ${thirdMarket.quoteAsset} for ${existing2.amount} ${thirdMarket.baseAsset}`
                    //  console.log(`Step 3: ${thirdStepMessage}`);
                     baseTriangle.find(e => isThirdReversed ? e.asset === thirdMarket.baseAsset : e.asset === thirdMarket.quoteAsset).amount = 0;
                     baseTriangle.find(e => isThirdReversed ? e.asset === thirdMarket.quoteAsset : e.asset === thirdMarket.baseAsset).amount = thirdAmount;

                    if (Math.abs(1 - thirdAmount) > 0.035) hahArr.push({ ...triangleObj, disc: Math.abs(1 - thirdAmount) });
                });
            });
            const arr = hahArr.sort((a,b) => b.disc - a.disc).slice(0, 3);
            console.log(JSON.stringify(arr, null, 4));
        }, 1000);
    }
}