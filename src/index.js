import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import TickerApp from './App';
import registerServiceWorker from './registerServiceWorker';


ReactDOM.render(
    <TickerApp />,
    document.getElementById('app')
);
registerServiceWorker();
