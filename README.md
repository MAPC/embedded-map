# Landline (Embedded Map)

## Overview

LandLine is MAPC's vision to connect our greenways and trails into a seamless network. This project is a [Leaflet](https://leafletjs.com/) map that renders those trail networks and projects. We also track "gaps" in the trail network, in order to identify where we can invest in trail development to strengthen and improve the network.

We use [Airtable](https://airtable.com/) (via [Airtable.js](https://github.com/Airtable/airtable.js)) as a lightweight [Content Management System (CMS)](https://en.wikipedia.org/wiki/Content_management_system) to serve trail project data, and the trail data is made available through an [ESRI](https://en.wikipedia.org/wiki/Esri) feature service.

We use a combination of [styled-components](https://styled-components.com/) and [react-bootstrap](https://react-bootstrap.github.io/) for visual components of the map.

[ESLint](https://eslint.org/) and [Prettier](https://prettier.io/) are configured for this project, using our organization's [shared ESLint config](https://github.com/MAPC/eslint-config) as a baseline.

## Setup

- Install dependencies with `yarn install`
- Create `.env` file (environment variables can be found in Dashlane secure notes)

## Development

After setting up the project, run the app locally ([http://localhost:3000](http://localhost:3000)) with `yarn start`

## Deployment

Currently, there is no staging environment, just the [GitHub Pages site](https://mapc.github.io/embedded-map/) (which is embedded in the [Landline website](https://www.mapc.org/transportation/landline/)).
To build and deploy the site, run `yarn deploy` locally, which will use the [gh-pages module](https://github.com/tschaub/gh-pages?tab=readme-ov-file#command-line-utility) to build the production bundle and copy it into the `gh-pages` branch, which is the branch served by [GitHub Pages](https://pages.github.com/).
