import React, { useState, useEffect, useRef } from "react";

import { openDB } from "idb";

import styled from "styled-components";

import Spinner from "react-bootstrap/Spinner";
import Nav from "react-bootstrap/Nav";
import Form from "react-bootstrap/Form";
import Overlay from "react-bootstrap/Overlay";

import arcgisPbfDecode from "arcgis-pbf-parser";

import MAPCLogo from "./assets/mapc-semitransparent.svg";
import { MapContainer, TileLayer, ZoomControl, GeoJSON, Circle, useMapEvents, ScaleControl, useMap } from "react-leaflet";

import "leaflet/dist/leaflet.css";
import "bootstrap/dist/css/bootstrap.min.css";

// Importing "for side effects", i.e., to extend leaflet with smooth scrolling
import "./SmoothScroll.js";

import { FeatureLayer } from "react-esri-leaflet";

import Airtable from "airtable";
import LandlineGreenway from "./LandlineGreenway";


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
const stateMapProps = {
  center: [42.030590752172635, -71.82353838842278],
  zoom: zoomLevels.region,
  zoomDelta: 0.25,
  maxZoom: zoomLevels.parcel,
  minZoom: zoomLevels.state,
  zoomSnap: 0.25,
};

const regionMapProps = {
  center: [42.3457, -71.17852],
  zoom: zoomLevels.region,
  zoomDelta: 0.25,
  maxZoom: zoomLevels.parcel,
  minZoom: zoomLevels.state,
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

  &:hover {
    color: ${(props) => (props.selectable ? "#C7004E" : "")};
  }
  cursor: ${(props) => (props.selectable ? "pointer" : "auto")};
`;

const LegendWrapper = styled.div`
  margin-top: 1rem;
  overflow-y: scroll;
  height: calc(100% - 4rem);
`;

const LegendText = styled.div`
  margin-left: 1rem;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  position: relative;
  /* top: -1px; */
`;
const LegendTextStrong = styled.div`
  margin-left: 1rem;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-weight: bold;
  position: relative;
  top: -2px;
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
  overflow-y: hidden;
`;

const SidebarTop = styled.div`
  height: 65%;
  border-style: solid;
  border-color: rgba(225, 225, 225, 1);
  border-width: 0 0 2px 0;
  padding: 0.5rem 1rem 1.5rem 1.5rem;
`;
const SidebarBottom = styled.div`
  background-color: rgba(250, 250, 250, 1);
  height: 35%;
  padding: 1rem 1.5rem;
  color: rgba(175, 175, 175, 1);
  display: flex;
  justify-content: center;
  align-items: center;
  user-select: none;
  overflow-y: scroll;
`;

const SidebarBottomList = styled.div`
  width: 100%;
  height: 100%;
  padding: 1rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: start;
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
  color: rgba(160, 160, 160, 1);
  width: 40%;
`;

const SidebarBottomRight = styled.div`
  float: right;
  overflow: hidden;

  overflow-y: ${(props) => (props.wrap ? "scroll" : "hidden")};
  white-space: ${(props) => (props.wrap ? "normal" : "nowrap")};
  text-overflow: ellipsis;
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

  display: flex;
  align-items: center;
  justify-content: center;
`;

const LoadingIndicator = styled(Spinner)``;

const Wrapper = styled.div`
  flex: 1;
  height: 100%;
  div.leaflet-container {
    height: ${(props) => props.height};
  }
`;

const StyledSwitch = styled(Form.Check)`
  position: absolute;
  z-index: 999;
  background-color: white;

  border-style: solid;
  border-width: 2px;
  border-color: rgba(100, 100, 100, 0.5);
  border-radius: 5px;

  padding: 0.5rem 1rem 0.5rem 2.75rem;
  right: 2rem;

  cursor: pointer;
  width: 13rem;
`;

const StyledBasemapButton = styled.div`
  position: absolute;
  z-index: 999;

  background-color: white;
  border-style: solid;
  border-width: 2px;
  border-color: rgba(100, 100, 100, 0.5);
  border-radius: 5px;

  padding: 0.75rem 0.75rem;
  top: 16rem;
  right: 1rem;
  cursor: pointer;
`;

const BasemapOverlay = styled.div`
  z-index: 9999;

  background-color: white;
  border-style: solid;
  border-width: 2px;
  border-color: rgba(100, 100, 100, 0.5);
  border-radius: 5px;

  padding: 0.75rem 0.75rem;
  margin-right: 0.5rem;
`;

const BasemapRadios = styled(Form.Check)`
  z-index: 999;
`;

const MapEventsHandler = ({ setZoom }) => {
  const map = useMapEvents({
    zoomend: () => {
      setZoom(map.getZoom());
    },
  });
  return null;
};

// UTILS
export const createTileURL = (style = "light-v10", token = process.env.MAPBOX_TOKEN) => {
  const params = new URLSearchParams();
  params.set("access_token", token || "");
  const stylePath = `styles/v1/mapbox/${style}/tiles/{z}/{x}/{y}/`;
  return `${mapboxBaseURL}${stylePath}?${params}`;
};

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

const featureColors = {
  sharedUse: "#00a884",
  sharedUseUnimproved: "#c7d79e",
  protectedBikeLane: "#0170ff",
  bikeLane: "#73b2ff",
  sharedStreet: "#d7c29e",
  Gap: "#ffffcc",
  footTrail: "#ffcccc",
};

// Hook to handle map events
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
    src: (
      <svg width="30" height="30" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="15" x2="30" y2="15" stroke="#888888" stroke-width="8" />
        <line x1="0" y1="15" x2="30" y2="15" stroke={featureColors.Gap} stroke-width="7" />
      </svg>
    ),
    label: "Gap - Facility Type TBD",
  },
  {
    src: (
      <svg width="30" height="30" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="15" x2="30" y2="15" stroke={featureColors.footTrail} stroke-width="8" />
      </svg>
    ),
    label: "Foot Trail - Existing",
  },
  {
    src: (
      <svg width="30" height="30" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="15" x2="30" y2="15" stroke={featureColors.footTrail} stroke-width="8" stroke-dasharray="12, 5" />
      </svg>
    ),
    label: "Foot Trail - Envisioned",
  },
];

// map overlay to relevant basemap URLs
const basemaps = {
  "Topo - ESRI (Default)": {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community",
  },
  "Topo - USGS": {
    url: "https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}",
    attribution: 'Tiles courtesy of the <a href="https://usgs.gov/">U.S. Geological Survey</a>',
  },
  "CartoDB Voyager": {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  "Imagery - ESRI": {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
  },
};

const CreateCustomPanes = () => {
  const map = useMap();

  useEffect(() => {
    map.createPane("outlinePane");
    map.getPane("outlinePane").style.zIndex = 400;
    map.createPane("mainPane");
    map.getPane("mainPane").style.zIndex = 500;
    map.createPane("pointPane");
    map.getPane("pointPane").style.zIndex = 600;
  }, [map]);

  return null;
};

export const MAPCMap = ({ wrapperHeight = "100vh", mapFocus = "region", polyPoints = [], mapboxToken = process.env.REACT_APP_MAPBOX_TOKEN }) => {
  const [polygons, setPolygons] = useState([]);
  const [selectedFeature, setSelectedFeature] = useState();
  const [selectedType, setSelectedType] = useState();
  const [selectedProject, setSelectedProject] = useState();
  const [selectedProjectLink, setSelectedProjectLink] = useState();
  const [lastSelected, setLastSelected] = useState("feature");
  const [selectedTab, setSelectedTab] = useState("landlines");

  const [showProjects, setShowProjects] = useState(true);
  const [projectList, setProjectList] = useState({});

  const [zoom, setZoom] = useState(10);
  const [simplifyFactor, setSimplifyFactor] = useState(0);

  const target = useRef(null);
  const [showBaseMaps, setShowBaseMaps] = useState(false);
  const [selectedBasemap, setSelectedBasemap] = useState("Topo - ESRI (Default)");

  const [showPolygons, setShowPolygons] = useState(true);
  const [showExisting, setShowExisting] = useState(true);
  const [showDesignConstruction, setShowDesignConstruction] = useState(true);
  const [showEnvisioned, setShowEnvisioned] = useState(true);
  const [showGaps, setShowGaps] = useState(false);
  const [featureQuery, setFeatureQuery] = useState("1=1");
  const [featureLayerKey, setFeatureLayerKey] = useState(0);

  const negativeFeatureQuery =
    "(seg_type = 1 AND fac_stat =2 OR seg_type = 2 OR seg_type = 3 AND fac_stat = 2 OR seg_type = 3 AND fac_stat = 3 OR seg_type = 4 AND fac_stat = 1 OR seg_type = 4 AND fac_stat = 3 OR seg_type = 12 OR seg_type = 9)";

  const [isLoading, setIsLoading] = useState(true);

  let pathWeight = 4.0 * (10.0 / zoom);

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

  let focusProps = regionMapProps; // Default: MAPC regional map
  if (mapFocus === "state") {
    focusProps = stateMapProps;
  }

  let layers = [];
  // show loading indicator on loading any layer or loading CMS data
  if (Object.keys(projectList).length == 0 || isLoading || (showPolygons && polygons.length == 0)) {
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
              color: "#666666",
              weight: 1.25,
              fillOpacity: 0.0,
              opacity: 0.6,
              zIndex: -1000,
            };
          },
          data: polygonData.features,
        },
      ]);
    };
    if (showPolygons) {
      loadPolygons();
    }
  }, []);

  if (polygons.length > 0 && showPolygons) {
    for (let polyConfig of polygons) {
      // TODO: Set up default polygon colors in constants
      layers.push(<GeoJSON id={polyConfig.id} key={polyConfig.id} data={polyConfig.data} interactive={false} style={polyConfig.styleFunction} />);
    }
  }

  // on project selection, set current project state, clear feature state to remove ambiguity and reduce confusion
  function handleProjectClick(feature) {
    setSelectedProject(feature.target.options.name);
    setSelectedFeature();
    setSelectedType();
    setLastSelected("project");
  }

  function handleProjectSelect(project) {
    setSelectedProject(project);
    setSelectedFeature();
    setSelectedType();
    setLastSelected("project");
  }

  if (Object.keys(projectList).length > 0 && showProjects) {
    // render all points from Airtable CMS point layer base ( CMS - Landlines )
    for (let projectName of Object.keys(projectList)) {
      const point = projectList[projectName];
      if (point.Lat != undefined && point.Long != undefined) {
        layers.push(
          <Circle
            key={projectName}
            name={projectName}
            pathOptions={{ color: projectName == selectedProject ? "red" : "blue", fillOpacity: "100%" }}
            radius={90000 / Math.pow(zoom - 2, 2.6)}
            center={[point.Lat, point.Long]}
            eventHandlers={{
              click: handleProjectClick,
            }}
            pane="pointPane"
          />
        );
      }
    }
  }

  function handleFeatureClick(feature) {
    
    if (feature.layer.feature.properties) {
      setSelectedFeature(feature.layer.feature.properties);
      setSelectedProject();
      setLastSelected("feature");
    }
  }

  useEffect(() => {
    // map the selectedFeature's properties to determine feature type to display on data description
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
        type = "Foot Trail - Existing";
      }
      if (selectedFeature.seg_type == 11 && (selectedFeature.fac_stat == 2 || selectedFeature.fac_stat == 3)) {
        type = "Foot Trail - Envisioned";
      }
      if (selectedFeature.seg_type == 12 && selectedFeature.fac_stat == 1) {
        type = "Foot Trail - Existing";
      }
      if (selectedFeature.seg_type == 12 && (selectedFeature.fac_stat == 2 || selectedFeature.fac_stat == 3)) {
        type = "Foot-Trail - Envisioned";
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

  useEffect(() => {
    // generate where queries for featureLayer query
    const generateQuery = () => {
      
      const query = [];

      if (showExisting || showGaps) {
        query.push("fac_stat = 1");
      }
      if (showDesignConstruction) {
        query.push("fac_stat = 2");
      }
      if (showEnvisioned || showGaps) {
        query.push("fac_stat = 3");
      }

      if (query.length > 0) {
        return "(" + query.join(" OR ") + ")";
      }
      return "0=1";

      
    };
   
    setFeatureQuery(generateQuery);
    setIsLoading(true);
    setFeatureLayerKey(prevKey => prevKey + 1); 
  }, [showEnvisioned, showDesignConstruction, showExisting, showGaps]);

  useEffect(() => {
    if (simplifyFactor != 0.5 && zoom >= 10) {
      setSimplifyFactor(0.5);
    } else if (simplifyFactor != 0.25 && zoom >= 5) {
      setSimplifyFactor(0.25);
    } else if (simplifyFactor != 0) {
      setSimplifyFactor(0);
    }
  }, [zoom]);

  function handleSelectTab(eventKey) {
    setSelectedTab(eventKey);
  }

  return (
    <Container>
      <Wrapper height={wrapperHeight}>
        <MapContainer
          {...focusProps}
          zoomControl={false}
          preferCanvas={false}
          scrollWheelZoom={true}
          smoothWheelZoom={true} // enable smooth zoom
          smoothSensitivity={2.5} // zoom speed. default is 1
        >
          <CreateCustomPanes />
          {/* feature toggles */}
          <Form style={{ position: "absolute", width: "100%", left: "1rem", top: "1rem" }}>
            <StyledSwitch
              checked={showProjects}
              onChange={() => {
                setShowProjects(!showProjects);
              }}
              type="switch"
              id="custom-switch"
              label="Toggle Active Projects"
              style={{ top: "0rem" }}
            />
            <StyledSwitch
              checked={showExisting}
              onChange={() => {
                setShowExisting(!showExisting);
              }}
              type="switch"
              id="custom-switch"
              label="Existing Greenways"
              style={{ top: "3rem" }}
            />
            <StyledSwitch
              checked={showDesignConstruction}
              onChange={() => {
                setShowDesignConstruction(!showDesignConstruction);
              }}
              type="switch"
              id="custom-switch"
              label="In Design or Construction"
              style={{ top: "6rem" }}
            />

            <StyledSwitch
              checked={showEnvisioned}
              onChange={() => {
                setShowEnvisioned(!showEnvisioned);
              }}
              type="switch"
              id="custom-switch"
              label="Envisioned"
              style={{ top: "9rem" }}
            />

            <StyledSwitch
                checked={showGaps}
                onChange={() => {
                  setShowGaps(!showGaps);
                }}
                type="switch"
                id="custom-switch-gaps"
                label="Show Gap Features"
                style={{ top: "15rem" }}
              />
            

            <StyledSwitch
              checked={showPolygons}
              onChange={() => {
                setShowPolygons(!showPolygons);
              }}
              type="switch"
              id="custom-switch"
              label="Municipal Boundaries"
              style={{ top: "12rem" }}
            />

            

          </Form>
          <StyledBasemapButton
            ref={target}
            onClick={() => {
              setShowBaseMaps(!showBaseMaps);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-map" viewBox="0 0 16 16">
              <path
                fillRule="evenodd"
                d="M15.817.113A.5.5 0 0 1 16 .5v14a.5.5 0 0 1-.402.49l-5 1a.5.5 0 0 1-.196 0L5.5 15.01l-4.902.98A.5.5 0 0 1 0 15.5v-14a.5.5 0 0 1 .402-.49l5-1a.5.5 0 0 1 .196 0L10.5.99l4.902-.98a.5.5 0 0 1 .415.103M10 1.91l-4-.8v12.98l4 .8zm1 12.98 4-.8V1.11l-4 .8zm-6-.8V1.11l-4 .8v12.98z"
              />
            </svg>
          </StyledBasemapButton>

          <Overlay target={target.current} show={showBaseMaps} placement="left-start">
            {({
              placement: _placement,
              arrowProps: _arrowProps,
              show: _show,
              popper: _popper,
              hasDoneInitialMeasure: _hasDoneInitialMeasure,
              ...props
            }) => (
              <BasemapOverlay
                {...props}
                style={{
                  ...props.style,
                }}
              >
                <Form>
                  {Object.keys(basemaps).map((basemap) => {
                    return (
                      <BasemapRadios
                        checked={basemap == selectedBasemap}
                        onChange={() => {
                          setSelectedBasemap(basemap);
                        }}
                        type="radio"
                        id="custom-radio"
                        label={basemap}
                      />
                    );
                  })}
                </Form>
              </BasemapOverlay>
            )}
          </Overlay>

          <TileLayer
            key={selectedBasemap}
            url={basemaps[selectedBasemap].url}
            attribution={basemaps[selectedBasemap].attribution}
            tileSize={512}
            zoomOffset={-1}
          />

          <ZoomControl position="bottomright" />
          <ScaleControl position="bottomright" />

          <MapEventsHandler setZoom={setZoom} />
          {layers}
          <FeatureLayer
            url="https://geo.mapc.org/server/rest/services/transportation/landlines/FeatureServer/0"
            key={`${featureQuery}-${featureLayerKey}`} //FORCE RELOAD ON QUERY CHANGE
            simplifyFactor={simplifyFactor}
            eventHandlers={{
              click: handleFeatureClick,
              load: () => setIsLoading(false),
            }}
            where={featureQuery}
            style={(feature) => {
              let colorRow;
              let dashArray;

              if (feature.properties.seg_type == 1) {
                colorRow = featureColors.sharedUse;
              }
              if (feature.properties.seg_type == 1 && feature.properties.fac_stat == 3) {
                colorRow = featureColors.sharedUse;
                dashArray = "3,8";
              } else if (feature.properties.seg_type == 6) {
                colorRow = featureColors.sharedUseUnimproved;
              } else if (feature.properties.seg_type == 2) {
                colorRow = featureColors.protectedBikeLane;
              } else if (feature.properties.seg_type == 3) {
                colorRow = featureColors.bikeLane;
              } else if (feature.properties.seg_type == 4 || feature.properties.seg_type == 5) {
                colorRow = featureColors.sharedStreet;
              }
              if (feature.properties.seg_type == 5 && feature.properties.fac_stat == 3) {
                colorRow = featureColors.sharedStreet;
                dashArray = "3,8";
              } else if (
                feature.properties.seg_type == 9 &&
                (feature.properties.fac_stat == 1 || feature.properties.fac_stat == 2 || feature.properties.fac_stat == 3)
              ) {
                colorRow = "#888888";
              }

              if (feature.properties.seg_type == 11 && feature.properties.fac_stat == 1) {
                colorRow = featureColors.footTrail;
              } else if (feature.properties.seg_type == 11 && (feature.properties.fac_stat == 3 || feature.properties.fac_stat == 2)) {
                colorRow = featureColors.footTrail;
                dashArray = "3,8";
              }
              if (feature.properties.seg_type == 12 && feature.properties.fac_stat == 1) {
                colorRow = featureColors.footTrail;
              } else if (feature.properties.seg_type == 12 && (feature.properties.fac_stat == 3 || feature.properties.fac_stat == 2)) {
                colorRow = featureColors.footTrail;
                dashArray = "3,8";
              }
              let isGapFeature = feature.properties.seg_type === 9;
              if (showGaps && !showEnvisioned) {
                colorRow = isGapFeature ? '#FF0000' : '#4f1a32'; // Red for gap, default for non-gap when showing gap features only
              } else if (showEnvisioned) {
                // Handle cases when Envisioned is shown
                colorRow = isGapFeature ? featureColors.Gap : colorRow; // Yellow for gap if envisioned, keep previous color for non-gap
              }
              
              return {
                color: colorRow,
                stroke: colorRow,
                weight: pathWeight,
                fillOpacity: 0,
                opacity: 1,
                dashArray: dashArray,
                dashOffset: "0",
                zIndex: 1000,
              };
            }}
            pane="outlinePane"
          />
          {/* inverted dash extra layer */}
          <FeatureLayer
            url="https://geo.mapc.org/server/rest/services/transportation/landlines/FeatureServer/0"
            simplifyFactor={simplifyFactor}
            where={featureQuery + " AND " + negativeFeatureQuery}
            style={(feature) => {
              let colorRow;
              let dashArray;
              pathWeight = 3.5 * (10.0 / zoom);

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
              }

              let isGapFeature = feature.properties.seg_type === 9;
              if (showGaps && !showEnvisioned) {
                colorRow = isGapFeature ? '#FF0000' : '#4f1a32'; // Red for gap, default for non-gap when showing gap features only
              } else if (showEnvisioned) {
                // Handle cases when Envisioned is shown
                colorRow = isGapFeature ? featureColors.Gap : colorRow; // Yellow for gap if envisioned, keep previous color for non-gap
              }
              
              return {
                color: colorRow,
                stroke: colorRow,
                weight: pathWeight,
                fillOpacity: 0,
                opacity: 1,
                dashArray: dashArray,
                dashOffset: "0",
                zIndex: 1001,
              };
            }}
            pane="mainPane"
          />
        </MapContainer>
        <LandlineGreenway style={{ zIndex: "10000000", position:'absolute'}}></LandlineGreenway>
      </Wrapper>
      <RightSidebar>
        <SideBarTitle>
          {/* sidebar title header */}
          <a href="https://www.mapc.org/transportation/landline/" style={{ position: "relative", color: "inherit", textDecoration: "none" }}>
            <img alt="MAPC logo" src={MAPCLogo} style={{ marginRight: "0.5rem", width: 90, height: "auto" }} />
            <span style={{ position: "relative", bottom: "-16px" }}>LandLine Map</span>
          </a>
        </SideBarTitle>
        <SidebarTop>
          {/* tab selection */}
          <Nav justify variant="tabs" defaultActiveKey="landlines" onSelect={handleSelectTab}>
            <Nav.Item>
              <Nav.Link eventKey="landlines" style={{ height: "100%" }}>
                Landline Greenways
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="projects">Active Projects</Nav.Link>
            </Nav.Item>
          </Nav>
          <LegendWrapper>
            {/* render selected tab */}
            {selectedTab == "landlines" ? (
              <>
                {LegendImages.map((legend) => {
                  return (
                    <LegendElement>
                      {typeof legend.src === "string" ? <img src={legend.src} style={{ width: 30, height: 30 }} /> : legend.src}

                      {legend.label == selectedType ? <LegendTextStrong>{legend.label}</LegendTextStrong> : <LegendText>{legend.label}</LegendText>}
                    </LegendElement>
                  );
                })}
                <LegendElement>
                  <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg" fill={"blue"}>
                    <circle cx="15" cy="15" r="7" />
                  </svg>
                  <LegendText>{"Greenway Project"}</LegendText>
                </LegendElement>
                <LegendElement>
                  <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg" fill={"red"}>
                    <circle cx="15" cy="15" r="7" />
                  </svg>
                  <LegendText>{"Selected Greenway Project"}</LegendText>
                </LegendElement>
              </>
            ) : (
              Object.keys(projectList).map((project) => {
                return (
                  <LegendElement
                    onClick={() => {
                      handleProjectSelect(project);
                    }}
                    selectable
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="30"
                      height="30"
                      fill={project == selectedProject ? "red" : "currentColor"}
                      className="bi bi-geo-alt-fill"
                      viewBox="0 0 25 25"
                    >
                      <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6" />
                    </svg>
                    {project == selectedProject ? (
                      <LegendTextStrong
                        onClick={() => {
                          handleProjectSelect(project);
                        }}
                      >
                        {project}
                      </LegendTextStrong>
                    ) : (
                      <LegendText
                        onClick={() => {
                          handleProjectSelect(project);
                        }}
                      >
                        {project}
                      </LegendText>
                    )}
                  </LegendElement>
                );
              })
            )}
          </LegendWrapper>
         
        </SidebarTop>
        <SidebarBottom>
          {lastSelected == "feature" ? (
            selectedFeature !== undefined ? (
              <SidebarBottomList>
                <SidebarBottomTitle>Landline</SidebarBottomTitle>
                <SidebarBottomLine>
                  <SidebarBottomLeft>Name:</SidebarBottomLeft>
                  <SidebarBottomRight>{"N/A"}</SidebarBottomRight>
                </SidebarBottomLine>
                <SidebarBottomLine>
                  <SidebarBottomLeft>Type:</SidebarBottomLeft>
                  <SidebarBottomRight>{selectedType ? selectedType : "N/A"}</SidebarBottomRight>
                </SidebarBottomLine>
                <SidebarBottomLine>
                  <SidebarBottomLeft>Project:</SidebarBottomLeft>
                  <SidebarBottomRight>{selectedFeature.reg_name ? selectedFeature.reg_name : "N/A"}</SidebarBottomRight>
                </SidebarBottomLine>
                <SidebarBottomLine>
                  <SidebarBottomLeft>Link:</SidebarBottomLeft>
                  <SidebarBottomRight>{selectedProjectLink ? selectedProjectLink : "N/A"}</SidebarBottomRight>
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
                <SidebarBottomRight>{projectList[selectedProject].Lat ? projectList[selectedProject].Lat : "N/A"}</SidebarBottomRight>
              </SidebarBottomLine>
              <SidebarBottomLine>
                <SidebarBottomLeft>Longitude:</SidebarBottomLeft>
                <SidebarBottomRight>{projectList[selectedProject].Long ? projectList[selectedProject].Long : "N/A"}</SidebarBottomRight>
              </SidebarBottomLine>
              <SidebarBottomLine>
                <SidebarBottomLeft>Link:</SidebarBottomLeft>
                <SidebarBottomRight>
                  {projectList[selectedProject].Link ? (
                    <a
                      href={projectList[selectedProject].Link}
                      target="_blank"
                      style={{ overflowX: "ellipses", display: "block", textAlign: "end", width: "100%" }}
                    >
                      {projectList[selectedProject].Link}
                    </a>
                  ) : (
                    "N/A"
                  )}
                </SidebarBottomRight>
              </SidebarBottomLine>
              <SidebarBottomLine>
                <SidebarBottomLeft>Description:</SidebarBottomLeft>
                <SidebarBottomRight wrap>
                  {projectList[selectedProject].Description ? projectList[selectedProject].Description : "N/A"}
                </SidebarBottomRight>
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
