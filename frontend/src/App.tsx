import React from 'react';
import './App.css';
import {ApiContext, api_client} from "./apiClient";
import Dashboard from "./components/Dashboard";

function App() {
    return (
        <div className="App">
            <ApiContext.Provider value={api_client}>
                <Dashboard/>
            </ApiContext.Provider>
        </div>
    );
}

export default App;