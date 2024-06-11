import React, { useState, useEffect } from "react";

import { openDB } from "idb";

import styled from "styled-components";

import Spinner from "react-bootstrap/Spinner";

import arcgisPbfDecode from "arcgis-pbf-parser";

import MAPCLogo from "./assets/mapc-semitransparent.svg";
import { MapContainer, TileLayer, ZoomControl, GeoJSON, Circle, useMapEvents, ScaleControl } from "react-leaflet";

import "leaflet/dist/leaflet.css";
import "bootstrap/dist/css/bootstrap.min.css";

// Importing "for side effects", i.e., to extend leaflet with smooth scrolling
import "./SmoothScroll";
import { polygon } from "leaflet";
import { FeatureLayer } from "react-esri-leaflet";

import Airtable from "airtable";

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

const Legend = styled.div`
  border-radius: 5px;
  position: absolute;
  width: 22.5%;
  height: 40%;
  background-color: rgba(255, 255, 255, 1);
  top: 0.8rem;
  right: 0.8rem;
  z-index: 1000;
  display: grid;
  grid-template-columns: 2fr;
  padding: 1%;
  overflow-y: scroll;
  overflow-x: hidden;
  text-overflow: ellipsis;
  border-style: solid;
  border-color: rgba(175, 175, 175, 1);
  border-width: 2px;
`;

const LegendElement = styled.div`
  display: flex;
  flex-direction: row;

  /* width: 100%;
  height: 100%; */
`;

const LegendText = styled.div`
  margin-left: 1rem;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;
const LegendTextStrong = styled.div`
  margin-left: 1rem;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-weight: bold;
`;

const Container = styled.div`
  display: flex;
  flex-direction: row;
`;

const RightSidebar = styled.div`
  display: flex;
  flex-direction: column;
  width: 30%;
  height: 100vh;
  background-color: white;
  border-style: solid;
  border-color: rgba(175, 175, 175, 1);
  border-width: 0 0 0 2px;
`;

const SidebarTop = styled.div`
  height: 70%;
  border-style: solid;
  border-color: rgba(225, 225, 225, 1);
  border-width: 0 0 2px 0;
  padding: 0.5rem 1rem 1.5rem 1.5rem;
  overflow-y: scroll;
`;
const SidebarBottom = styled.div`
  background-color: rgba(250, 250, 250, 1);
  height: 30%;
  padding: 1rem 1.5rem;
  color: rgba(175, 175, 175, 1);
  display: flex;
  justify-content: center;
  align-items: center;
  user-select: none;
`;

const SidebarBottomList = styled.div`
  width: 100%;
  height: 100%;
  padding: 1rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #0b1618;
`;

const SidebarBottomTitle = styled.div`
  width: 100%;

  font-weight: bold;
  font-size: 1rem;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`;

const SidebarBottomLine = styled.div`
  width: 100%;
  color: #0b1618;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`;

const SidebarBottomLeft = styled.div`
  float: left;
  color: rgba(200, 200, 200, 1);
`;

const SidebarBottomRight = styled.div`
  float: right;
`;

const SideBarTitle = styled.h4`
  margin-bottom: 0.25rem;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: end;
  background-color: #004a91;
  color: #f2f5ff;
  padding: 0.7rem 0.7rem;
`;

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

const LoadingOverlay = styled.div`
  position: absolute;
  height: 100vh;
  width: 100%;
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
  flex: 1;
  height: 100%;
  div.leaflet-container {
    height: ${(props) => props.height};
  }
`;
const MapEventsHandler = ({ setZoom }) => {
  const map = useMapEvents({
    zoomend: () => {
      setZoom(map.getZoom());
    },
  });
  return null;
};

function setSimplifyFactor(zoom) {
  if (zoom >= 10) {
    return 0.5;
  } else if (zoom >= 5) {
    return 0.25;
  }

  return 0;
}
export const MAPCMap = ({ wrapperHeight = "100vh", mapFocus = "region", polyPoints = [], mapboxToken = process.env.REACT_APP_MAPBOX_TOKEN }) => {
  const [polygons, setPolygons] = useState([]);
  const [selectedFeature, setSelectedFeature] = useState();
  const [selectedType, setSelectedType] = useState();
  const [selectedProject, setSelectedProject] = useState();
  const [selectedProjectLink, setSelectedProjectLink] = useState();
  const [lastSelected, setLastSelected] = useState("feature");

  const [projectList, setProjectList] = useState({});

  const [zoom, setZoom] = useState(10);

  useEffect(() => {
    // AIRTABLE CMS
    var base = new Airtable({ apiKey: process.env.REACT_APP_AIRTABLE_TOKEN }).base("appuLlZwmGGeG3m9k");

    let tempProjectObject = {};
    base("Greenway Projects")
      .select({
        // Selecting the first 3 records in Grid view:
        view: "Grid view",
      })
      .eachPage(
        function page(records, fetchNextPage) {
          // This function (`page`) will get called for each page of records.

          records.forEach(function (record) {
            if (record != null && record.get("Status") == "Published") {
              tempProjectObject[record.get("Name")] = {
                Lat: record.get("Lat"),
                Long: record.get("Long"),
                Description: record.get("Description"),
                Link: record.get("Link"),
              };
            }
          });

          // To fetch the next page of records, call `fetchNextPage`.
          // If there are more records, `page` will get called again.
          // If there are no more records, `done` will get called.
          fetchNextPage();
        },
        function done(err) {
          if (err) {
            console.error(err);
            return;
          }
          setProjectList(tempProjectObject);
        }
      );
  }, []);

  useEffect(() => {
    const loadPolygons = async () => {
      // constants and feature query setup
      const clientId = process.env.REACT_APP_AGOL_CLIENT_ID;
      const clientSecret = process.env.REACT_APP_AGOL_CLIENT_SECRET;
      const token = await authenticateEsri(clientId, clientSecret);
      const serviceName = "simplified_muni_polygons_2";
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
              zIndex: -1,
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
  if (polygons.length == 0 && Object.keys(projectList).length == 0) {
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

  // if (polygons.length > 0) {
  //   for (let polyConfig of polygons) {
  //     // TODO: Set up default polygon colors in constants
  //     layers.push(<GeoJSON id={polyConfig.id} key={polyConfig.id} data={polyConfig.data} style={polyConfig.styleFunction} />);
  //   }
  // }

  function handleProjectClick(feature) {
    setSelectedProject(feature.target.options.name);
    console.log(feature.target.options);
    setLastSelected("project");
  }
  if (Object.keys(projectList).length > 0) {
    for (let projectName of Object.keys(projectList)) {
      const point = projectList[projectName];
      // TODO: Set up default point colors in constants
      if (point.Lat != undefined && point.Long != undefined) {
        layers.push(
          <Circle
            key={projectName}
            name={projectName}
            pathOptions={{ color: "blue", fillOpacity: "100%" }}
            radius={7500 / zoom}
            center={[point.Lat, point.Long]}
            eventHandlers={{
              click: handleProjectClick,
            }}
          />
        );
      }
    }
  }

  const pathWeight = 3.5 * (10.0 / zoom);

  // Hook to handle map events

  const seg_set = new Set();
  const fac_set = new Set();

  const LegendImages = [
    {
      src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAUklEQVQ4jWNhoDJgGTVwMIfh8mYHik2LrD3AwrC8uYGBkbGegRpgRcsBFqoZBgEOIzQdHgD5nSqm/f/fyMIQUeNIrSTDAPcylDNyIoWqYPAbCABWeRFT3pkxxQAAAABJRU5ErkJggg==",
      label: "Shared Use Path - Existing",
    },
    {
      src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAa0lEQVQ4jWNhoDJgGTVwMIfh8mYHikyKrD2AYqCDuMJ+XGoPvHqIVdxBTB6hhoGBEcXA/Y4xOA3DZWC9ti3cUEaGWIaRng4d9y8hWXPj1cNgjNXAAy8fOJJq4IGXD3C7EJaORlCkUAsMfgMB/mwdMxwBDPUAAAAASUVORK5CYII=",
      label: "	Shared Use Path - Design",
    },
    {
      src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAP0lEQVQ4jWNhoDJgGTVwRIXhipb9eFVG1DiSZiADgwP57hqaYUgDAw9Q18AI4mKReAOpBFioZRAMjBrIQDEAAEs9BWZ39nGZAAAAAElFTkSuQmCC",
      label: "Shared Use Path - Envisioned",
    },
    {
      src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAWUlEQVQ4jWNhoDJgGTVwEIfh8evzHSg1zFIz8QDL8etzGxgYGOsZGP5T7Lrj1+cfYIEYRi3w32FkpkPGAyC/U8e4/40slpqJjtRKMgwwL8M4IyZSqAsGv4EA6xAXTjXwwt0AAAAASUVORK5CYII=",
      label: "Shared Use Path - Unimproved Surface",
    },
    {
      src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAa0lEQVQ4jWNhoDJgGTVwMIdhwX8Hik2bwHiAhaHgfwMDA0M9xYaBQMH/AyxUMwwCHMBebvBgYLBXZqAIHLzLwNCwg1aR0rCDugYeAPmdSuY1sjBMYHSkVpJhgKdDKIcagIVaBsHAqIEMFAMAgzQUiXCJlQ0AAAAASUVORK5CYII=",
      label: "Protected Bike Lane and Sidewalk",
    },
    {
      src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAfUlEQVQ4jWNhoDJgGTVwMIdhwX8HikyawHgAxUAHFYb9uNQeuINd3EEFSQ0DAyOKgfuzcRuGy8B6d4ShjDlEhiFIAy7LkF04cAn7wB0GBsep2OVALndQwWEgLk34QONOCMZq4IE7DI6kGogtsljQ0xGlgIUahiCDUQMZKAYAmIobNPgRrgQAAAAASUVORK5CYII=",
      label: "Protected Bike Lane - Design or Construction",
    },
    {
      src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAa0lEQVQ4jWNhoDJgGTVwMIdhwX8Hik2bwHiAhaHgfwMDA0M9xYaBQMH/AyxUMwwCHMBebvBgYLBXZqAIHLzLwNCwg1aR0rCDugYeAPmdSuY1sjBMYHSkVpJhgKdDKIcagIVaBsHAqIEMFAMAgzQUiXCJlQ0AAAAASUVORK5CYII=",
      label: "Bike Lane and Sidewalk",
    },
    {
      src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAfUlEQVQ4jWNhoDJgGTVwMIdhwX8HikyawHgAxUAHFYb9uNQeuINd3EEFSQ0DAyOKgfuzcRuGy8B6d4ShjDlEhiFIAy7LkF04cAn7wB0GBsep2OVALndQwWEgLk34QONOCMZq4IE7DI6kGogtsljQ0xGlgIUahiCDUQMZKAYAmIobNPgRrgQAAAAASUVORK5CYII=",
      label: "Bike Lane - Design or Construction",
    },
    {
      src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAeklEQVQ4jWNhoDJgGTVwEIfh9cPzHSg1TNM28QDL9YNzGxgYGesZ/v+n2HXXD88/wAI2jFrg/38HsJdF5A0ZuPglKDLr28cXDG8enqdRpLx5eJ6KBjIyHgD5nSqm/f/fyKJpm+hIrSTDAPMyjEMNwEItg2Bg1EAGigEAv9oj5xnMMgAAAAAASUVORK5CYII=",
      label: "Shared Street - Urban",
    },
    {
      src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAXUlEQVQ4jWNhoDJgGTVwEIfh9cPzHSg1TNM28QDL9YNzGxgYGesZ/v+n2HXXD88/wAI2jFrg/3+HEZkOGRkPgPxOFdP+/29k0bRNdKRWkmGAeRnGGSmRQmUw+A0EAB1DG0sM6h4hAAAAAElFTkSuQmCC",
      label: "Shared Street - Suburban",
    },
    {
      src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAUklEQVQ4jWNhoDJgGTVwJIXh9UPz/mNVwch4QNM20RGu7vB8B4b///ejK9O0S2KkrQsHv4Ga0DAgBDRtEw+AQpaggdQCLFQzCQpGDaQcDP4wBADlKw2jsAsIggAAAABJRU5ErkJggg==",
      label: "Shared Street - Envisioned",
    },
    {
      src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAPElEQVQ4jWNhoDJgGTWQYsAygg38/7b+Pz6FjMKNjCQZSC3AMnQMZCQyjIg2kFqAhWomQcGogZQDqochAHmtBOfUu2ZZAAAAAElFTkSuQmCC",
      label: "Gap - Facility Type TBD",
    },
    {
      src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAATElEQVQ4jWNhoDJgGTWQYsAyAg38H8LgwMDIUM/AwOBAoVkHGP4zNLJQyTAQADmMFmH4n6ERZDLVvMy4huEAmDNykg3DqIGUAqqHIQBHUQwTGnLlIQAAAABJRU5ErkJggg==",
      label: "Foot Trail - Natural Surface",
    },
    {
      src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAXklEQVQ4jWNhoDJgGTWQYsAygg38H8LggEsR4xqGA8h8bGoZoWoQLmRk2I/DPJDCAyiGYVfLiGoglQALnPWfwZEYDSCv/Q/BrZYFWSGxrsCnloWByoBl1ECKweAPQwBVthIAfgs3GwAAAABJRU5ErkJggg==",
      label: "Foot Trail - Envisioned Natural Surface",
    },
    {
      src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAW0lEQVQ4jWNhoDJgGTVwJIXh/zCGBkoMYlwF0Y9w4X+GesrcxoBqIONqBkaGwR2GIQwOlBjEuIbhAIqBDIwM+ylzGwMjuoGNDFQALOjRTjUDqQVYqGYSw4g1EADiDgtqdh0lnwAAAABJRU5ErkJggg==",
      label: "Foot Trail - Roadway Section",
    },
    {
      src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAcklEQVQ4je2QUQ5AMBAFZ2UPxh3cB9cRd8DJKkTQZIuGH9FJ9qd5O+k+5WU0Cf/UoSvJQyHpGKz3446smf2HQh/wzUFTiFDBJhVf6CiIxdHAMht6ddYZ1o5+qEPxu7jdYcZod9hSx/rWMwdT+BaahDxlAnsJHovF/s4/AAAAAElFTkSuQmCC",
      label: "Foot Trail - Envisioned Roadway Section",
    },
  ];

  function handleFeatureClick(feature) {
    if (feature.layer.feature.properties) {
      setSelectedFeature(feature.layer.feature.properties);
      setLastSelected("feature");
    }
  }

  useEffect(() => {
    function mapType() {
      if (selectedFeature == undefined) {
        return;
      }
      let type = "";
      if (selectedFeature.seg_type == 1 && selectedFeature.fac_stat == 1) {
        type = "Shared Use Path - Existing";
      }
      if (selectedFeature.seg_type == 1 && selectedFeature.fac_stat == 2) {
        type = "Shared Use Path - Designed";
      }
      if (selectedFeature.seg_type == 1 && selectedFeature.fac_stat == 3) {
        type = "Shared Use Path - Envisioned";
      }
      if (selectedFeature.seg_type == 6) {
        type = "Shared Use Path - Unimproved Surface";
      }
      if (selectedFeature.seg_type == 2 && selectedFeature.fac_stat == 1) {
        type = "Protected Bike Lane and Sidewalk";
      }
      if (selectedFeature.seg_type == 2 && (selectedFeature.fac_stat == 2 || selectedFeature.fac_stat == 3)) {
        type = "Protected Bike Lane - Design or Construction";
      }
      if (selectedFeature.seg_type == 3 && selectedFeature.fac_stat == 1) {
        type = "Bike Lane and Sidewalk";
      }
      if (selectedFeature.seg_type == 3 && (selectedFeature.fac_stat == 2 || selectedFeature.fac_stat == 3)) {
        type = "Bike Lane - Design or Construction";
      }
      if (selectedFeature.seg_type == 4 && (selectedFeature.fac_stat == 3 || selectedFeature.fac_stat == 1)) {
        type = "Shared Street - Urban";
      }
      if (selectedFeature.seg_type == 5 && selectedFeature.fac_stat == 1) {
        type = "Shared Street - Suburban";
      }
      if (selectedFeature.seg_type == 5 && selectedFeature.fac_stat == 3) {
        type = "Shared Street - Envisioned";
      }
      if (selectedFeature.seg_type == 9) {
        type = "Gap - Facility Type TBD";
      }
      if (selectedFeature.seg_type == 11 && selectedFeature.fac_stat == 1) {
        type = "Foot Trail - Natural Surface";
      }
      if (selectedFeature.seg_type == 11 && (selectedFeature.fac_stat == 2 || selectedFeature.fac_stat == 3)) {
        type = "Foot Trail - Envisioned Natural Surface";
      }
      if (selectedFeature.seg_type == 12 && selectedFeature.fac_stat == 1) {
        type = "Foot Trail - Roadway Section";
      }
      if (selectedFeature.seg_type == 12 && (selectedFeature.fac_stat == 2 || selectedFeature.fac_stat == 3)) {
        type = "Foot-Trail - Envisioned Roadway Section";
      }

      setSelectedType(type);
    }

    mapType();
  }, [selectedFeature]);

  useEffect(() => {
    function mapProjectLink() {
      // TODO: once feature data has mapping for project name set project to relevant link (could potentially be found in projectList)
      let project = "";

      if (selectedFeature != null && selectedFeature.reg_name == "") {
      }

      setSelectedProjectLink(project);
    }
    mapProjectLink();
  }, [selectedFeature]);

  return (
    <Container>
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

          <ZoomControl position="bottomright" />
          <ScaleControl position="bottomright" />
          {/* <Legend>
          {LegendImages.map((legend) => {
            return (
              <LegendElement>
                <img src={legend.src} style={{ width: 30, height: 30 }} />
                <LegendText>{legend.label}</LegendText>
              </LegendElement>
            );
          })}
        </Legend> */}
          <MapEventsHandler setZoom={setZoom} />
          <FeatureLayer
            url="https://geo.mapc.org/server/rest/services/transportation/landlines/FeatureServer/0"
            simplifyFactor={setSimplifyFactor(zoom)}
            eventHandlers={{
              click: handleFeatureClick,
            }}
            style={(feature) => {
              let colorRow;
              let dashArray;
              seg_set.add(feature.properties.seg_type);
              fac_set.add(feature.properties.fac_stat);

              if (feature.properties.seg_type == 1) {
                colorRow = "#00a884";
              }
              if (feature.properties.seg_type == 1 && feature.properties.fac_stat == 3) {
                colorRow = "#00a884";
                dashArray = "3,8";
              } else if (feature.properties.seg_type == 6) {
                colorRow = "#c7d79e";
              } else if (feature.properties.seg_type == 2) {
                colorRow = "#0170ff";
              } else if (feature.properties.seg_type == 3) {
                colorRow = "#73b2ff";
              } else if (feature.properties.seg_type == 4 || feature.properties.seg_type == 5) {
                colorRow = "#d7c29e";
              }
              if (feature.properties.seg_type == 5 && feature.properties.fac_stat == 3) {
                colorRow = "#d7c29e";
                dashArray = "3,8";
              } else if (
                feature.properties.seg_type == 9 &&
                (feature.properties.fac_stat == 1 || feature.properties.fac_stat == 2 || feature.properties.fac_stat == 3)
              ) {
                colorRow = "#ffed7f";
                dashArray = "3,8";
              } else if (feature.properties.seg_type == 11) {
                colorRow = "#ff5b0a";
              }
              if (feature.properties.seg_type == 11 && (feature.properties.fac_stat == 3 || feature.properties.fac_stat == 2)) {
                colorRow = "#ff5b0a";
                // dashArray = "3,8";
              }
              if (feature.properties.seg_type == 12) {
                colorRow = "#ff732d";
              } else if (feature.properties.seg_type == 12 && (feature.properties.fac_stat == 3 || feature.properties.fac_stat == 2)) {
                colorRow = "#ff732d";
                dashArray = "3,8";
              }

              return {
                color: colorRow,
                stroke: colorRow,
                weight: pathWeight,
                fillOpacity: 0,
                opacity: 1,
                dashArray: dashArray,
                dashOffset: "0",
              };
            }}
            pane="tilePane"
          />
          {/* inverted dash extra layer */}
          <FeatureLayer
            url="https://geo.mapc.org/server/rest/services/transportation/landlines/FeatureServer/0"
            simplifyFactor={setSimplifyFactor(zoom)}
            style={(feature) => {
              let colorRow;
              let dashArray;
              if (feature.properties.seg_type == 1 && feature.properties.fac_stat == 2) {
                colorRow = "white";
                dashArray = "3,8";
              } else if (feature.properties.seg_type == 2 && feature.properties.fac_stat == 1) {
                colorRow = "white";
              } else if (feature.properties.seg_type == 2 && (feature.properties.fac_stat == 2 || feature.properties.fac_stat == 3)) {
                colorRow = "white";
                dashArray = "3,8";
              } else if (feature.properties.seg_type == 3 && (feature.properties.fac_stat == 2 || feature.properties.fac_stat == 3)) {
                colorRow = "white";
                dashArray = "3,8";
              } else if (feature.properties.seg_type == 4 && (feature.properties.fac_stat == 3 || feature.properties.fac_stat == 1)) {
                colorRow = "white";
              } else if (
                feature.properties.seg_type == 12 &&
                (feature.properties.fac_stat == 1 || feature.properties.fac_stat == 2 || feature.properties.fac_stat == 3)
              ) {
                colorRow = "white";
              }

              return {
                color: colorRow,
                stroke: colorRow,
                weight: pathWeight - 2.0,
                fillOpacity: 0,
                opacity: 1,
                dashArray: dashArray,
                dashOffset: "0",
              };
            }}
            pane="tilePane"
          />
          {layers}
        </MapContainer>
      </Wrapper>
      <RightSidebar>
        <SideBarTitle>
          <a href="https://www.mapc.org/transportation/landline/" style={{ position: "relative", color: "inherit", textDecoration: "none" }}>
            <img alt="MAPC logo" src={MAPCLogo} style={{ marginRight: "0.5rem", width: 90, height: "auto" }} />
            <span style={{ position: "relative", bottom: "-16px" }}>LandLine</span>
          </a>
        </SideBarTitle>
        <SidebarTop>
          {LegendImages.map((legend) => {
            return (
              <LegendElement>
                <img src={legend.src} style={{ width: 30, height: 30 }} />
                {legend.label == selectedType ? <LegendTextStrong>{legend.label}</LegendTextStrong> : <LegendText>{legend.label}</LegendText>}
              </LegendElement>
            );
          })}
        </SidebarTop>
        <SidebarBottom>
          {lastSelected == "feature" ? (
            selectedFeature !== undefined ? (
              <SidebarBottomList>
                <SidebarBottomTitle>Landline</SidebarBottomTitle>
                <SidebarBottomLine>
                  <SidebarBottomLeft>Name:</SidebarBottomLeft>
                  <SidebarBottomRight>{}</SidebarBottomRight>
                </SidebarBottomLine>
                <SidebarBottomLine>
                  <SidebarBottomLeft>Type:</SidebarBottomLeft>
                  <SidebarBottomRight>{selectedType}</SidebarBottomRight>
                </SidebarBottomLine>
                <SidebarBottomLine>
                  <SidebarBottomLeft>Project:</SidebarBottomLeft>
                  <SidebarBottomRight>{selectedFeature.reg_name}</SidebarBottomRight>
                </SidebarBottomLine>
                <SidebarBottomLine>
                  <SidebarBottomLeft>Link:</SidebarBottomLeft>
                  <SidebarBottomRight>{selectedProjectLink}</SidebarBottomRight>
                </SidebarBottomLine>
              </SidebarBottomList>
            ) : (
              "Select a landline"
            )
          ) : selectedProject !== undefined ? (
            <SidebarBottomList>
              <SidebarBottomTitle>Project</SidebarBottomTitle>
              <SidebarBottomLine>
                <SidebarBottomLeft>Name:</SidebarBottomLeft>
                <SidebarBottomRight>{selectedProject}</SidebarBottomRight>
              </SidebarBottomLine>
              <SidebarBottomLine>
                <SidebarBottomLeft>Latitude:</SidebarBottomLeft>
                <SidebarBottomRight>{projectList[selectedProject].Lat}</SidebarBottomRight>
              </SidebarBottomLine>
              <SidebarBottomLine>
                <SidebarBottomLeft>Longitude:</SidebarBottomLeft>
                <SidebarBottomRight>{projectList[selectedProject].Long}</SidebarBottomRight>
              </SidebarBottomLine>
              <SidebarBottomLine>
                <SidebarBottomLeft>Link:</SidebarBottomLeft>
                <SidebarBottomRight>
                  <a href={projectList[selectedProject].Link} target="_blank" style={{ overflowX: "ellipses" }}>
                    {projectList[selectedProject].Link}
                  </a>
                </SidebarBottomRight>
              </SidebarBottomLine>
              <SidebarBottomLine>
                <SidebarBottomLeft>Description:</SidebarBottomLeft>
                <SidebarBottomRight>{projectList[selectedProject].Description}</SidebarBottomRight>
              </SidebarBottomLine>
            </SidebarBottomList>
          ) : (
            "Select a project"
          )}
        </SidebarBottom>
      </RightSidebar>
    </Container>
  );
};

export default MAPCMap;
