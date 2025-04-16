import styled from "styled-components";

import { featureColors } from "../utils/map";

const LegendElement = styled.div`
  display: flex;
  flex-direction: row;
  margin-bottom: 0.5rem;

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
`;

const LegendTextStrong = styled.div`
  margin-left: 1rem;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-weight: bold;
  position: relative;
`;

const LegendSection = styled.div`
  margin-bottom: 1rem;
`;

const LegendSectionTitle = styled.div`
  font-weight: bold;
  margin-bottom: 0.5rem;
  color: #333;
`;

// Hook to handle map events



const Legend = ({ selectedTab = "landlines", selectedType, projectList = [], selectedProject = null, handleProjectSelect = () => {} }) => {
  const statusStyles = [
    {
      label: "Existing",
      style: <svg width="30" height="30" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="15" x2="30" y2="15" stroke="#888888" strokeWidth="8" />
      </svg>
    },
    {
      label: "Design or Construction",
      style: <svg width="30" height="30" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="15" x2="30" y2="15" stroke="#888888" strokeWidth="8" />
        <line x1="0" y1="15" x2="30" y2="15" stroke="#FFFFFF" strokeWidth="4" strokeDasharray="12,5" />
      </svg>
    },
    {
      label: "Envisioned",
      style: <svg width="30" height="30" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="15" x2="30" y2="15" stroke="#888888" strokeWidth="8" strokeDasharray="12, 5" />
      </svg>
    },
  ];

  const trailTypes = [
    {
      label: "Shared Use Path",
      color: featureColors.sharedUse,
    },
    {
      label: "Protected Bike Lane",
      color: featureColors.protectedBikeLane,
    },
    {
      label: "Bike Lane",
      color: featureColors.bikeLane,
    },
    {
      label: "Shared Street",
      color: featureColors.sharedStreet,
    },
    {
      label: "Network Gap",
      color: featureColors.Gap,
    },
    {
      label: "Foot Trail",
      color: featureColors.footTrail,
    },
  ];

  return (
    <LegendWrapper>
      {selectedTab === "landlines" ? (
        <>
          <LegendSection>
            <LegendSectionTitle>Trail Status</LegendSectionTitle>
            {statusStyles.map((status) => (
              <LegendElement key={status.label}>
                {status.style}
                <LegendText>{status.label}</LegendText>
              </LegendElement>
            ))}
          </LegendSection>

          <LegendSection>
            <LegendSectionTitle>Trail Types</LegendSectionTitle>
            {trailTypes.map((trail) => (
              <LegendElement key={trail.label}>
                <svg width="30" height="30" xmlns="http://www.w3.org/2000/svg">
                  <line x1="0" y1="15" x2="30" y2="15" stroke={trail.color} strokeWidth="8" />
                </svg>
                {trail.label === selectedType ? (
                  <LegendTextStrong>{trail.label}</LegendTextStrong>
                ) : (
                  <LegendText>{trail.label}</LegendText>
                )}
              </LegendElement>
            ))}
          </LegendSection>
        </>
      ) : (
        Object.keys(projectList).map((project) => (
          <LegendElement
            onClick={() => {
              handleProjectSelect(project);
            }}
            key={project}
            selectable={true}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="30"
              height="30"
              fill={project === selectedProject ? "red" : "currentColor"}
              className="bi bi-geo-alt-fill"
              viewBox="0 0 25 25"
            >
              <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6" />
            </svg>
            {project === selectedProject ? (
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
        ))
      )}
    </LegendWrapper>
  );
};

export default Legend;
