import { useState, useEffect } from "react";

import styled from "styled-components";

import Spinner from "react-bootstrap/Spinner";
import Form from "react-bootstrap/Form";

import { LayersControl, ZoomControl, GeoJSON, useMapEvents, ScaleControl, useMap } from "react-leaflet";
import { FeatureLayer } from "react-esri-leaflet";
import VectorBasemapLayer from "react-esri-leaflet/plugins/VectorBasemapLayer";
import VectorTileLayer from "react-esri-leaflet/plugins/VectorTileLayer";
import { featureColors, basemaps, fetchPolygons, authenticateEsri, computePathWeight, getSimplifyFactor } from "../utils/map";

import "leaflet/dist/leaflet.css";
import "bootstrap/dist/css/bootstrap.min.css";

// Importing "for side effects", i.e., to extend leaflet with smooth scrolling
import "../SmoothScroll.js";
import "../Esri-leaflet-vector-error-fix.js";

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

const MapEventsHandler = ({ setSelectedBasemap }) => {
  const map = useMapEvents({
    baselayerchange: (layer) => {
      setSelectedBasemap(layer.name);
    },
  });
  window.map = map;
  return null;
};

const negativeFeatureQuery =
  "(seg_type = 1 AND fac_stat =2 OR seg_type = 2 OR seg_type = 3 AND fac_stat = 2 OR seg_type = 3 AND fac_stat = 3 OR seg_type = 4 AND fac_stat = 1 OR seg_type = 4 AND fac_stat = 3 OR seg_type = 12 OR seg_type = 9)"; // eslint-disable-line max-len

const clientId = process.env.REACT_APP_AGOL_CLIENT_ID;
const clientSecret = process.env.REACT_APP_AGOL_CLIENT_SECRET;
const token = await authenticateEsri(clientId, clientSecret);

export const MAPCMap = ({ projects, selectedProject, selectedFeature, handleProjectClick = () => {}, handleFeatureClick = () => {} }) => {
  const [polygons, setPolygons] = useState([]);

  const [showPolygons, setShowPolygons] = useState(true);
  const [showExisting, setShowExisting] = useState(true);
  const [showDesignConstruction, setShowDesignConstruction] = useState(true);
  const [showEnvisioned, setShowEnvisioned] = useState(true);
  const [showGaps, setShowGaps] = useState(false);
  const [featureQuery, setFeatureQuery] = useState("1=1");
  const [selectedBasemap, setSelectedBasemap] = useState("ArcGIS - Topographic");
  const [showWalkingTrail, setShowWalkingTrail] = useState(false);

  const map = useMap();

  if (map.getPane("highlightPane") == null) {
    map.createPane("highlightPane");
    map.getPane("highlightPane").style.zIndex = 300;
  }
  if (map.getPane("outlinePane") == null) {
    map.createPane("outlinePane");
    map.getPane("outlinePane").style.zIndex = 400;
  }
  if (map.getPane("mainPane") == null) {
    map.createPane("mainPane");
    map.getPane("mainPane").style.zIndex = 500;
  }

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (showPolygons && polygons.length === 0) {
      fetchPolygons(setPolygons);
    }
  }, [showPolygons, polygons]);

  let layers = [];
  // show loading indicator on loading any layer or loading CMS data
  if (Object.keys(projects).length === 0 || isLoading || (showPolygons && polygons.length === 0)) {
    layers = [
      <LoadingOverlay key="loading">
        <LoadingContainer>
          <LoadingIndicator animation="border" role="status">
            <span style={{ display: "none" }}>Loading...</span>
          </LoadingIndicator>
        </LoadingContainer>
      </LoadingOverlay>,
    ];
  }

  if (polygons.length > 0 && showPolygons) {
    for (let polyConfig of polygons) {
      layers.push(<GeoJSON id={polyConfig.id} key={polyConfig.id} data={polyConfig.data} interactive={false} style={polyConfig.styleFunction} />);
    }
  }

  useEffect(() => {
    // generate where queries for featureLayer query
    const facilityStatuses = [];
    let query = "0=1";

    if (showExisting) {
      facilityStatuses.push("1");
    }
    if (showDesignConstruction) {
      facilityStatuses.push("2");
    }
    if (showEnvisioned || showGaps) {
      facilityStatuses.push("3");
    }

    if (facilityStatuses.length > 0) {
      query = `(fac_stat in (${facilityStatuses.join(",")}))`;
    }
    setFeatureQuery(query);
  }, [showEnvisioned, showDesignConstruction, showExisting, showGaps]);

  return (
    <>
      <Form
        style={{
          position: "absolute",
          top: "-30px",
          right: "-22px",
        }}
      >
        <StyledSwitch
          checked={showExisting}
          onChange={() => {
            setShowExisting(!showExisting);
          }}
          type="switch"
          id="custom-switch"
          label="Existing Trails"
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
            // close gaps when envisioning is toggled
            if (!showEnvisioned) {
              setShowGaps(false);
            }
            setShowEnvisioned(!showEnvisioned);
          }}
          type="switch"
          id="custom-switch"
          label="Envisioned"
          style={{ top: "9rem" }}
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

        <StyledSwitch
          checked={showGaps}
          onChange={() => {
            // close envisioning when gaps are toggled
            if (showGaps === false) {
              setShowEnvisioned(false);
            }
            setShowGaps(!showGaps);
          }}
          type="switch"
          id="custom-switch-gaps"
          label="Show Gap Features"
          style={{ top: "15rem" }}
        />
        <StyledSwitch
          checked={showWalkingTrail}
          onChange={() => {
            setShowWalkingTrail(!showWalkingTrail);
          }}
          type="switch"
          id="custom-switch-walking-trail"
          label="Trailmap layer"
          style={{ top: "18rem" }}
        />
      </Form>
      <LayersControl sortLayers>
        {Object.keys(basemaps).map((basemapKey) => (
          <LayersControl.BaseLayer key={basemapKey} checked={selectedBasemap === basemapKey} name={basemapKey}>
            <VectorBasemapLayer name={basemaps[basemapKey].name} token={token} />
          </LayersControl.BaseLayer>
        ))}
      </LayersControl>

      <ZoomControl position="bottomright" />
      <ScaleControl position="bottomright" />

      <MapEventsHandler setSelectedBasemap={setSelectedBasemap} />
      {layers}

      {showWalkingTrail && (
        <VectorTileLayer
          url="https://tiles.arcgis.com/tiles/c5WwApDsDjRhIVkH/arcgis/rest/services/Walking_trail_vector_tiles/VectorTileServer"
          token={token}
          eventHandlers={{
            load: () => {
              setIsLoading(false);
            },
          }}
        />
      )}

      {selectedFeature && (
        <FeatureLayer
          url="https://geo.mapc.org/server/rest/services/transportation/landlines/FeatureServer/0"
          simplifyFactor={getSimplifyFactor(map.getZoom())}
          precision={6}
          eventHandlers={{
            click: handleFeatureClick,
            load: () => setIsLoading(false),
          }}
          where={`objectid=${selectedFeature.objectid}`}
          id="selection-layer"
          key={`${selectedFeature.objectid}`}
          data={selectedFeature}
          interactive={false}
          pane="highlightPane"
          style={() => {
            let colorRow;
            let weight = computePathWeight(true, map.getZoom(), true) * 3;

            colorRow = "cyan";

            return {
              color: colorRow,
              stroke: colorRow,
              weight,
              opacity: 1,
              dashOffset: "0",
              lineCap: "square",
              zIndex: 999,
            };
          }}
        />
      )}
      <FeatureLayer
        url="https://geo.mapc.org/server/rest/services/transportation/landlines/FeatureServer/0"
        key={`${featureQuery}`} //FORCE RELOAD ON QUERY CHANGE
        simplifyFactor={getSimplifyFactor(map.getZoom())}
        precision={6}
        eventHandlers={{
          click: handleFeatureClick,
          load: () => setIsLoading(false),
        }}
        where={featureQuery}
        style={(feature) => {
          let colorRow;
          let dashArray;
          let selected = selectedFeature != null && selectedFeature.objectid === feature.id;
          let weight = computePathWeight(selected, map.getZoom());
          if (feature.properties.seg_type === 1) {
            colorRow = featureColors.sharedUse;
          }
          if (feature.properties.seg_type === 1 && feature.properties.fac_stat === 3) {
            colorRow = featureColors.sharedUse;
            dashArray = `${weight},${weight * 2.5}`;
          } else if (feature.properties.seg_type === 6) {
            colorRow = featureColors.sharedUseUnimproved;
          } else if (feature.properties.seg_type === 2) {
            colorRow = featureColors.protectedBikeLane;
          } else if (feature.properties.seg_type === 3) {
            colorRow = featureColors.bikeLane;
          } else if (feature.properties.seg_type === 4 || feature.properties.seg_type === 5) {
            colorRow = featureColors.sharedStreet;
          }
          if (feature.properties.seg_type === 5 && feature.properties.fac_stat === 3) {
            colorRow = featureColors.sharedStreet;
            dashArray = `${weight},${weight * 2.5}`;
          } else if (
            feature.properties.seg_type === 9 &&
            (feature.properties.fac_stat === 1 || feature.properties.fac_stat === 2 || feature.properties.fac_stat === 3)
          ) {
            colorRow = "#888888";
          }

          if (feature.properties.seg_type === 11 && feature.properties.fac_stat === 1) {
            colorRow = featureColors.footTrail;
          } else if (feature.properties.seg_type === 11 && (feature.properties.fac_stat === 3 || feature.properties.fac_stat === 2)) {
            colorRow = featureColors.footTrail;
            dashArray = `${weight},${weight * 2.5}`;
          }
          if (feature.properties.seg_type === 12 && feature.properties.fac_stat === 1) {
            colorRow = featureColors.footTrail;
          } else if (feature.properties.seg_type === 12 && (feature.properties.fac_stat === 3 || feature.properties.fac_stat === 2)) {
            colorRow = featureColors.footTrail;
            dashArray = `${weight},${weight * 2.5}`;
          }

          return {
            color: colorRow,
            stroke: colorRow,
            weight,
            fillOpacity: 0,
            opacity: 1,
            lineCap: "square",
            dashArray: dashArray,
            dashOffset: "0",
            zIndex: 1000,
          };
        }}
        pane="outlinePane"
      />
      {/* inverted dash extra layer */}
      <FeatureLayer
        eventHandlers={{
          click: handleFeatureClick,
          load: () => setIsLoading(false),
        }}
        url="https://geo.mapc.org/server/rest/services/transportation/landlines/FeatureServer/0"
        simplifyFactor={getSimplifyFactor(map.getZoom())}
        precision={6}
        where={featureQuery + " AND " + negativeFeatureQuery}
        style={(feature) => {
          let colorRow;
          let dashArray;
          let selected = selectedFeature != null && selectedFeature.objectid === feature.id;
          let weight = computePathWeight(selected, map.getZoom(), true);

          if (feature.properties.seg_type === 1 && feature.properties.fac_stat === 2) {
            colorRow = "white"; // Shared Use Path - Design
            dashArray = `${weight},${weight * 2.5}`;
          } else if (feature.properties.seg_type === 2 && feature.properties.fac_stat === 1) {
            colorRow = "none"; // Protected Bike Lane and Sidewalk
          } else if (feature.properties.seg_type === 2 && (feature.properties.fac_stat === 2 || feature.properties.fac_stat === 3)) {
            colorRow = "white"; // Protected Bike Lane and Sidewalk design or construction
            dashArray = `${weight},${weight * 2.5}`;
          } else if (feature.properties.seg_type === 3 && (feature.properties.fac_stat === 2 || feature.properties.fac_stat === 3)) {
            colorRow = "white"; // Bike Lane - Design or Construction
            dashArray = `${weight},${weight * 2.5}`;
          } else if (feature.properties.seg_type === 4 && (feature.properties.fac_stat === 3 || feature.properties.fac_stat === 1)) {
            colorRow = "none"; //Shared Street - Urban or suburban
          }
          if (feature.properties.seg_type === 9) {
            colorRow = featureColors.Gap;
          }

          return {
            color: colorRow,
            stroke: colorRow,
            weight,
            fillOpacity: 0,
            opacity: 1,
            dashArray: dashArray,
            dashOffset: "0",
            lineCap: "square",
            zIndex: 1001,
          };
        }}
        pane="mainPane"
      />

      {/* Make gap features layer to be on top of all other features to prevent layer order issues */}
      {showGaps && (
        <FeatureLayer
          url="https://geo.mapc.org/server/rest/services/transportation/landlines/FeatureServer/0"
          key={`gaps-${showGaps}-${showEnvisioned}`}
          simplifyFactor={getSimplifyFactor(map.getZoom())}
          precision={6}
          eventHandlers={{
            click: handleFeatureClick,
            load: () => setIsLoading(false),
          }}
          where={featureQuery}
          style={(feature) => {
            let selected = selectedFeature != null && selectedFeature.objectid === feature.id;
            let weight = computePathWeight(selected, map.getZoom());
            let isGapFeature = feature.properties.seg_type === 9;

            return {
              color: isGapFeature ? "#FF0000" : "#4f1a32",
              stroke: isGapFeature ? "#FF0000" : "#4f1a32",
              weight,
              fillOpacity: 0,
              opacity: 1,
              zIndex: isGapFeature ? 1003 : 1002, // Gaps on top, other trails just below
            };
          }}
          pane="mainPane"
        />
      )}
    </>
  );
};

export default MAPCMap;
