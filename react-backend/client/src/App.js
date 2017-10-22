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

function placeMatch(googlePlace, yelpPlace) {
  var gyDist = getDistanceFromLatLonInM(googlePlace.location.lat,googlePlace.location.lng,yelpPlace.location.lat,yelpPlace.location.lng);
  if (gyDist > 100) {
    return false;
  }
  if (gyDist < 10) {
    return true;
  }
  var googleNameArr = googlePlace.name.split(' ');
  var yelpNameArr = yelpPlace.name.split(' ');
  var i = 0;
  var nameMatch = 0;
  while (i < Math.min(googleNameArr.length, yelpNameArr.length)){
    if (googleNameArr[i] == yelpNameArr[i]) {
      nameMatch++;
    }
    i++;
  }
  if (nameMatch === i) {
    return true;
  }
  var googleAddressArr = googlePlace.address.split(' ');
  var yelpAddressArr = yelpPlace.address.split(' ');
  i = 0;
  var addressMatch = 0;
  while (i < Math.min(googleAddressArr.length, yelpAddressArr.length)){
    if (googleAddressArr[i] == yelpAddressArr[i]) {
      addressMatch++;
    }
    i++;
  }

  if (addressMatch >= 2) {
    return true;
  }
  else {
    return false;
  }

  if (nameMatch/i*1.0 < 0.5) {
    return false;
  }
  return true;
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
    this.handleScroll = this.handleScroll.bind(this);
  }

  componentDidMount() {
    window.initMap = this.initMap;
    loadjs('https://maps.googleapis.com/maps/api/js?key=AIzaSyCkzLkLAJ_ZRGvaAg2c9R2sC_n-OHLq-x8&libraries=places&callback=initMap');
    window.addEventListener('scroll', this.handleScroll);
  }

  handleScroll() {
    var rect = this.mapWrapper.getBoundingClientRect();
    if (rect.top <= 0) {
      this.placeHolder.style.height = (this.gridHead.clientHeight+this.mapWrapper.clientHeight)+"px";
      this.placeHolder.style.width = "100%";
      this.mapWrapper.classList.add("sticky");
      this.gridHead.classList.add("sticky-grid-heading");
    }
    if (window.scrollY <= 150 && this.mapWrapper.classList.contains("sticky")){
      this.mapWrapper.classList.toggle("sticky");
      this.gridHead.classList.toggle("sticky-grid-heading");
      this.placeHolder.style.height = "0";
      this.placeHolder.style.width = "0";
    }
  }

  initMap() {
    const google = window.google;
    var map = new google.maps.Map(this.map, {
      zoom: 11,
      mapTypeId: 'roadmap',
      gestureHandling: 'greedy'
    });
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function (position) {
        var initialLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
        map.setCenter(initialLocation);
      }, function() {
        map.setCenter({lat: 37.8667517, lng: -122.259986});
      });
    }
    else {
      map.setCenter({lat: 37.8667517, lng: -122.259986});
    }
    this.setState({map:map});
    this.locationBox = new google.maps.places.SearchBox(this.locationBoxEl);
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
      yeggle: {
        icon: {
          url: '/yeggle.png',
          scaledSize: new google.maps.Size(30, 30),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(0, 0)
        }
      }
    };
    this.infoWindow = new google.maps.InfoWindow;
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

    document.activeElement.blur();
    this.nonloaderEl.style.opacity = "0.2";
    this.loader.classList.add("loader-activated");
    this.loader.style.display = "block";

    const google = window.google;
    var map = this.state.map;
    var diagMeters;
    var bounds;
    var mapBounds;
    if (this.locationBoxEl !== "") {
      var places = this.locationBox.getPlaces();
      if (places !== undefined) {
        map.setCenter(places[0].geometry.location);
        mapBounds = map.getBounds();
        this.searchBox.setBounds(mapBounds);
        bounds = {
          lat: {
            min: mapBounds.f.b,
            max: mapBounds.f.f,
          },
          lon: {
            min: mapBounds.b.b,
            max: mapBounds.b.f,
          }
        };
        diagMeters = getDistanceFromLatLonInM(bounds.lat.min, bounds.lon.min, bounds.lat.max, bounds.lon.max);
        if (diagMeters > 40000 * 2) {
          diagMeters = 40000 * 2;
        }
      }
    }
    else {
      mapBounds = map.getBounds();
      this.searchBox.setBounds(mapBounds);
      bounds = {
        lat: {
          min: mapBounds.f.b,
          max: mapBounds.f.f,
        },
        lon: {
          min: mapBounds.b.b,
          max: mapBounds.b.f,
        }
      };
      diagMeters = getDistanceFromLatLonInM(bounds.lat.min, bounds.lon.min, bounds.lat.max, bounds.lon.max);
      if (diagMeters > 40000 * 2) {
        diagMeters = 40000 * 2;
      }
    }
    var yelpPlacesFormatted = [];
    var googlePlaces = [];
    var googlePlacesFormatted = [];
    var diagMeters;
    this.markers.forEach(function(marker) {
      marker.setMap(null);
    });
    this.markers = [];
    async.series([
      (callback) => {
        if (this.locationBoxEl !== "" && places === undefined) {
          var paramGoogleJSON = {
            query: this.locationBoxEl.value
          };
          fetch('/googlelocationsearch', {
            method: 'POST',
            body: JSON.stringify(paramGoogleJSON)
          })
          .then(res => res.json())
          .then(data => {
            console.log(data);
            if (data.results[0] !== undefined) {
              map.setCenter(data.results[0].geometry.location);
            }
            mapBounds = map.getBounds();
            this.searchBox.setBounds(mapBounds);
            bounds = {
              lat: {
                min: mapBounds.f.b,
                max: mapBounds.f.f,
              },
              lon: {
                min: mapBounds.b.b,
                max: mapBounds.b.f,
              }
            };
            diagMeters = getDistanceFromLatLonInM(bounds.lat.min, bounds.lon.min, bounds.lat.max, bounds.lon.max);
            if (diagMeters > 40000 * 2) {
              diagMeters = 40000 * 2;
            }
            callback();
          });
        }
        else {
          callback();
        }
      },
      (callback) => {
          var paramYelpJSON = {
            term: this.searchBoxEl.value,
            latitude: (bounds.lat.min + bounds.lat.max) / 2.0,
            longitude: (bounds.lon.min + bounds.lon.max) / 2.0,
            radius: Math.floor(diagMeters / 2.0)
          }
          fetch('/yelpsearch', {
            method: 'POST',
            body: JSON.stringify(paramYelpJSON)
          })
          .then(res => res.json())
          .then(data => {
            var yelpPlaces = data.businesses;
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
          var latitude = (bounds.lat.min + bounds.lat.max) / 2.0;
          var longitude = (bounds.lon.min + bounds.lon.max) / 2.0;
          if (diagMeters > 50000 * 2) {
            diagMeters = 50000 * 2;
          }
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
          var infoWindow = this.infoWindow;
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
                if (!foundMatch) {
                  if (placeMatch(googlePlace,yelpPlace)) {
                    bothPlacesFormatted.push({
                      google: nestedGooglePlace,
                      yelp: yelpPlace
                    });
                    onlyGooglePlacesFormatted[gindex] = 0;
                    onlyYelpPlacesFormatted[yindex] = 0;
                    foundMatch = true;
                    var bothPlaceMarker = new google.maps.Marker({
                      map: map,
                      title: nestedGooglePlace.name,
                      position: nestedGooglePlace.location,
                      icon: this.icons.yeggle.icon,
                      content: '<h3>' + googlePlace.name + '</h3>' +
                      '<p>' + 'Google: ' + googlePlace.rating + '<br>' +
                      'Yelp: ' + yelpPlace.rating + '</p>'
                    });
                    google.maps.event.addListener(bothPlaceMarker, 'click', function() {
                      infoWindow.setContent(bothPlaceMarker.content);
                      infoWindow.open(map, bothPlaceMarker);
                    });
                    this.markers.push(bothPlaceMarker);
                  }
                }
              });
              if (!foundMatch) {
                var googlePlaceMarker = new google.maps.Marker({
                  map: map,
                  title: googlePlace.name,
                  position: googlePlace.location,
                  icon: this.icons.google.icon,
                  optimized: false,
                  content: '<h3>' + googlePlace.name + '</h3>' +
                  '<p>' + 'Google: ' + googlePlace.rating + '</p>'
                });
                google.maps.event.addListener(googlePlaceMarker, 'click', function() {
                  infoWindow.setContent(googlePlaceMarker.content);
                  infoWindow.open(map, googlePlaceMarker);
                });
                this.markers.push(googlePlaceMarker);
              }
            });
            onlyYelpPlacesFormatted = onlyYelpPlacesFormatted.filter((a) => a !== 0);
            onlyGooglePlacesFormatted = onlyGooglePlacesFormatted.filter((a) => a !== 0);
            onlyYelpPlacesFormatted.forEach((yelpPlace, yindex, yarray) => {
              var yelpPlaceMarker = new google.maps.Marker({
                map: map,
                title: yelpPlace.name,
                position: yelpPlace.location,
                icon: this.icons.yelp.icon,
                optimized: false,
                content: '<h3>' + yelpPlace.name + '</h3>' +
                '<p>' + 'Yelp: ' + yelpPlace.rating + '</p>'
              });
              google.maps.event.addListener(yelpPlaceMarker, 'click', function() {
                infoWindow.setContent(yelpPlaceMarker.content);
                infoWindow.open(map, yelpPlaceMarker);
              });
              this.markers.push(yelpPlaceMarker);
            });
          }
          this.locationBoxEl.value = "";
          this.loader.classList.remove("loader-activated");
          this.nonloaderEl.style.opacity = "1";
          this.loader.style.display = "none";
          this.setState({googlePlacesFormatted:googlePlacesFormatted, yelpPlacesFormatted:yelpPlacesFormatted, bothPlacesFormatted:bothPlacesFormatted});
          callback();
        }
    ]);
  }

  render() {
    var placesJSX = [];
    var googlePlacesJSX = [];
    var yelpPlacesJSX = [];
    if (this.state.googlePlacesFormatted !== undefined && this.state.googlePlacesFormatted !== null) {
      var googlePlacesFormatted = this.state.googlePlacesFormatted;
      var yelpPlacesFormatted = this.state.yelpPlacesFormatted;
      var i = 0;
      var googleStars;
      while (i < Math.max(googlePlacesFormatted.length, yelpPlacesFormatted.length)) {
        if (i < googlePlacesFormatted.length) {
          if (googlePlacesFormatted[i].rating == "" || googlePlacesFormatted[i].rating == undefined) {
            googleStars = "";
          }
          else {
            googleStars = googlePlacesFormatted[i].rating + ' stars';
          }
          googlePlacesJSX.push(
            <div className="item2-right">
              <h4><a href={googlePlacesFormatted[i].url} target="_blank">{googlePlacesFormatted[i].name}</a></h4>
              <p>{googlePlacesFormatted[i].address}</p>
              <p>{googlePlacesFormatted[i].currStatus}</p>
              <p>{googlePlacesFormatted[i].priceLevel}</p>
              <p>{googleStars}</p>
            </div>
          );
        }
        else {
          googlePlacesJSX.push(
            <div className="item2-right-empty"></div>
          );
        }
        if (i < yelpPlacesFormatted.length) {
          yelpPlacesJSX.push(
            <div className="item2-left">
              <h4><a href={yelpPlacesFormatted[i].url} target="_blank">{yelpPlacesFormatted[i].name}</a></h4>
              <p>{yelpPlacesFormatted[i].address}</p>
              <p>{yelpPlacesFormatted[i].currStatus}</p>
              <p>{yelpPlacesFormatted[i].priceLevel}</p>
              <p>{yelpPlacesFormatted[i].rating} stars</p>
              <p>{yelpPlacesFormatted[i].reviewCount} reviews</p>
            </div>
          );
        }
        else {
          yelpPlacesJSX.push(
            <div className="item2-left-empty"></div>
          );
        }
        placesJSX.push(
          <div className="row2">
            {yelpPlacesJSX[i]}
            <div className="item2-center"></div>
            {googlePlacesJSX[i]}
          </div>
        );
        i++;
      }
    }
    return (
      <div className="App">
        <div id="loader" style={{display:'none'}} ref={(loader) => {this.loader = loader;}}></div>
        <div ref={(nonloaderEl) => {this.nonloaderEl = nonloaderEl;}}>
          <header className="App-header">
            <h1 className="App-title">Welcome to Yeggle</h1>
            <form onSubmit={this.handleSubmit}>
              <input onClick={this.handleSearchClick} onChange={this.handleChange} onKeyPress={this.handleChange} id="search-box" ref={(searchBoxEl) => {this.searchBoxEl = searchBoxEl;}} placeholder="Search for" />
              <input placeholder="Near" ref={(locationBoxEl) => {this.locationBoxEl = locationBoxEl;}}/>
              <input id="submit-button" type="submit"/>
            </form>
          </header>
          <div id="map-wrapper" ref={(mapWrapper) => {this.mapWrapper = mapWrapper;}}>
            <div id="map" ref={(map) => {this.map = map;}}></div>
          </div>
          <div className="grid1" ref={(gridHead) => {this.gridHead = gridHead;}}>
            <div className="row1">
              <div className="item1-left" ref={(yelpHead) => {this.yelpHead = yelpHead;}}>
                <h3>Yelp</h3>
              </div>
              <div className="item1-center"></div>
              <div className="item1-right" ref={(googleHead) => {this.googleHead = googleHead;}}>
                <h3>Google</h3>
              </div>
            </div>
          </div>
          <div ref={(placeHolder) => {this.placeHolder = placeHolder;}}></div>
          <div className="grid2">
            {placesJSX}
          </div>
        </div>
      </div>
    );
  }
}

export default App;
