import { useState, useEffect, useRef } from "react";

import styled from "styled-components";

import Spinner from "react-bootstrap/Spinner";
import Form from "react-bootstrap/Form";
import Overlay from "react-bootstrap/Overlay";

import {
  MapContainer,
  TileLayer,
  ZoomControl,
  GeoJSON,
  Circle,
  useMapEvents,
  ScaleControl,
  useMap,
} from "react-leaflet";
import Sidebar from "./Sidebar";
import {
  regionMapProps,
  featureColors,
  basemaps,
  getFeatureType,
  fetchPolygons,
} from "../utils/map";
import { fetchProjects } from "../utils/airtable";

import "leaflet/dist/leaflet.css";
import "bootstrap/dist/css/bootstrap.min.css";

// Importing "for side effects", i.e., to extend leaflet with smooth scrolling
import "./SmoothScroll.js";

import { FeatureLayer } from "react-esri-leaflet";

const Container = styled.div`
  display: flex;
  flex-direction: row;
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

export const MAPCMap = ({ wrapperHeight = "100vh" }) => {
  const [polygons, setPolygons] = useState([]);
  const [selectedFeature, setSelectedFeature] = useState();
  const [selectedType, setSelectedType] = useState();
  const [selectedProject, setSelectedProject] = useState();
  const [selectedProjectLink, setSelectedProjectLink] = useState();
  const [lastSelected, setLastSelected] = useState("feature");
  const [selectedTab, setSelectedTab] = useState("landlines");

  const [showProjects, setShowProjects] = useState(true);
  const [projects, setProjects] = useState({});

  const [zoom, setZoom] = useState(10);
  const [simplifyFactor, setSimplifyFactor] = useState(0);

  const target = useRef(null);
  const [showBaseMaps, setShowBaseMaps] = useState(false);
  const [selectedBasemap, setSelectedBasemap] = useState(
    "Topo - ESRI (Default)",
  );

  const [showPolygons, setShowPolygons] = useState(true);
  const [showExisting, setShowExisting] = useState(true);
  const [showDesignConstruction, setShowDesignConstruction] = useState(true);
  const [showEnvisioned, setShowEnvisioned] = useState(true);
  const [showGaps, setShowGaps] = useState(false);
  const [featureQuery, setFeatureQuery] = useState("1=1");

  const map = useMap();

  useEffect(() => {
    map.createPane("outlinePane");
    map.getPane("outlinePane").style.zIndex = 400;
    map.createPane("mainPane");
    map.getPane("mainPane").style.zIndex = 500;
    map.createPane("pointPane");
    map.getPane("pointPane").style.zIndex = 600;
  }, [map]);

  const negativeFeatureQuery =
    "(seg_type = 1 AND fac_stat =2 OR seg_type = 2 OR seg_type = 3 AND fac_stat = 2 OR seg_type = 3 AND fac_stat = 3 OR seg_type = 4 AND fac_stat = 1 OR seg_type = 4 AND fac_stat = 3 OR seg_type = 12 OR seg_type = 9)"; // eslint-disable-line max-len

  const [isLoading, setIsLoading] = useState(true);

  let pathWeight = 4.0 * (10.0 / zoom);

  useEffect(() => {
    if (Object.keys(projects).length === 0) {
      // AIRTABLE CMS
      fetchProjects(setProjects);
    }
  }, [projects]);

  useEffect(() => {
    if (showPolygons && polygons.length === 0) {
      fetchPolygons(setPolygons);
    }
  }, [showPolygons, polygons]);

  let layers = [];
  // show loading indicator on loading any layer or loading CMS data
  if (
    Object.keys(projects).length === 0 ||
    isLoading ||
    (showPolygons && polygons.length === 0)
  ) {
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
      layers.push(
        <GeoJSON
          id={polyConfig.id}
          key={polyConfig.id}
          data={polyConfig.data}
          interactive={false}
          style={polyConfig.styleFunction}
        />,
      );
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
              click: (feature) => {
                setSelectedProject(feature.target.options.name);
                setSelectedFeature();
                setSelectedType();
                setLastSelected("project");
              },
            }}
            pane="pointPane"
          />,
        );
      }
    }
  }

  useEffect(() => {
    // map the selectedFeature's properties to determine feature type to display on data description
    setSelectedType(getFeatureType(selectedFeature));
  }, [selectedFeature]);

  useEffect(() => {
    const mapProjectLink = () => {
      // TODO: once feature data has mapping for project name set project to relevant link (could potentially be found in projects)
      let project = "";

      if (selectedFeature != null && selectedFeature.reg_name === "") {
        //???
      }

      setSelectedProjectLink(project);
    };
    mapProjectLink();
  }, [selectedFeature]);

  useEffect(() => {
    // generate where queries for featureLayer query
    const facilityStatuses = [];
    let query = "0=1";

    if (showExisting) {
      facilityStatuses.push("fac_stat = 1");
    }
    if (showDesignConstruction) {
      facilityStatuses.push("fac_stat = 2");
    }
    if (showEnvisioned) {
      facilityStatuses.push("fac_stat = 3");
    }

    if (facilityStatuses.length > 0) {
      query = `(fac_stat in (${facilityStatuses.join(",")}))`;
    }

    setFeatureQuery(query);
    setIsLoading(true);
  }, [showEnvisioned, showDesignConstruction, showExisting, showGaps]);

  useEffect(() => {
    if (simplifyFactor !== 0.5 && zoom >= 10) {
      setSimplifyFactor(0.5);
    } else if (simplifyFactor !== 0.25 && zoom >= 5) {
      setSimplifyFactor(0.25);
    } else if (simplifyFactor !== 0) {
      setSimplifyFactor(0);
    }
  }, [zoom, simplifyFactor]);

  return (
    <Container>
      <Wrapper height={wrapperHeight}>
        <MapContainer
          {...regionMapProps}
          zoomControl={false}
          preferCanvas={false}
          scrollWheelZoom={true}
          smoothWheelZoom={true} // enable smooth zoom
          smoothSensitivity={2.5} // zoom speed. default is 1
        >
          {/* feature toggles */}
          <Form
            style={{
              position: "absolute",
              width: "100%",
              left: "1rem",
              top: "1rem",
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              fill="currentColor"
              className="bi bi-map"
              viewBox="0 0 16 16"
            >
              <path
                fillRule="evenodd"
                d="M15.817.113A.5.5 0 0 1 16 .5v14a.5.5 0 0 1-.402.49l-5 1a.5.5 0 0 1-.196 0L5.5 15.01l-4.902.98A.5.5 0 0 1 0 15.5v-14a.5.5 0 0 1 .402-.49l5-1a.5.5 0 0 1 .196 0L10.5.99l4.902-.98a.5.5 0 0 1 .415.103M10 1.91l-4-.8v12.98l4 .8zm1 12.98 4-.8V1.11l-4 .8zm-6-.8V1.11l-4 .8v12.98z"
              />
            </svg>
          </StyledBasemapButton>

          <Overlay
            target={target.current}
            show={showBaseMaps}
            placement="left-start"
          >
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
                        checked={basemap === selectedBasemap}
                        onChange={() => {
                          setSelectedBasemap(basemap);
                        }}
                        type="radio"
                        id={`custom-radio-${basemap}`}
                        key={`custom-radio-${basemap}`}
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
            key={`${featureQuery}`} //FORCE RELOAD ON QUERY CHANGE
            simplifyFactor={simplifyFactor}
            eventHandlers={{
              click: (feature) => {
                if (feature.layer.feature.properties) {
                  setSelectedFeature(feature.layer.feature.properties);
                  setSelectedProject();
                  setLastSelected("feature");
                }
              },

              load: () => setIsLoading(false),
            }}
            where={featureQuery}
            style={(feature) => {
              let colorRow;
              let dashArray;

              if (feature.properties.seg_type === 1) {
                colorRow = featureColors.sharedUse;
              }
              if (
                feature.properties.seg_type === 1 &&
                feature.properties.fac_stat === 3
              ) {
                colorRow = featureColors.sharedUse;
                dashArray = "3,8";
              } else if (feature.properties.seg_type === 6) {
                colorRow = featureColors.sharedUseUnimproved;
              } else if (feature.properties.seg_type === 2) {
                colorRow = featureColors.protectedBikeLane;
              } else if (feature.properties.seg_type === 3) {
                colorRow = featureColors.bikeLane;
              } else if (
                feature.properties.seg_type === 4 ||
                feature.properties.seg_type === 5
              ) {
                colorRow = featureColors.sharedStreet;
              }
              if (
                feature.properties.seg_type === 5 &&
                feature.properties.fac_stat === 3
              ) {
                colorRow = featureColors.sharedStreet;
                dashArray = "3,8";
              } else if (
                feature.properties.seg_type === 9 &&
                (feature.properties.fac_stat === 1 ||
                  feature.properties.fac_stat === 2 ||
                  feature.properties.fac_stat === 3)
              ) {
                colorRow = "#888888";
              }

              if (
                feature.properties.seg_type === 11 &&
                feature.properties.fac_stat === 1
              ) {
                colorRow = featureColors.footTrail;
              } else if (
                feature.properties.seg_type === 11 &&
                (feature.properties.fac_stat === 3 ||
                  feature.properties.fac_stat === 2)
              ) {
                colorRow = featureColors.footTrail;
                dashArray = "3,8";
              }
              if (
                feature.properties.seg_type === 12 &&
                feature.properties.fac_stat === 1
              ) {
                colorRow = featureColors.footTrail;
              } else if (
                feature.properties.seg_type === 12 &&
                (feature.properties.fac_stat === 3 ||
                  feature.properties.fac_stat === 2)
              ) {
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

              if (
                feature.properties.seg_type === 1 &&
                feature.properties.fac_stat === 2
              ) {
                colorRow = "white";
                dashArray = "3,8";
              } else if (
                feature.properties.seg_type === 2 &&
                feature.properties.fac_stat === 1
              ) {
                colorRow = "white";
              } else if (
                feature.properties.seg_type === 2 &&
                (feature.properties.fac_stat === 2 ||
                  feature.properties.fac_stat === 3)
              ) {
                colorRow = "white";
                dashArray = "3,8";
              } else if (
                feature.properties.seg_type === 3 &&
                (feature.properties.fac_stat === 2 ||
                  feature.properties.fac_stat === 3)
              ) {
                colorRow = "white";
                dashArray = "3,8";
              } else if (
                feature.properties.seg_type === 4 &&
                (feature.properties.fac_stat === 3 ||
                  feature.properties.fac_stat === 1)
              ) {
                colorRow = "white";
              }

              let isGapFeature = feature.properties.seg_type === 9;
              if (showGaps && !showEnvisioned) {
                colorRow = isGapFeature ? "#FF0000" : "#4f1a32"; // Red for gap, default for non-gap when showing gap features only
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
      </Wrapper>
      <Sidebar
        handleSelectTab={(eventKey) => {
          setSelectedTab(eventKey);
        }}
        handleProjectSelect={(project) => {
          setSelectedProject(project);
          setSelectedFeature();
          setSelectedType();
          setLastSelected("project");
        }}
        selectedTab={selectedTab}
        lastSelected={lastSelected}
        selectedType={selectedType}
        projectList={projects}
        selectedProject={selectedProject}
        selectedProjectLink={selectedProjectLink}
        selectedFeature={selectedFeature}
      />
    </Container>
  );
};

export default MAPCMap;
