import styled from "styled-components";
import Nav from "react-bootstrap/Nav";

import Legend from "./Legend";
import MAPCLogo from "./assets/mapc-semitransparent.svg";

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
        {/* sidebar title header */}
        <a
          href="https://www.mapc.org/transportation/landline/"
          style={{
            position: "relative",
            color: "inherit",
            textDecoration: "none",
          }}
        >
          <img
            alt="MAPC logo"
            src={MAPCLogo}
            style={{ marginRight: "0.5rem", width: 90, height: "auto" }}
          />
          <span style={{ position: "relative", bottom: "-16px" }}>
            LandLine Map
          </span>
        </a>
      </SideBarTitle>
      <SidebarTop>
        {/* tab selection */}
        <Nav
          justify
          variant="tabs"
          defaultActiveKey="landlines"
          onSelect={handleSelectTab}
        >
          <Nav.Item>
            <Nav.Link eventKey="landlines" style={{ height: "100%" }}>
              Landline Greenways
            </Nav.Link>
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
              <SidebarBottomTitle>Landline</SidebarBottomTitle>
              <SidebarBottomLine>
                <SidebarBottomLeft>Name:</SidebarBottomLeft>
                <SidebarBottomRight>{"N/A"}</SidebarBottomRight>
              </SidebarBottomLine>
              <SidebarBottomLine>
                <SidebarBottomLeft>Type:</SidebarBottomLeft>
                <SidebarBottomRight>
                  {selectedType ? selectedType : "N/A"}
                </SidebarBottomRight>
              </SidebarBottomLine>
              <SidebarBottomLine>
                <SidebarBottomLeft>Project:</SidebarBottomLeft>
                <SidebarBottomRight>
                  {selectedFeature.reg_name ? selectedFeature.reg_name : "N/A"}
                </SidebarBottomRight>
              </SidebarBottomLine>
              <SidebarBottomLine>
                <SidebarBottomLeft>Link:</SidebarBottomLeft>
                <SidebarBottomRight>
                  {selectedProjectLink ? selectedProjectLink : "N/A"}
                </SidebarBottomRight>
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
              <SidebarBottomRight>
                {projectList[selectedProject].Lat
                  ? projectList[selectedProject].Lat
                  : "N/A"}
              </SidebarBottomRight>
            </SidebarBottomLine>
            <SidebarBottomLine>
              <SidebarBottomLeft>Longitude:</SidebarBottomLeft>
              <SidebarBottomRight>
                {projectList[selectedProject].Long
                  ? projectList[selectedProject].Long
                  : "N/A"}
              </SidebarBottomRight>
            </SidebarBottomLine>
            <SidebarBottomLine>
              <SidebarBottomLeft>Link:</SidebarBottomLeft>
              <SidebarBottomRight>
                {projectList[selectedProject].Link ? (
                  <a
                    href={projectList[selectedProject].Link}
                    target="_blank"
                    style={{
                      overflowX: "ellipses",
                      display: "block",
                      textAlign: "end",
                      width: "100%",
                    }}
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
                {projectList[selectedProject].Description
                  ? projectList[selectedProject].Description
                  : "N/A"}
              </SidebarBottomRight>
            </SidebarBottomLine>
          </SidebarBottomList>
        ) : (
          "Select a project"
        )}
      </SidebarBottom>
    </RightSidebar>
  );
};

export default Sidebar;
