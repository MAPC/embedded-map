import React, { useState, useEffect } from "react";

import { openDB } from "idb";

import styled from "styled-components";

import Spinner from "react-bootstrap/Spinner";

import arcgisPbfDecode from "arcgis-pbf-parser";

import { MapContainer, TileLayer, ZoomControl, GeoJSON, Circle } from "react-leaflet";

import "leaflet/dist/leaflet.css";
import "bootstrap/dist/css/bootstrap.min.css";

// Importing "for side effects", i.e., to extend leaflet with smooth scrolling
import "./SmoothScroll";
import { polygon } from "leaflet";

// constants
const MAP_DB = "MapCache";
const AGOL_ORG_HASH = "c5WwApDsDjRhIVkH";
const GEOMETRY_STORE = "geometries";
const mapboxBaseURL = "https://api.mapbox.com/";
const zoomLevels = {
  country: 4,
  state: 8.5,
  region: 10,
  municipality: 11,
  censusTract: 15,
  parcel: 18,
};
const mapboxAttribution = `© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <strong><a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a></strong>`;
const stateMapProps = {
  center: [42.030590752172635, -71.82353838842278],
  zoom: zoomLevels.state,
  zoomDelta: 0.25,
  maxZoom: zoomLevels.parcel,
  minZoom: zoomLevels.country,
  zoomSnap: 0.25,
};

const regionMapProps = {
  center: [42.3457, -71.17852],
  zoom: zoomLevels.region,
  zoomDelta: 0.25,
  maxZoom: zoomLevels.parcel,
  minZoom: zoomLevels.country,
  zoomSnap: 0.25,
};

// UTILS
export const createTileURL = (style = "light-v10", token = process.env.MAPBOX_TOKEN) => {
  const params = new URLSearchParams();
  params.set("access_token", token || "");
  const stylePath = `styles/v1/mapbox/${style}/tiles/{z}/{x}/{y}/`;
  return `${mapboxBaseURL}${stylePath}?${params}`;
};

/*
 * Utility function for obtaining OAuth token for use with an ArcGIS Feature Service
 *
 * Usage example:
 *   useEffect(() => {
 *     if (!token || Date.now() - tokenTime > 3600) {
 *       const getToken = async () => {
 *         const token = await authenticateEsriFromEnv();
 *         setToken(token);
 *         setTokenTime(Date.now());
 *       };
 *       getToken();
 *     }
 *   }, [token, tokenTime]);
 *
 */
export const authenticateEsriFromEnv = async () => {
  const clientId = process.env.REACT_APP_AGOL_CLIENT_ID;
  const clientSecret = process.env.REACT_APP_AGOL_CLIENT_SECRET;
  const expiration = 3600;

  if (clientId == null || clientSecret == null) {
    console.error("Unable to authenticate with ArcGIS Online: no credentials provided");
    return null;
  }

  return await authenticateEsri(clientId, clientSecret, expiration);
};

export const authenticateEsri = async (clientId, clientSecret, expiration = 3600) => {
  const authservice = "https://www.arcgis.com/sharing/rest/oauth2/token";
  const url = `${authservice}?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials&expiration=${expiration}`;

  let token;

  try {
    const response = await fetch(url, {
      method: "POST",
    });
    const responseJSON = await response.json();
    token = responseJSON.access_token;
  } catch (error) {
    console.error("Unable to authenticate with ArcGIS Online:");
    console.error(error);
  }

  return token;
};

const readFeatureCollection = async (cacheKey) => {
  const mapDB = await openDB(MAP_DB, 2, {
    upgrade(db, oldVersion, newVersion, transaction, event) {
      // Geometries are stored as GeoJSON FeatureCollection with a "name" property at the root level
      // The "name" corresponds to the layer name in AGOL
      const objectStore = db.createObjectStore(GEOMETRY_STORE, { keyPath: "name" });

      objectStore.createIndex("name", "name", { unique: true });
    },
    blocked(currentVersion, blockedVersion, event) {
      // TODO?
    },
    blocking(currentVersion, blockedVersion, event) {
      // TODO?
    },
    terminated() {
      // TODO?
    },
  });
  const store = mapDB.transaction(GEOMETRY_STORE).objectStore(GEOMETRY_STORE);
  const polygons = await store.get(cacheKey);
  return polygons;
};

const writeFeatureCollection = async (featureCollection) => {
  const mapDB = await openDB(MAP_DB, 2, {
    upgrade(db, oldVersion, newVersion, transaction, event) {
      // Geometries are stored as GeoJSON FeatureCollection with a "name" property at the root level
      // The "name" corresponds to the layer name in AGOL
      const objectStore = db.createObjectStore(GEOMETRY_STORE, { keyPath: "name" });

      objectStore.createIndex("name", "name", { unique: true });
    },
    blocked(currentVersion, blockedVersion, event) {
      // TODO
    },
    blocking(currentVersion, blockedVersion, event) {
      // TODO
    },
    terminated() {
      // TODO
    },
  });
  const store = mapDB.transaction(GEOMETRY_STORE, "readwrite").objectStore(GEOMETRY_STORE);
  await store.put(featureCollection);
};

export const getAGOLLayerURL = (serviceName, layerID = null) => {
  // TODO: separate layer from service
  // TODO: gracefully handle no matching layer name
  return `https://services.arcgis.com/${AGOL_ORG_HASH}/arcgis/rest/services/${serviceName}/FeatureServer/${layerID}`;
};

export const getCacheKey = (serviceName, layerKey) => {
  return `${serviceName}-${layerKey}`;
};

/*
 * Utility function for querying geometries from an ArcGIS Feature Service
 *
 * Usage example:
 *   useEffect(() => {
 *     if (token != null && data == null) {
 *       const serviceName = MUNI_POLYGONS;
 *       queryFeatureService({token, serviceName}).then((polygons) => setData(polygons));
 *     }
 *   }, [token, data]);
 *
 */
export const queryFeatureService = async ({ serviceName, token = null, layerID = null, layerName = null, count = null, force = false }) => {
  const layerKey = layerName ? layerName : layerID;
  const cacheKey = getCacheKey(serviceName, layerKey);
  let featureCollection = await readFeatureCollection(cacheKey);
  if (!force && featureCollection != null) {
    // Return cached version if we have it
    return featureCollection;
  }

  if (token == null) {
    token = await authenticateEsriFromEnv();
  }

  if (layerID == null) {
    const layerResponse = await fetch(
      `https://services.arcgis.com/${AGOL_ORG_HASH}/ArcGIS/rest/services/${serviceName}/FeatureServer/layers?f=pjson&token=${token}`
    );
    const { layers } = await layerResponse.json();
    if (layers.length === 1 && layerName == null) {
      // If number of layers is 1, use that by default if no layerName is provided
      layerID = layers[0].id;
      layerName = layers[0].name;
    } else if (layerName != null) {
      // Otherwise, try to match layerName in list of available layers
      layerID = layers.filter((l) => l.name == serviceName)[0];
    }
  }

  // Only fetch new data from server if read from IndexedDB is not successful
  featureCollection = {
    type: "FeatureCollection",
    name: cacheKey,
    crs: { type: "name", properties: { name: "EPSG:4326" } },
    features: [],
  };

  const layerURL = getAGOLLayerURL(serviceName, layerID);
  if (count == null) {
    const idURL = `${layerURL}/query?where=0=0&returnGeometry=false&f=pjson&token=${token}&returnIdsOnly=true`;
    const idsResponse = await fetch(idURL);
    // TODO: See if there's a way to do this with pbf
    const idsJSON = await idsResponse.json();
    const ids = idsJSON.objectIds;
    count = ids.length;
  }

  const url = `${layerURL}/query?returnGeometry=true&outSR=4326&outFields=muni_id&f=pbf&token=${token}`;
  let featuresList = [];
  // TODO: Figure out better way to do chunk sizing that takes API limits into account (likely just institute a cap/max)
  const chunkSize = Math.min(Math.ceil(count / 3), 10000);
  const chunks = [...Array(Math.ceil(count / chunkSize)).keys()].map((n) => n * chunkSize);
  const parts = await Promise.all(
    chunks.map((c) =>
      fetch(`${url}&where=ObjectId>${c} and ObjectId<=${c + chunkSize}`, {
        cache: "force-cache",
      })
    )
  );
  const buffers = await Promise.all(parts.map((part) => part.arrayBuffer()));
  featuresList = buffers.map((buff) => arcgisPbfDecode(new Uint8Array(buff)).featureCollection);
  featureCollection.features = featuresList.reduce((acc, v, i) => {
    return acc.concat(v.features);
  }, []);

  writeFeatureCollection(featureCollection);

  return featureCollection;
};

/*
 * Utility function for querying point data from an AirTable base with lat/long columns
 *
 * Usage example:
 *   queryAirtableBase({
 *     baseID: "appIU7sOcjCrwiJZU",
 *     tableName: "State Subsidized Public Housing",
 *     fields: ["FID", "DevName", "Program", "Lat", "Long"],
 *     sortOptions: [{field: "FID", direction: "asc"}]
 *   }).then((points) => setPoints(points));
 *
 */
export const queryAirtableBase = async ({
  serviceName,
  token = null,
  baseID = null,
  tableName = null,
  viewName = null,
  sortOptions = [],
  count = null,
  fields = [],
  force = false,
  latitudeField = null,
  longitudeField = null,
}) => {
  const cacheKey = getCacheKey(baseID, tableName);
  let featureCollection = await readFeatureCollection(cacheKey);
  if (!force && featureCollection != null) {
    // Return cached version if we have it
    return featureCollection;
  }

  if (token == null) {
    console.error("No AirTable token provided: unable to fetch data from API");
    return [];
  }

  let cmsBase;
  if (token == null) {
    // Read token from env if not passed
  } else {
    cmsBase = new Airtable({ apiKey: token }).base(baseID);
  }

  const featuresList = [];
  const selectOptions = {};
  if (viewName != null) {
    selectOptions.view = viewName;
  }
  if (sortOptions != null) {
    selectOptions.sort = sortOptions;
  }
  const table = await cmsBase(tableName).select(selectOptions);

  const response = await table.eachPage((records, fetchNextPage) => {
    records.forEach(function (record) {
      let coordinates = [];
      if (latitudeField == null || longitudeField == null) {
        // Can't set coordinates if we don't know the lat/long
        console.warn("latitudeField/longitudeField not defined: returning GeoJSON without coordinates!");
      } else {
        const longitude = record.fields[longitudeField];
        const latitude = record.fields[latitudeField];
        coordinates = [longitude, latitude];
      }
      // delete record.Long;
      // delete record.Lat;
      const feature = {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates,
        },
        properties: { ...record.fields },
      };
      featuresList.push(feature);
    });
    fetchNextPage();
  });

  // Only fetch new data from server if read from IndexedDB is not successful
  featureCollection = {
    type: "FeatureCollection",
    name: cacheKey,
    crs: { type: "name", properties: { name: "EPSG:4326" } },
    features: featuresList,
  };

  writeFeatureCollection(featureCollection);

  return featureCollection;
};

const LoadingOverlay = styled.div`
  position: absolute;
  height: 100vh;
  width: 100vw;
  background-color: rgba(200, 200, 200, 0.5);
  z-index: 798;
`;

const LoadingContainer = styled.div`
  position: absolute;
  top: calc(50% - 75px);
  right: calc(50% - 32.5px);
  height: 75px;
  width: 75px;
  /* background-color: white; */
  display: flex;
  align-items: center;
  justify-content: center;
  /* border: 2px solid rgba(0, 0, 0, 0.2); */
`;

const LoadingIndicator = styled(Spinner)``;

const Wrapper = styled.div`
  div.leaflet-container {
    height: ${(props) => props.height};
  }
`;

export const MAPCMap = ({ wrapperHeight = "100vh", mapFocus = "region", points = [], mapboxToken = process.env.REACT_APP_MAPBOX_TOKEN }) => {
  const [polygons, setPolygons] = useState([]);
  useEffect(() => {
    const loadPolygons = async () => {
      // constants and feature query setup
      const MUNI_POLYGONS = "simplified_muni_polygons_2";
      const clientId = process.env.REACT_APP_AGOL_CLIENT_ID;
      const clientSecret = process.env.REACT_APP_AGOL_CLIENT_SECRET;
      const token = await authenticateEsri(clientId, clientSecret);
      const serviceName = MUNI_POLYGONS;
      const polygonData = await queryFeatureService({ token, serviceName, force: true });

      setPolygons([
        {
          id: "muni-polygons",
          styleFunction: () => {
            return {
              fillColor: "#69bbf6",
              color: "#219af1",
              weight: 0.8,
              fillOpacity: 0.5,
              opacity: 0.5,
            };
          },
          data: polygonData.features,
        },
      ]);
    };
    loadPolygons();
  }, []);
  let focusProps = regionMapProps; // Default: MAPC regional map
  if (mapFocus === "state") {
    focusProps = stateMapProps;
  }

  let layers = [];
  // TODO: provide options for indicating "blocking" vs "non-blocking" layers
  if (polygons.length == 0 && points.length == 0) {
    layers = [
      <LoadingOverlay>
        <LoadingContainer>
          <LoadingIndicator animation="border" role="status">
            <span style={{ display: "none" }}>Loading...</span>
          </LoadingIndicator>
        </LoadingContainer>
      </LoadingOverlay>,
    ];
  }

  if (polygons.length > 0) {
    for (let polyConfig of polygons) {
      // TODO: Set up default polygon colors in constants
      layers.push(<GeoJSON id={polyConfig.id} key={polyConfig.id} data={polyConfig.data} style={polyConfig.styleFunction} />);
    }
  }

  if (points.length > 0) {
    for (let pointConfig of points) {
      for (let point of pointConfig.data) {
        // TODO: Set up default point colors in constants
        layers.push(
          <Circle
            key={point.properties[pointConfig.keyField]}
            pathOptions={pointConfig.pathOptions}
            radius={pointConfig.radius}
            center={[point.properties[pointConfig.latitudeField], point.properties[pointConfig.longitudeField]]}
          />
        );
      }
    }
  }
  console.log(process.env.REACT_APP_MAPBOX_TOKEN);
  return (
    <Wrapper height={wrapperHeight}>
      <MapContainer
        {...focusProps}
        zoomControl={false}
        preferCanvas={false}
        scrollWheelZoom={false} // disable original zoom function
        smoothWheelZoom={true} // enable smooth zoom
        smoothSensitivity={2.5} // zoom speed. default is 1
      >
        <TileLayer url={createTileURL("light-v10", mapboxToken)} attribution={mapboxAttribution} tileSize={512} zoomOffset={-1} />
        {layers}
        <ZoomControl position="bottomright" />
      </MapContainer>
    </Wrapper>
  );
};

export default MAPCMap;
