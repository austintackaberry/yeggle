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

function formatGoogleResults(googlePlacesFormatted, bounds, googlePlaces) {
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
      yelpPlacesFormatted: [],
      bothPlacesFormatted: []
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
    this.icons = {
          google: {
            icon: {
              url: '/google_logo.png',
              scaledSize: new google.maps.Size(25, 25),
              origin: new google.maps.Point(0, 0),
              anchor: new google.maps.Point(0, 0)
            }
          },
          yelp: {
            icon: {
              url: '/yelp_logo.png',
              scaledSize: new google.maps.Size(25, 25),
              origin: new google.maps.Point(0, 0),
              anchor: new google.maps.Point(0, 0)
            }
          },
        };
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
    var yelpPlacesFormatted = [];
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
            var yelpPlaces = data.businesses;
            console.log(yelpPlaces);
            for (var i = 0; i < yelpPlaces.length; i++) {
              if (yelpPlaces[i].coordinates.latitude > bounds.lat.min && yelpPlaces[i].coordinates.latitude < bounds.lat.max && yelpPlaces[i].coordinates.longitude > bounds.lon.min && yelpPlaces[i].coordinates.longitude < bounds.lon.max) {
                var business = {
                  name: yelpPlaces[i].name,
                  reviewCount: yelpPlaces[i].review_count,
                  rating: yelpPlaces[i].rating,
                  priceLevel: yelpPlaces[i].price,
                  location: {
                    lat: yelpPlaces[i].coordinates.latitude,
                    lng: yelpPlaces[i].coordinates.longitude
                  },
                  address: yelpPlaces[i].location.display_address[0] + ', ' + yelpPlaces[i].location.display_address[1],
                  url: 'https://www.yelp.com/biz/' + yelpPlaces[i].id
                };
                if (yelpPlaces[i].is_closed) {
                  business.currStatus = 'Closed now'
                }
                else {
                  business.currStatus = 'Open now'
                }
                yelpPlacesFormatted.push(business);
              }
            }
            yelpPlacesFormatted = yelpPlacesFormatted.sort(function(a, b) {
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
            googlePlacesFormatted = formatGoogleResults(googlePlacesFormatted,bounds,googlePlaces);
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
                  googlePlacesFormatted = formatGoogleResults(googlePlacesFormatted,bounds,googlePlaces);
                  paramGoogleJSON.pagetoken = data1.next_page_token;
                  callback();
                })
              }, 1600);
            }
            else {
              this.setState({googlePlacesFormatted:googlePlacesFormatted, yelpPlacesFormatted:yelpPlacesFormatted});
              callback();
            }
          });
        },
        (callback) => {
          var bothPlacesFormatted = this.state.bothPlacesFormatted;
          bothPlacesFormatted = [];
          googlePlacesFormatted = googlePlacesFormatted.sort(function(a, b) {
            return b.rating - a.rating;
          });
          if (this.state.map !== undefined) {
            var foundMatch;
            var contentString;
            var nestedGooglePlace;
            var numPlacesRemoved = 0;
            var onlyGooglePlacesFormatted = googlePlacesFormatted.slice();
            var onlyYelpPlacesFormatted = yelpPlacesFormatted.slice();
            googlePlacesFormatted.forEach((googlePlace, gindex, garray) => {
              nestedGooglePlace = googlePlace;
              foundMatch = false;
              yelpPlacesFormatted.forEach((yelpPlace, yindex, yarray) => {
                var gyDist = getDistanceFromLatLonInM(nestedGooglePlace.location.lat,nestedGooglePlace.location.lng,yelpPlace.location.lat,yelpPlace.location.lng);
                if (gyDist < 15 && !foundMatch) {
                  bothPlacesFormatted.push({
                    google: nestedGooglePlace,
                    yelp: yelpPlace,
                    distance: gyDist
                  });
                  onlyGooglePlacesFormatted[gindex] = 0;
                  onlyYelpPlacesFormatted[yindex] = 0;
                  foundMatch = true;
                  var bothPlaceMarker = new google.maps.Marker({
                    map: map,
                    title: nestedGooglePlace.name,
                    position: nestedGooglePlace.location
                  });
                  contentString = '<h3>' + googlePlace.name + '</h3>' +
                  '<p>' + 'Google: ' + googlePlace.rating + '<br>' +
                  'Yelp: ' + yelpPlace.rating + '</p>';
                  bothPlaceMarker.info = new google.maps.InfoWindow({
                    content: contentString
                  });
                  google.maps.event.addListener(bothPlaceMarker, 'click', function() {
                    if (bothPlaceMarker.info) {bothPlaceMarker.info.close()}
                    bothPlaceMarker.info.open(map, bothPlaceMarker);
                  });
                  this.markers.push(bothPlaceMarker);
                }
              });
              if (!foundMatch) {
                var googlePlaceMarker = new google.maps.Marker({
                  map: map,
                  title: googlePlace.name,
                  position: googlePlace.location,
                  icon: this.icons.google.icon,
                  optimized: false
                });
                contentString = '<h3>' + googlePlace.name + '</h3>' +
                '<p>' + 'Google: ' + googlePlace.rating + '</p>';
                googlePlaceMarker.info = new google.maps.InfoWindow({
                  content: contentString
                });
                google.maps.event.addListener(googlePlaceMarker, 'click', function() {
                  if (googlePlaceMarker.info) {googlePlaceMarker.info.close()}
                  googlePlaceMarker.info.open(map, googlePlaceMarker);
                });
                this.markers.push(googlePlaceMarker);
              }
            });
            onlyYelpPlacesFormatted = onlyYelpPlacesFormatted.filter((a) => a !== 0)
            onlyGooglePlacesFormatted = onlyGooglePlacesFormatted.filter((a) => a !== 0)
            onlyYelpPlacesFormatted.forEach((yelpPlace, yindex, yarray) => {
              var yelpPlaceMarker = new google.maps.Marker({
                map: map,
                title: yelpPlace.name,
                position: yelpPlace.location,
                icon: this.icons.yelp.icon,
                optimized: false
              });
              contentString = '<h3>' + yelpPlace.name + '</h3>' +
              '<p>' + 'Yelp: ' + yelpPlace.rating + '</p>';
              yelpPlaceMarker.info = new google.maps.InfoWindow({
                content: contentString
              });
              google.maps.event.addListener(yelpPlaceMarker, 'click', function() {
                if (yelpPlaceMarker.info) {yelpPlaceMarker.info.close()}
                yelpPlaceMarker.info.open(map, yelpPlaceMarker);
              });
              this.markers.push(yelpPlaceMarker);
            });
          }
          this.setState({googlePlacesFormatted:googlePlacesFormatted, yelpPlacesFormatted:yelpPlacesFormatted, bothPlacesFormatted:bothPlacesFormatted});
          callback();
        }
    ]);
  }

  render() {
    var googlePlacesJSX = [];
    var yelpPlacesJSX = [];
    if (this.state.googlePlacesFormatted !== undefined && this.state.googlePlacesFormatted !== null) {
      var googlePlacesFormatted = this.state.googlePlacesFormatted;
      var yelpPlacesFormatted = this.state.yelpPlacesFormatted;
      var i = 0;
      while (i < Math.min(googlePlacesFormatted.length, yelpPlacesFormatted.length)) {
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
        if (i < yelpPlacesFormatted.length) {
          yelpPlacesJSX.push(
            <div className="yelp-places">
              <h4><a href={yelpPlacesFormatted[i].url} target="_blank">{yelpPlacesFormatted[i].name}</a></h4>
              <p>{yelpPlacesFormatted[i].address}</p>
              <p>{yelpPlacesFormatted[i].currStatus}</p>
              <p>{yelpPlacesFormatted[i].priceLevel}</p>
              <p>{yelpPlacesFormatted[i].rating} stars</p>
              <p>{yelpPlacesFormatted[i].reviewCount} reviews</p>
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
