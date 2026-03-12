import { openDB } from "idb";
import arcgisPbfDecode from "arcgis-pbf-parser";

const MAP_DB = "MapCache";
const AGOL_ORG_HASH = "c5WwApDsDjRhIVkH";
const GEOMETRY_STORE = "geometries";
const mapboxBaseURL = "https://api.mapbox.com/";

const zoomLevels = {
  country: 4,
  state: 8.5,
  region: 10,
  municipality: 11,
  neighborhood: 13,
  censusTract: 15,
  parcel: 18,
};

export const stateMapProps = {
  center: [42.030590752172635, -71.82353838842278],
  zoom: zoomLevels.region,
  zoomDelta: 1,
  maxZoom: zoomLevels.parcel,
  minZoom: zoomLevels.state,
  zoomSnap: 1,
};

export const regionMapProps = {
  center: [42.3457, -71.17852],
  zoom: zoomLevels.region,
  zoomDelta: 1,
  maxZoom: zoomLevels.parcel,
  minZoom: zoomLevels.state,
  zoomSnap: 1,
};

export const basemaps = {
  "ArcGIS - Topographic": {
    name: "arcgis/topographic",
  },
  "ArcGIS - Imagery": {
    name: "arcgis/imagery",
  },
  "ArcGIS - Dark Gray": {
    name: "arcgis/dark-gray",
  },
  "OpenStreetMaps - Standard Relief": {
    name: "osm/standard-relief",
  },
  "OpenStreetMaps - Light Gray": {
    name: "osm/light-gray",
  },
};

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

/* eslint-disable no-unused-vars */
const readFeatureCollection = async (cacheKey) => {
  const mapDB = await openDB(MAP_DB, 2, {
    upgrade: (db, oldVersion, newVersion, transaction, event) => {
      // Geometries are stored as GeoJSON FeatureCollection with a "name" property at the root level
      // The "name" corresponds to the layer name in AGOL
      const objectStore = db.createObjectStore(GEOMETRY_STORE, {
        keyPath: "name",
      });
      objectStore.createIndex("name", "name", { unique: true });
    },
    blocked: (currentVersion, blockedVersion, event) => {
      // TODO?
    },
    blocking: (currentVersion, blockedVersion, event) => {
      // TODO?
    },
    terminated: () => {
      // TODO?
    },
  });
  const store = mapDB.transaction(GEOMETRY_STORE).objectStore(GEOMETRY_STORE);
  const polygons = await store.get(cacheKey);
  return polygons;
};

const writeFeatureCollection = async (featureCollection) => {
  const mapDB = await openDB(MAP_DB, 2, {
    upgrade: (db, oldVersion, newVersion, transaction, event) => {
      // Geometries are stored as GeoJSON FeatureCollection with a "name" property at the root level
      // The "name" corresponds to the layer name in AGOL
      const objectStore = db.createObjectStore(GEOMETRY_STORE, {
        keyPath: "name",
      });
      objectStore.createIndex("name", "name", { unique: true });
    },
    blocked: (currentVersion, blockedVersion, event) => {
      // TODO
    },
    blocking: (currentVersion, blockedVersion, event) => {
      // TODO
    },
    terminated: () => {
      // TODO
    },
  });
  const store = mapDB.transaction(GEOMETRY_STORE, "readwrite").objectStore(GEOMETRY_STORE);
  await store.put(featureCollection);
};
/* eslint-enable no-unused-vars */

export const getAGOLLayerURL = (serviceName, layerID = null) => {
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
      `https://services.arcgis.com/${AGOL_ORG_HASH}/ArcGIS/rest/services/${serviceName}/FeatureServer/layers?f=pjson&token=${token}`,
    );
    const { layers } = await layerResponse.json();
    if (layers.length === 1 && layerName == null) {
      // If number of layers is 1, use that by default if no layerName is provided
      layerID = layers[0].id;
      layerName = layers[0].name;
    } else if (layerName != null) {
      // Otherwise, try to match layerName in list of available layers
      layerID = layers.filter((l) => l.name === serviceName)[0];
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
      }),
    ),
  );
  const buffers = await Promise.all(parts.map((part) => part.arrayBuffer()));
  featuresList = buffers.map((buff) => arcgisPbfDecode(new Uint8Array(buff)).featureCollection);
  featureCollection.features = featuresList.reduce((acc, v) => {
    return acc.concat(v.features);
  }, []);
  writeFeatureCollection(featureCollection);
  return featureCollection;
};

export const featureColors = {
  sharedUse: "#00a884",
  sharedUseUnimproved: "#c7d79e",
  protectedBikeLane: "#0170ff",
  bikeLane: "#73b2ff",
  sharedStreet: "#d7c29e",
  Gap: "#ffffcc",
  footTrail: "#ffcccc",
};

export const basePathWeight = 5.0;
export const maxPathWeight = 10.0;
export const computePathWeight = (selected, zoom, overline = false) => {
  let weight = Math.max(zoom - 8, 3);
  if (overline) {
    weight = weight * 0.5;
  }
  return weight;
};

export const getSimplifyFactor = () => {
  // In the future, we may want to adjust this based on zoom level, but adjusting this
  // doesn't substantially improve performance (and may actually degrade performance
  // because data is reloaded at different zoom levels)
  return 0;
};

const segmentTypes = {
  1: "Shared Use Path",
  2: "Protected Bike Lane",
  3: "Bike Lane",
  4: "Shared Street",
  5: "Shared Street",
  6: "Shared Use Path",
  9: "Gap",
  11: "Foot Trail",
  12: "Foot Trail",
};

const facilityStatuses = {
  1: "Existing",
  2: "Designed",
  3: "Envisioned",
};

export const getFeatureType = ({ seg_type: segmentType, fac_stat: facilityStatus }) => {
  if (segmentType == null || facilityStatus == null) {
    return null;
  }
  let type = "";

  switch (segmentType) {
  case 6:
    type = "Shared Use Path - Unimproved Surface";
    break;
  case 9:
    type = "Gap - Facility Type TBD";
    break;
  case 2:
    if (facilityStatus === 1) {
      type = "Protected Bike Lane and Sidewalk";
    } else {
      type = "Protected Bike Lane - Design or Construction";
    }
    break;
  case 3:
    if (facilityStatus === 1) {
      type = "Bike Lane and Sidewalk";
    } else {
      type = "Bike Lane - Design or Construction";
    }
    break;
  case 4:
    if (facilityStatus === 1 || facilityStatus === 3) {
      type = "Shared Street - Urban";
    }
    break;
  case 5:
    if (facilityStatus === 1) {
      type = "Shared Street - Suburban";
    }
    break;
  case 11:
    if (facilityStatus === 2 || facilityStatus === 3) {
      type = "Foot Trail - Envisioned";
    }
    break;
  case 12:
    if (facilityStatus === 2 || facilityStatus === 3) {
      type = "Foot Trail - Envisioned";
    }
    break;

  default:
    type = `${segmentTypes[segmentType]} - ${facilityStatuses[facilityStatus]}`;
  }

  return type;
};

export const fetchPolygons = async (setPolygons) => {
  const clientId = process.env.REACT_APP_AGOL_CLIENT_ID;
  const clientSecret = process.env.REACT_APP_AGOL_CLIENT_SECRET;
  const token = await authenticateEsri(clientId, clientSecret);
  const serviceName = "simplified_muni_polygons_2";
  const polygonData = await queryFeatureService({
    token,
    serviceName,
    force: true,
  });
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
