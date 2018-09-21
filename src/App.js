import React, {Component} from 'react';
// import { https } from './lib/httpGetAsync';
import exchanges from './lib/exchange';
import markets from './lib/market';
import assets from './lib/asset';
import './App.css';

function findById(array, value) {
    if (!value) {
        return null;
    }
    for (let i = 0; i < array.length; i++) {
        if (array[i].id === value) {
            return array[i];
        }
    }
    return null;
}

const marketDictionary = {};

class Toolbar extends Component {
    constructor(props) {
        super(props);
        this.state = {exchangeValue: {}, marketValue: {}};
    }

    handleMarketSelection = (event) => {
        this.setState({exchangeValue: this.state.exchangeValue, marketValue: marketDictionary[event.target.value]});
    };

    handleExchangeSelection = (event) => {
        this.setState({exchangeValue: findById(exchanges.content, event.target.value), marketValue: {}});
    };

    handleSubmit = () => {
        this.props.addTicker(this.state);
    };

    getMarkets() {
        return this.exchangeMarkets(this.state.exchangeValue)
            .filter(m => !!m && m.marketStatus === 'ACTIVE')
            .map(m => findById(markets.content, m.marketId))
            .filter(m => !!m)
            .map(m => {
                if (marketDictionary[m.id]) {
                    return marketDictionary[m.id];
                }
                const baseAsset = findById(assets.content, m.baseAssetId);
                const quoteAsset = findById(assets.content, m.quoteAssetId);
                if (!baseAsset || !quoteAsset) {
                    return null;
                }
                marketDictionary[m.id] = {
                    id: m.id,
                    name: `${baseAsset.name} # ${quoteAsset.name}`,
                    symbol: `${baseAsset.symbol}/${quoteAsset.symbol}`
                };
                return marketDictionary[m.id];
            })
            .filter(m => !!m).sort((a, b) => a.symbol.localeCompare(b.symbol));
    }

    exchangeMarkets(exchange) {
        return (exchange && exchange.markets) || [];
    }

    render() {
        return (
            <div className='toolbar'>
                <label>Select exchange: </label>
                <select name="select-exchange" onChange={this.handleExchangeSelection}>
                    {exchanges.content.sort((a, b) => a.name.localeCompare(b.name)).map(exchange => {
                        return (<option key={exchange.id}
                                        value={exchange.id}>{exchange.name} ({exchange.markets ? exchange.markets.length : 0} markets)</option>);
                    })}
                </select>
                <label>Select market: </label>
                <select name="select-market" onChange={this.handleMarketSelection}>
                    {this.getMarkets().map(market => {
                        return (<option key={market.id} value={market.id}>{market.symbol} ({market.name})</option>);
                    })}
                </select>
                <button className='toolbar__button' onClick={this.handleSubmit}>Add</button>
            </div>
        );
    }
}

class Tile extends Component {
    constructor(props) {
        super(props);
        this.lastClass = 'tile__fluctuation';
        this.prev = 0;
        this.state = {last: '0', volume: '0', bid: '0', ask: '0'};
    }

    componentDidMount() {
        this.props.ws.addEventListener('message', e => {
            const parse = JSON.parse(e.data);
            if (parse.event === 'TICK' && parse.exchangeId === this.props.ticker.exchangeValue.id && parse.marketId === this.props.ticker.marketValue.id) {
                this.setState(parse)
            }
        });
        this.props.ws.send(JSON.stringify(this.buildSubscription()));
    }

    buildSubscription() {
        return {
            event: 'SUBSCRIBE_TICKER',
            exchangeId: this.props.ticker.exchangeValue.id,
            marketId: this.props.ticker.marketValue.id
        };
    }

    getFluctuationClassName() {
        if (this.state.last === this.prev) {
            return this.lastClass;
        }
        if (this.state.last < this.prev) {
            this.prev = this.state.last;
            return 'tile__fluctuation tile__fluctuation--down';
        }
        this.prev = this.state.last;
        return 'tile__fluctuation';
    }

    render() {
        const absoluteFluctuation = this.state.last - this.prev;

        return (
            <div className='tile'>
                <h1 className='tile__currency-pair-label'>{this.props.exchange} {this.props.currencyPair}</h1>
                <div className={this.getFluctuationClassName()}>{absoluteFluctuation.toFixed(2)}</div>

                <div className='tile__box tile__box--buy'>
                    <h2 className='tile__direction-label'>BID</h2>
                    <span className='tile__price-P1'>{this.state.bid.substring(0, 5)}</span>
                    <span className='tile__price-P2'>{this.state.bid.substring(5, 7)}</span>
                    <span className='tile__price-P3'>{this.state.bid.substring(7, 8)}</span>
                </div>

                <div className='tile__box tile__box--sell'>
                    <h2 className='tile__direction-label'>ASK</h2>
                    <span className='tile__price-P1'>{this.state.ask.substring(0, 5)}</span>
                    <span className='tile__price-P2'>{this.state.ask.substring(5, 7)}</span>
                    <span className='tile__price-P3'>{this.state.ask.substring(7, 8)}</span>
                </div>
            </div>
        );
    }
}

class TickerList extends Component {

    constructor(props) {
        super(props);
        this.ws = new WebSocket('wss://ws.bravenewcoin.com');
        this.ws.addEventListener('open', e => {
            this.ws.send(JSON.stringify({event: 'PING'}));
        });
        this.ws.addEventListener('message', e => {
            console.log('Received:', e);
            this.setState(JSON.parse(e.data))
        });
    }

    render() {
        return (
            <div className='ticker-list'>
                {
                    this.props.data.map(ticker => {
                        return (
                            <Tile key={ticker.exchangeValue.name + ticker.marketValue.symbol}
                                  exchange={ticker.exchangeValue.name} currencyPair={ticker.marketValue.symbol}
                                  ticker={ticker}
                                  ws={this.ws}
                            />);
                    })
                }
            </div>
        );
    }
}

class TickerApp extends Component {

    constructor(props) {
        super(props);
        this.state = {predicates: []};
    }

    handleAddTicker = (ticker) => {
        if (ticker) {
            const newCurrencyPairs = this.state.predicates.concat(ticker);
            this.setState({predicates: newCurrencyPairs});
        }
    };

    render() {
        return (
            <div className='container'>
                <h1>BNC real time tickers</h1>
                <Toolbar addTicker={this.handleAddTicker}/>
                <TickerList data={this.state.predicates}/>
            </div>
        );
    }
}

export default TickerApp;
