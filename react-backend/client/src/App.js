import React, { Component } from 'react';
import './App.css';
var loadjs = require('loadjs');
var async = require('async');

function getDistanceFromLatLonInM(lat1,lon1,lat2,lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);  // deg2rad below
  var dLon = deg2rad(lon2-lon1);
  var a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ;
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  var d = R * c; // Distance in km
  return d*1000;
}

function deg2rad(deg) {
  return deg * (Math.PI/180)
}

function formatResults(googlePlacesFormatted, bounds, googlePlaces) {
  for (var i = 0; i < googlePlaces.length && googlePlacesFormatted.length < 20; i++) {
    if (googlePlaces[i].geometry.location.lat > bounds.lat.min && googlePlaces[i].geometry.location.lat < bounds.lat.max && googlePlaces[i].geometry.location.lng > bounds.lon.min && googlePlaces[i].geometry.location.lng < bounds.lon.max) {
      var priceLevel = '$'.repeat(googlePlaces[i].price_level);
      var currStatus;
      if (googlePlaces[i].opening_hours !== undefined) {
        if (googlePlaces[i].opening_hours.open_now) {
          currStatus = 'Open now'
        }
        else {
          currStatus = 'Closed now'
        }
      }
      var address = googlePlaces[i].vicinity;
      var place = {
        name: googlePlaces[i].name,
        location: googlePlaces[i].geometry.location,
        address: address,
        rating: googlePlaces[i].rating,
        priceLevel: priceLevel,
        currStatus: currStatus,
        url: 'https://www.google.com/maps/search/?api=1&query=Google&query_place_id=' + googlePlaces[i].place_id
      };
      googlePlacesFormatted.push(place);
    }
  }
  return googlePlacesFormatted;
}

class App extends Component {
  constructor() {
    super();
    this.state = {
      googlePlacesFormatted: [],
      yelpPlaces: []
    }
    this.markers = [];
    this.initMap = this.initMap.bind(this);
    this.handleSearchClick = this.handleSearchClick.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleChange = this.handleChange.bind(this);
  }

  componentDidMount() {
    window.initMap = this.initMap;
    loadjs('https://maps.googleapis.com/maps/api/js?key=AIzaSyCkzLkLAJ_ZRGvaAg2c9R2sC_n-OHLq-x8&libraries=places&callback=initMap');
  }

  initMap() {
    const google = window.google;
    var map = new google.maps.Map(this.map, {
      center: {lat: 37.8667517, lng: -122.259986},
      zoom: 11,
      mapTypeId: 'roadmap',
      gestureHandling: 'greedy'
    });
    this.setState({map:map});
    this.searchBox = new google.maps.places.SearchBox(this.searchBoxEl);
  }

  handleSearchClick() {
    if (this.state.map !== undefined || this.state.map !== null) {
      this.searchBox.setBounds(this.state.map.getBounds());
      this.places = this.searchBox.getPlaces();
      this.setState({
        searchBounds:this.state.map.getBounds()
      });
    }
  }

  handleChange() {
    this.places = this.searchBox.getPlaces();
  }

  handleSubmit(event) {
    event.preventDefault();
    this.searchBox.setBounds(this.state.map.getBounds());
    this.setState({
      searchBounds:this.state.map.getBounds()
    });
    var bounds = {
      lat: {
        min: this.state.searchBounds.f.b,
        max: this.state.searchBounds.f.f,
      },
      lon: {
        min: this.state.searchBounds.b.b,
        max: this.state.searchBounds.b.f,
      },
    };
    var yelpPlaces = [];
    var googlePlaces = [];
    var googlePlacesFormatted = [];
    var latLon;
    var diagMeters;
    latLon = this.state.searchBounds;
    diagMeters = getDistanceFromLatLonInM(latLon.f.b, latLon.b.b, latLon.f.f, latLon.b.f);
    if (diagMeters > 75000) {
      diagMeters = 75000;
    }
    const google = window.google;
    var map = this.state.map;
    this.markers.forEach(function(marker) {
      marker.setMap(null);
    });
    this.markers = [];
    async.series([
      (callback) => {
          var paramYelpJSON = {
            term: this.searchBoxEl.value,
            latitude: (latLon.f.b + latLon.f.f) / 2.0,
            longitude: (latLon.b.b + latLon.b.f) / 2.0,
            radius: Math.floor(diagMeters / 2.0)
          }
          fetch('/yelpsearch', {
            method: 'POST',
            body: JSON.stringify(paramYelpJSON)
          })
          .then(res => res.json())
          .then(data => {
            var businessArr = data.businesses;
            for (var i = 0; i < businessArr.length; i++) {
              if (businessArr[i].coordinates.latitude > bounds.lat.min && businessArr[i].coordinates.latitude < bounds.lat.max && businessArr[i].coordinates.longitude > bounds.lon.min && businessArr[i].coordinates.longitude < bounds.lon.max) {
                var business = {
                  name: businessArr[i].name,
                  reviewCount: businessArr[i].review_count,
                  rating: businessArr[i].rating,
                  priceLevel: businessArr[i].price,
                  location: businessArr[i].location.display_address[0] + ', ' + businessArr[i].location.display_address[1],
                  url: 'https://www.yelp.com/biz/' + businessArr[i].id
                };
                if (businessArr[i].is_closed) {
                  business.currStatus = 'Closed now'
                }
                else {
                  business.currStatus = 'Open now'
                }
                yelpPlaces.push(business);
              }
            }
            yelpPlaces = yelpPlaces.sort(function(a, b) {
              if (a.rating === b.rating) {
                return b.reviewCount - a.reviewCount;
              }
              return b.rating - a.rating;
            });
            callback();
          }).catch(e => {
            console.log(e);
          });
        },
        (callback) => {
          var latitude = (latLon.f.b + latLon.f.f) / 2.0;
          var longitude = (latLon.b.b + latLon.b.f) / 2.0;
          var paramGoogleJSON = {
            keyword: this.searchBoxEl.value,
            location: latitude.toString() + "," + longitude.toString(),
            radius: Math.floor(diagMeters / 2.0),
          };
          fetch('/googlesearch', {
            method: 'POST',
            body: JSON.stringify(paramGoogleJSON)
          })
          .then(res => res.json())
          .then(data => {
            var googlePlaces = data.results;
            googlePlacesFormatted = formatResults(googlePlacesFormatted,bounds,googlePlaces);
            paramGoogleJSON.pagetoken = data.next_page_token;
            if (googlePlacesFormatted.length < 15) {
              setTimeout( function() {
                fetch('/googlesearch', {
                  method: 'POST',
                  body: JSON.stringify(paramGoogleJSON)
                })
                .then(res1 => res1.json())
                .then(data1 => {
                  googlePlaces = data1.results;
                  googlePlacesFormatted = formatResults(googlePlacesFormatted,bounds,googlePlaces);
                  paramGoogleJSON.pagetoken = data1.next_page_token;
                  callback();
                })
              }.bind(this), 1600);
            }
            else {
              this.setState({googlePlacesFormatted:googlePlacesFormatted, yelpPlaces:yelpPlaces});
              callback();
            }
          });
        },
        (callback) => {
          googlePlacesFormatted = googlePlacesFormatted.sort(function(a, b) {
            return b.rating - a.rating;
          });
          if (this.state.map !== undefined) {
            googlePlacesFormatted.forEach((place) => {
              var placeMarker = new google.maps.Marker({
                map: map,
                title: place.name,
                position: place.location
              });
              placeMarker.info = new google.maps.InfoWindow({
                content: 'Rating: ' + place.rating
              });
              google.maps.event.addListener(placeMarker, 'click', function() {
                if (placeMarker.info) {placeMarker.info.close()}
                placeMarker.info.open(map, placeMarker);
              });
              this.markers.push(placeMarker);
            });
          }
          this.setState({googlePlacesFormatted:googlePlacesFormatted, yelpPlaces:yelpPlaces});
          callback();
        }
    ]);
  }

  render() {
    var googlePlacesJSX = [];
    var yelpPlacesJSX = [];
    if (this.state.googlePlacesFormatted !== undefined && this.state.googlePlacesFormatted !== null) {
      var googlePlacesFormatted = this.state.googlePlacesFormatted;
      var yelpPlaces = this.state.yelpPlaces;
      var i = 0;
      while (i < Math.max(googlePlacesFormatted.length, yelpPlaces.length)) {
        if (i < googlePlacesFormatted.length) {
          googlePlacesJSX.push(
            <div className="google-places">
              <h4><a href={googlePlacesFormatted[i].url} target="_blank">{googlePlacesFormatted[i].name}</a></h4>
              <p>{googlePlacesFormatted[i].address}</p>
              <p>{googlePlacesFormatted[i].currStatus}</p>
              <p>{googlePlacesFormatted[i].priceLevel}</p>
              <p>{googlePlacesFormatted[i].rating} stars</p>
            </div>
          );
        }
        if (i < yelpPlaces.length) {
          yelpPlacesJSX.push(
            <div className="yelp-places">
              <h4><a href={yelpPlaces[i].url} target="_blank">{yelpPlaces[i].name}</a></h4>
              <p>{yelpPlaces[i].location}</p>
              <p>{yelpPlaces[i].currStatus}</p>
              <p>{yelpPlaces[i].priceLevel}</p>
              <p>{yelpPlaces[i].rating} stars</p>
              <p>{yelpPlaces[i].reviewCount} reviews</p>
            </div>
          );
        }
        i++;
      }
    }
    return (
      <div className="App">
        <header className="App-header">
          <h1 className="App-title">Welcome to Googelp</h1>
          <form onSubmit={this.handleSubmit}>
            <input onClick={this.handleSearchClick} onChange={this.handleChange} onKeyPress={this.handleChange} id="search-box" ref={(searchBoxEl) => {this.searchBoxEl = searchBoxEl;}} placeholder="Search" />
            <input type="submit" style={{display:'none'}}/>
          </form>
        </header>
        <div id="map" ref={(map) => {this.map = map;}}></div>
        <div className="grid">
          <div className="col-1-2">
            <h3>Google</h3>
            {googlePlacesJSX}
          </div>
          <div className="col-1-2">
            <h3>Yelp</h3>
            {yelpPlacesJSX}
          </div>
        </div>
      </div>
    );
  }
}

export default App;
