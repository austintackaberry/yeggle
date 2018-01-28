# Yeggle

Calls Yelp and Google APIs to get search result data that can be filtered/sorted by various categories. The "Yeggle" button matches up Google results to Yelp results; the Yeggle algorithm utilizes coordinates, title, and address to determine if there is a match. Optimized for desktop and mobile.

## Getting Started

In order to run a dev server on your local host, you will need to first install all the required npm packages.

`npm install`
  
Next you will need to navigate to the client folder...

`cd yeggle/react-backend/client`

and execute...

`npm start`
  
This will spin up a server on localhost:3000 for the frontend. Next you will need to open up an additional terminal and start up a server for the backend:

`cd yeggle/react-backend`

`node app.js`
  
Now you are all set up!

## Built With

* React
* Nodejs
* Express

## Authors

Austin Tackaberry

## License

This project is licensed under the MIT License - see the LICENSE.md file for details
