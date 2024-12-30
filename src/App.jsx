import { useState, useEffect, useMemo } from "react";
import styled from "styled-components";
import { MapContainer } from "react-leaflet";

import { regionMapProps, getFeatureType } from "./utils/map";
import { fetchProjects } from "./utils/airtable";
import Sidebar from "./components/Sidebar.jsx";
import Map from "./components/Map.jsx";

const Container = styled.div`
  display: flex;
  flex-direction: row;
`;

const Wrapper = styled.div`
  flex: 1;
  height: 100%;
  div.leaflet-container {
    height: ${(props) => props.height};
  }

  div.leaflet-control-attribution {
    max-width: initial;
  }

  div.leaflet-control-layers {
    position: absolute;
    top: 18rem;
    right: 10px;
  }

  section.leaflet-control-layers-list {
    min-width: 200px;
  }
`;

export const App = ({ wrapperHeight = "100vh" }) => {
  const [selectedTab, setSelectedTab] = useState("landlines");
  const [selectedProject, setSelectedProject] = useState();
  const [selectedProjectLink, setSelectedProjectLink] = useState();
  const [selectedFeature, setSelectedFeature] = useState();
  const [selectedType, setSelectedType] = useState();
  const [lastSelected, setLastSelected] = useState("feature");
  const [projects, setProjects] = useState({});
  const handleProjectClick = useMemo((feature) => {
    if (feature != null) {
      setSelectedProject(feature.target.options.name);
      setSelectedFeature();
      setSelectedType();
      setLastSelected("project");
    }
  }, []);
  const handleFeatureClick = useMemo((feature) => {
    if (feature != null && feature.layer.feature.properties) {
      setSelectedFeature(feature.layer.feature.properties);
      setSelectedProject();
      setLastSelected("feature");
    }
  }, []);

  useEffect(() => {
    if (Object.keys(projects).length === 0) {
      // AIRTABLE CMS
      fetchProjects(setProjects);
    }
  }, [projects]);

  useEffect(() => {
    if (selectedFeature != null) {
      // map the selectedFeature's properties to determine feature type to display on data description
      setSelectedType(getFeatureType(selectedFeature));
      const mapProjectLink = () => {
        // TODO: once feature data has mapping for project name set project to relevant link (could potentially be found in projects)
        let project = "";

        if (selectedFeature != null && selectedFeature.reg_name === "") {
          //???
        }

        setSelectedProjectLink(project);
      };
      mapProjectLink();
    }
  }, [selectedFeature]);

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
          <Map projects={projects} selectedProject={selectedProject} handleProjectClick={handleProjectClick} handleFeatureClick={handleFeatureClick} />
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

export default App;
