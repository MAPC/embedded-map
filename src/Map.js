import React, { useState, useEffect } from "react";

import { openDB } from "idb";

import styled from "styled-components";

import Spinner from "react-bootstrap/Spinner";

import arcgisPbfDecode from "arcgis-pbf-parser";

import { MapContainer, TileLayer, ZoomControl, GeoJSON, Circle, useMapEvents, ScaleControl } from "react-leaflet";

import "leaflet/dist/leaflet.css";
import "bootstrap/dist/css/bootstrap.min.css";

// Importing "for side effects", i.e., to extend leaflet with smooth scrolling
import "./SmoothScroll";
import { polygon } from "leaflet";
import { FeatureLayer } from "react-esri-leaflet";

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
  width: 30%;
  height: 40%;
  background-color: rgba(255, 255, 255, 1);
  bottom: calc(50% - 20%);
  right: 0.8rem;
  z-index: 1000;
  display: grid;
  grid-template-columns: 2fr;
  padding: 1%;
  overflow-y: scroll;
  overflow-x: hidden;
  text-overflow: ellipsis;
`;

const LegendElement = styled.div`
  display: flex;
  flex-direction: row;

  width: 100%;
  height: 100%;
`;

const LegendText = styled.div`
  margin-left: 1rem;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
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
export const MAPCMap = ({ wrapperHeight = "100vh", mapFocus = "region", points = [], mapboxToken = process.env.REACT_APP_MAPBOX_TOKEN }) => {
  const [polygons, setPolygons] = useState([]);
  const [zoom, setZoom] = useState(10);

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

  const pathWeight = 4.0 * (10.0 / zoom);

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
        {/* {layers} */}

        <ZoomControl position="bottomright" />
        <ScaleControl position="topright" />
        <Legend>
          {LegendImages.map((legend) => {
            return (
              <LegendElement>
                <img src={legend.src} style={{ width: 30, height: 30 }} />
                <LegendText>{legend.label}</LegendText>
              </LegendElement>
            );
          })}
        </Legend>
        <MapEventsHandler setZoom={setZoom} />
        <FeatureLayer
          url="https://geo.mapc.org/server/rest/services/transportation/landlines/FeatureServer/0"
          simplifyFactor={setSimplifyFactor(zoom)}
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
      </MapContainer>
    </Wrapper>
  );
};

export default MAPCMap;