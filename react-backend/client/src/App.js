import React, { Component } from 'react';
import './App.css';
var loadjs = require('loadjs');

class App extends Component {
  constructor() {
    super();
    this.initMap = this.initMap.bind(this);
  }

  componentDidMount() {
    window.initMap = this.initMap;
    loadjs('https://maps.googleapis.com/maps/api/js?key=AIzaSyCkzLkLAJ_ZRGvaAg2c9R2sC_n-OHLq-x8&libraries=places&callback=initMap');
  }

  initMap() {
    const google = window.google;
    var map = new google.maps.Map(document.getElementById('map'), {
      center: {lat: 37.8667517, lng: -122.259986},
      zoom: 11
    });
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <h1 className="App-title">Welcome to Googelp</h1>
        </header>
        <div id="map"></div>
        <div className="grid">
          <div className="col-1-2">
            <h3>Google</h3>
          </div>
          <div className="col-1-2">
            <h3>Yelp</h3>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
