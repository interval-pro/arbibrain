import { BinanceManager } from "./exchanges/binance/binance.manager";
import { BittrexManager } from "./exchanges/bittrex/bittrex.manager";
import { BitStampManager } from "./exchanges/bitstamp/bitstamp.manager";

// https://binance-docs.github.io/apidocs


const start = async () => {
    const binanceManager = new BinanceManager();
    const bittrexManager = new BittrexManager();
    const bitstampManager = new BitStampManager();
    setInterval(() => {
        const m1 = binanceManager.allMarkets;
        const m2 = bittrexManager.allMarkets;
        const m3 = bitstampManager.allMarkets;
        const filtered = m1
            .filter(i => m2.map(q => q.symbol).includes(i.symbol))
            .filter(i => m3.map(q => q.symbol).includes(i.symbol))
            .map(i => {
                const newObj: any = { ...i };
                newObj.price2 = m2.find(z => z.symbol === i.symbol).price;
                newObj.price3 = m3.find(z => z.symbol === i.symbol).price;
                return newObj;
            })
        console.log(`Matched: ${filtered.length}, Binance: ${m1.length}, Bittrex: ${m2.length}, Bitstamp: ${m3.length}`);
    }, 1000);
};

start();
