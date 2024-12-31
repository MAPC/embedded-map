import { useState, useEffect } from "react";

import styled from "styled-components";

import Spinner from "react-bootstrap/Spinner";
import Form from "react-bootstrap/Form";

import { LayersControl, ZoomControl, GeoJSON, Circle, useMapEvents, ScaleControl, useMap } from "react-leaflet";
import { FeatureLayer } from "react-esri-leaflet";
import VectorBasemapLayer from "react-esri-leaflet/plugins/VectorBasemapLayer";

import { featureColors, basemaps, fetchPolygons, authenticateEsri, computePathWeight } from "../utils/map";

import "leaflet/dist/leaflet.css";
import "bootstrap/dist/css/bootstrap.min.css";

// Importing "for side effects", i.e., to extend leaflet with smooth scrolling
import "../SmoothScroll.js";

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

const MapEventsHandler = ({ setZoom, setSelectedBasemap }) => {
  const map = useMapEvents({
    zoomend: () => {
      setZoom(map.getZoom());
    },
    baselayerchange: (layer) => {
      setSelectedBasemap(layer.name);
    },
  });
  return null;
};

const negativeFeatureQuery =
  "(seg_type = 1 AND fac_stat =2 OR seg_type = 2 OR seg_type = 3 AND fac_stat = 2 OR seg_type = 3 AND fac_stat = 3 OR seg_type = 4 AND fac_stat = 1 OR seg_type = 4 AND fac_stat = 3 OR seg_type = 12 OR seg_type = 9)"; // eslint-disable-line max-len

const clientId = process.env.REACT_APP_AGOL_CLIENT_ID;
const clientSecret = process.env.REACT_APP_AGOL_CLIENT_SECRET;
const token = await authenticateEsri(clientId, clientSecret);

export const MAPCMap = ({ projects, selectedProject, selectedFeature, handleProjectClick = () => {}, handleFeatureClick = () => {} }) => {
  const [polygons, setPolygons] = useState([]);

  const [showProjects, setShowProjects] = useState(true);

  const [zoom, setZoom] = useState(10);
  const [simplifyFactor, setSimplifyFactor] = useState(0);

  const [showPolygons, setShowPolygons] = useState(true);
  const [showExisting, setShowExisting] = useState(true);
  const [showDesignConstruction, setShowDesignConstruction] = useState(true);
  const [showEnvisioned, setShowEnvisioned] = useState(true);
  const [showGaps, setShowGaps] = useState(false);
  const [featureQuery, setFeatureQuery] = useState("1=1");
  const [selectedBasemap, setSelectedBasemap] = useState("ArcGIS - Topographic");

  const map = useMap();

  if (map.getPane("outlinePane") == null) {
    map.createPane("outlinePane");
    map.getPane("outlinePane").style.zIndex = 400;
  }
  if (map.getPane("mainPane") == null) {
    map.createPane("mainPane");
    map.getPane("mainPane").style.zIndex = 500;
  }
  if (map.getPane("pointPane") == null) {
    map.createPane("pointPane");
    map.getPane("pointPane").style.zIndex = 600;
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

  // on project selection, set current project state, clear feature state to remove ambiguity and reduce confusion
  if (Object.keys(projects).length > 0 && showProjects) {
    // render all points from Airtable CMS point layer base ( CMS - Landlines )
    for (let projectName of Object.keys(projects)) {
      const point = projects[projectName];
      if (point.Lat != null && point.Long != null) {
        layers.push(
          <Circle
            key={projectName}
            name={projectName}
            pathOptions={{
              color: projectName === selectedProject ? "red" : "blue",
              fillOpacity: "100%",
            }}
            radius={90000 / Math.pow(zoom - 2, 2.6)}
            center={[point.Lat, point.Long]}
            eventHandlers={{
              click: handleProjectClick,
            }}
            pane="pointPane"
          />,
        );
      }
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
    if (showEnvisioned) {
      facilityStatuses.push("3");
    }

    if (facilityStatuses.length > 0) {
      query = `(fac_stat in (${facilityStatuses.join(",")}))`;
    }

    setFeatureQuery(query);
    setIsLoading(true);
  }, [showEnvisioned, showDesignConstruction, showExisting, showGaps]);

  useEffect(() => {
    if (zoom >= 10) {
      setSimplifyFactor(0.5);
    } else if (zoom >= 5) {
      setSimplifyFactor(0.25);
    } else {
      setSimplifyFactor(0);
    }
  }, [zoom]);

  return (
    <>
      <Form
        style={{
          position: "absolute",
          top: "10px",
          right: "-22px",
        }}
      >
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
            setShowGaps(!showGaps);
            setShowEnvisioned(showGaps);
          }}
          type="switch"
          id="custom-switch-gaps"
          label="Show Gap Features"
          style={{ top: "15rem" }}
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

      <MapEventsHandler setZoom={setZoom} setSelectedBasemap={setSelectedBasemap} />
      {layers}
      <FeatureLayer
        url="https://geo.mapc.org/server/rest/services/transportation/landlines/FeatureServer/0"
        key={`${featureQuery}`} //FORCE RELOAD ON QUERY CHANGE
        simplifyFactor={simplifyFactor}
        eventHandlers={{
          click: handleFeatureClick,
          load: () => setIsLoading(false),
        }}
        where={featureQuery}
        style={(feature) => {
          let colorRow;
          let dashArray;
          if (feature.properties.seg_type === 1) {
            colorRow = featureColors.sharedUse;
          }
          if (feature.properties.seg_type === 1 && feature.properties.fac_stat === 3) {
            colorRow = featureColors.sharedUse;
            dashArray = "3,8";
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
            dashArray = "3,8";
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
            dashArray = "3,8";
          }
          if (feature.properties.seg_type === 12 && feature.properties.fac_stat === 1) {
            colorRow = featureColors.footTrail;
          } else if (feature.properties.seg_type === 12 && (feature.properties.fac_stat === 3 || feature.properties.fac_stat === 2)) {
            colorRow = featureColors.footTrail;
            dashArray = "3,8";
          }
          let isGapFeature = feature.properties.seg_type === 9;
          if (showGaps && !showEnvisioned) {
            colorRow = isGapFeature ? "#FF0000" : "#4f1a32"; // Red for gap, default for non-gap when showing gap features only
          } else if (showEnvisioned) {
            // Handle cases when Envisioned is shown
            colorRow = isGapFeature ? featureColors.Gap : colorRow; // Yellow for gap if envisioned, keep previous color for non-gap
          }

          let selected = selectedFeature != null && selectedFeature.objectid === feature.id;
          let weight = computePathWeight(selected, zoom);

          return {
            color: colorRow,
            stroke: colorRow,
            weight,
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

          if (feature.properties.seg_type === 1 && feature.properties.fac_stat === 2) {
            colorRow = "white";
            dashArray = "3,8";
          } else if (feature.properties.seg_type === 2 && feature.properties.fac_stat === 1) {
            colorRow = "white";
          } else if (feature.properties.seg_type === 2 && (feature.properties.fac_stat === 2 || feature.properties.fac_stat === 3)) {
            colorRow = "white";
            dashArray = "3,8";
          } else if (feature.properties.seg_type === 3 && (feature.properties.fac_stat === 2 || feature.properties.fac_stat === 3)) {
            colorRow = "white";
            dashArray = "3,8";
          } else if (feature.properties.seg_type === 4 && (feature.properties.fac_stat === 3 || feature.properties.fac_stat === 1)) {
            colorRow = "white";
          }

          let isGapFeature = feature.properties.seg_type === 9;
          if (showGaps && !showEnvisioned) {
            colorRow = isGapFeature ? "#FF0000" : "#4f1a32"; // Red for gap, default for non-gap when showing gap features only
          } else if (showEnvisioned) {
            // Handle cases when Envisioned is shown
            colorRow = isGapFeature ? featureColors.Gap : colorRow; // Yellow for gap if envisioned, keep previous color for non-gap
          }

          let selected = selectedFeature != null && selectedFeature.objectid === feature.id;
          let weight = computePathWeight(selected, zoom);

          return {
            color: colorRow,
            stroke: colorRow,
            weight,
            fillOpacity: 0,
            opacity: 1,
            dashArray: dashArray,
            dashOffset: "0",
            zIndex: 1001,
          };
        }}
        pane="mainPane"
      />
    </>
  );
};

export default MAPCMap;
