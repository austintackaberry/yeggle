export const getDistanceFromLatLonInM = (lat1, lon1, lat2, lon2) => {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2 - lat1); // deg2rad below
  var dLon = deg2rad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c; // Distance in km
  return d * 1000;
};

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

export const placeMatch = (googlePlace, yelpPlace) => {
  var gyDist = getDistanceFromLatLonInM(
    googlePlace.location.lat,
    googlePlace.location.lng,
    yelpPlace.location.lat,
    yelpPlace.location.lng
  );
  if (gyDist > 100) {
    return false;
  }
  if (gyDist < 10) {
    return true;
  }
  var googleNameArr = googlePlace.name.split(" ");
  var yelpNameArr = yelpPlace.name.split(" ");
  var i = 0;
  var nameMatch = 0;
  while (i < Math.min(googleNameArr.length, yelpNameArr.length)) {
    if (googleNameArr[i] == yelpNameArr[i]) {
      nameMatch++;
    }
    i++;
  }
  if (nameMatch === i) {
    return true;
  }
  var googleAddressArr = googlePlace.address.split(" ");
  var yelpAddressArr = yelpPlace.address.split(" ");
  if (googleAddressArr[1] !== yelpAddressArr[1]) {
    return false;
  }
  var j = 0;
  var addressMatch = 0;
  while (j < 2) {
    if (googleAddressArr[j] == yelpAddressArr[j]) {
      addressMatch++;
    }
    j++;
  }

  if (addressMatch === 2) {
    return true;
  }

  if ((nameMatch / i) * 1.0 <= 0.5) {
    return false;
  }
  return true;
};

export const formatGoogleResults = (
  googlePlacesResults,
  bounds,
  googlePlaces
) => {
  for (var i = 0; i < googlePlaces.length; i++) {
    if (
      googlePlaces[i].geometry.location.lat > bounds.lat.min &&
      googlePlaces[i].geometry.location.lat < bounds.lat.max &&
      googlePlaces[i].geometry.location.lng > bounds.lon.min &&
      googlePlaces[i].geometry.location.lng < bounds.lon.max
    ) {
      var priceLevel = "$".repeat(googlePlaces[i].price_level);
      if (googlePlaces[i].price_level == 0) {
        priceLevel = "$";
      }
      var currStatus;
      if (googlePlaces[i].opening_hours !== undefined) {
        if (googlePlaces[i].opening_hours.open_now) {
          currStatus = "Open now";
        } else {
          currStatus = "Closed now";
        }
      }
      var latitude = (bounds.lat.min + bounds.lat.max) / 2.0;
      var longitude = (bounds.lon.min + bounds.lon.max) / 2.0;
      var distance = getDistanceFromLatLonInM(
        latitude,
        longitude,
        googlePlaces[i].geometry.location.lat,
        googlePlaces[i].geometry.location.lng
      );
      var address = googlePlaces[i].vicinity;
      var place = {
        name: googlePlaces[i].name,
        location: googlePlaces[i].geometry.location,
        address: address,
        rating: googlePlaces[i].rating,
        priceLevel: priceLevel,
        currStatus: currStatus,
        distance: distance,
        url: `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${
          googlePlaces[i].place_id
        }`
      };
      googlePlacesResults.push(place);
    }
  }
  return googlePlacesResults;
};
