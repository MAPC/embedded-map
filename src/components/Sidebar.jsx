import styled from "styled-components";
import Nav from "react-bootstrap/Nav";

import Legend from "./Legend.jsx";
import MAPCLogo from "../assets/mapc-semitransparent.svg";

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
  padding: 1rem 1.5rem;
`;

const SidebarBottom = styled.div`
  background-color: rgba(250, 250, 250, 1);
  height: 35%;
  padding: 1rem 1.5rem;
  color: rgba(175, 175, 175, 1);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  user-select: none;
  overflow-y: auto;
`;

const SidebarBottomList = styled.div`
  width: 100%;
  height: 100%;
  padding: 0.25rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 0.5rem;
  color: #0b1618;
`;

const SidebarBottomTitle = styled.div`
  width: 100%;
  font-weight: bold;
  font-size: 1.2rem;
  padding-bottom: 0.25rem;
  border-bottom: 2px solid #e1e1e1;
  margin-bottom: 0.25rem;
`;

const SidebarBottomLine = styled.div`
  width: 100%;
  color: #0b1618;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  margin-bottom: 0.25rem;
`;

const CoordinatesContainer = styled.div`
  width: 100%;
  margin: 0.25rem 0;
`;

const CoordinateValue = styled.div`
  color: #333;
  font-family: monospace;
  font-size: 1rem;
`;

const CoordinateNote = styled.div`
  color: #666;
  font-size: 0.8rem;
  font-style: italic;
  margin-top: 0.2rem;
`;

const SidebarBottomLeft = styled.div`
  color: #666;
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 0.1rem;
`;

const SidebarBottomRight = styled.div`
  color: #333;
  line-height: 1.3;
  
  a {
    color: #004a91;
    text-decoration: none;
    word-break: break-word;
    
    &:hover {
      text-decoration: underline;
    }
  }
`;

const SideBarTitle = styled.h4`
  margin-bottom: 0;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #004a91;
  color: #f2f5ff;
  padding: 1rem;
  
  a {
    display: flex;
    align-items: center;
    gap: 1rem;
    color: inherit;
    text-decoration: none;
    
    img {
      width: 90px;
      height: auto;
    }
    
    span {
      font-size: 1.2rem;
    }
  }
`;

const Sidebar = ({
  handleSelectTab = () => {},
  handleProjectSelect = () => {},
  selectedTab,
  lastSelected,
  selectedType,
  projectList = [],
  selectedProject,
  selectedProjectLink,
  selectedFeature,
}) => {
  return (
    <RightSidebar>
      <SideBarTitle>
        <a href="https://www.mapc.org/transportation/landline/">
          <img alt="MAPC logo" src={MAPCLogo} />
          <span>LandLine Map</span>
        </a>
      </SideBarTitle>
      <SidebarTop>
        <Nav justify variant="tabs" defaultActiveKey="landlines" onSelect={handleSelectTab}>
          <Nav.Item>
            <Nav.Link eventKey="landlines">Landline Greenways</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="projects">Active Projects</Nav.Link>
          </Nav.Item>
        </Nav>
        <Legend
          selectedTab={selectedTab}
          selectedType={selectedType}
          projectList={projectList}
          selectedProject={selectedProject}
          handleProjectSelect={handleProjectSelect}
        />
      </SidebarTop>
      <SidebarBottom>
        {lastSelected === "feature" ? (
          selectedFeature !== undefined ? (
            <SidebarBottomList>
              <SidebarBottomTitle>Landline Details</SidebarBottomTitle>
              <SidebarBottomLine>
                <SidebarBottomLeft>Name</SidebarBottomLeft>
                <SidebarBottomRight>{"N/A"}</SidebarBottomRight>
              </SidebarBottomLine>
              <SidebarBottomLine>
                <SidebarBottomLeft>Type</SidebarBottomLeft>
                <SidebarBottomRight>{selectedType ? selectedType : "N/A"}</SidebarBottomRight>
              </SidebarBottomLine>
              <SidebarBottomLine>
                <SidebarBottomLeft>Project</SidebarBottomLeft>
                <SidebarBottomRight>{selectedFeature.reg_name ? selectedFeature.reg_name : "N/A"}</SidebarBottomRight>
              </SidebarBottomLine>
              <SidebarBottomLine>
                <SidebarBottomLeft>Link</SidebarBottomLeft>
                <SidebarBottomRight>{selectedProjectLink ? selectedProjectLink : "N/A"}</SidebarBottomRight>
              </SidebarBottomLine>
            </SidebarBottomList>
          ) : (
            <div>Select a landline to view details</div>
          )
        ) : selectedProject !== undefined ? (
          <SidebarBottomList>
            <SidebarBottomTitle>Project Details</SidebarBottomTitle>
            <SidebarBottomLine>
              <SidebarBottomLeft>Name</SidebarBottomLeft>
              <SidebarBottomRight>{selectedProject}</SidebarBottomRight>
            </SidebarBottomLine>
            <SidebarBottomLine>
              <SidebarBottomLeft>Coordinates</SidebarBottomLeft>
              <CoordinateValue>
                {projectList[selectedProject].Lat && projectList[selectedProject].Long ? 
                  `(${projectList[selectedProject].Lat}, ${projectList[selectedProject].Long})` : 
                  "N/A"
                }
              </CoordinateValue>
              <CoordinateNote>
                Format: (latitude, longitude)
              </CoordinateNote>
            </SidebarBottomLine>
            <SidebarBottomLine>
              <SidebarBottomLeft>Link</SidebarBottomLeft>
              <SidebarBottomRight>
                {projectList[selectedProject].Link ? (
                  <a href={projectList[selectedProject].Link} target="_blank" rel="noopener noreferrer">
                    {projectList[selectedProject].Link}
                  </a>
                ) : (
                  "N/A"
                )}
              </SidebarBottomRight>
            </SidebarBottomLine>
            <SidebarBottomLine>
              <SidebarBottomLeft>Description</SidebarBottomLeft>
              <SidebarBottomRight>
                {projectList[selectedProject].Description ? projectList[selectedProject].Description : "N/A"}
              </SidebarBottomRight>
            </SidebarBottomLine>
          </SidebarBottomList>
        ) : (
          <div>Select a project to view details</div>
        )}
      </SidebarBottom>
    </RightSidebar>
  );
};

export default Sidebar;
