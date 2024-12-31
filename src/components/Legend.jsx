import styled from "styled-components";

import { featureColors } from "../utils/map";

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

// Hook to handle map events

const LegendImages = [
  {
    src: (
      <svg width="30" height="30" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="15" x2="30" y2="15" stroke={featureColors.sharedUse} strokeWidth="8" />
      </svg>
    ),
    label: "Shared Use Path - Existing",
  },
  {
    src: (
      <svg width="30" height="30" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="15" x2="30" y2="15" stroke={featureColors.sharedUse} strokeWidth="8" />
        <line x1="0" y1="15" x2="30" y2="15" stroke="#FFFFFF" strokeWidth="4" strokeDasharray="12,5" />
      </svg>
    ),
    label: "Shared Use Path - Design",
  },
  {
    src: (
      <svg width="30" height="30" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="15" x2="30" y2="15" stroke={featureColors.sharedUse} strokeWidth="8" strokeDasharray="12, 5" />
      </svg>
    ),
    label: "Shared Use Path - Envisioned",
  },
  {
    src: (
      <svg width="30" height="30" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="15" x2="30" y2="15" stroke={featureColors.sharedUseUnimproved} strokeWidth="8" />
      </svg>
    ),
    label: "Shared Use Path - Unimproved Surface",
  },
  {
    src: (
      <svg width="30" height="30" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="15" x2="30" y2="15" stroke={featureColors.protectedBikeLane} strokeWidth="8" />
        <line x1="0" y1="15" x2="30" y2="15" stroke="#FFFFFF" strokeWidth="4" />
      </svg>
    ),
    label: "Protected Bike Lane and Sidewalk",
  },
  {
    src: (
      <svg width="30" height="30" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="15" x2="30" y2="15" stroke={featureColors.protectedBikeLane} strokeWidth="8" />
        <line x1="0" y1="15" x2="30" y2="15" stroke="#FFFFFF" strokeWidth="4" strokeDasharray="12,5" />
      </svg>
    ),
    label: "Protected Bike Lane - Design or Construction",
  },
  {
    src: (
      <svg width="30" height="30" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="15" x2="30" y2="15" stroke={featureColors.bikeLane} strokeWidth="8" />
        <line x1="0" y1="15" x2="30" y2="15" stroke="#FFFFFF" strokeWidth="4" />
      </svg>
    ),
    label: "Bike Lane and Sidewalk",
  },
  {
    src: (
      <svg width="30" height="30" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="15" x2="30" y2="15" stroke={featureColors.bikeLane} strokeWidth="8" />
        <line x1="0" y1="15" x2="30" y2="15" stroke="#FFFFFF" strokeWidth="4" strokeDasharray="12,5" />
      </svg>
    ),
    label: "Bike Lane - Design or Construction",
  },
  {
    src: (
      <svg width="30" height="30" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="15" x2="30" y2="15" stroke={featureColors.sharedStreet} strokeWidth="8" />
        <line x1="0" y1="15" x2="30" y2="15" stroke="#FFFFFF" strokeWidth="4" />
      </svg>
    ),
    label: "Shared Street - Urban",
  },
  {
    src: (
      <svg width="30" height="30" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="15" x2="30" y2="15" stroke={featureColors.sharedStreet} strokeWidth="8" />
      </svg>
    ),
    label: "Shared Street - Suburban",
  },
  {
    src: (
      <svg width="30" height="30" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="15" x2="30" y2="15" stroke={featureColors.sharedStreet} strokeWidth="8" strokeDasharray="12, 5" />
      </svg>
    ),
    label: "Shared Street - Envisioned",
  },

  {
    src: (
      <svg width="30" height="30" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="15" x2="30" y2="15" stroke="#888888" strokeWidth="8" />
        <line x1="0" y1="15" x2="30" y2="15" stroke={featureColors.Gap} strokeWidth="7" />
      </svg>
    ),
    label: "Gap - Facility Type TBD",
  },
  {
    src: (
      <svg width="30" height="30" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="15" x2="30" y2="15" stroke={featureColors.footTrail} strokeWidth="8" />
      </svg>
    ),
    label: "Foot Trail - Existing",
  },
  {
    src: (
      <svg width="30" height="30" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="15" x2="30" y2="15" stroke={featureColors.footTrail} strokeWidth="8" strokeDasharray="12, 5" />
      </svg>
    ),
    label: "Foot Trail - Envisioned",
  },
];

const Legend = ({ selectedTab = "landlines", selectedType, projectList = [], selectedProject = null, handleProjectSelect = () => {} }) => {
  return (
    <LegendWrapper>
      {/* render selected tab */}
      {selectedTab === "landlines" ? (
        <>
          {LegendImages.map((legend) => {
            return (
              <LegendElement key={legend.label}>
                {typeof legend.src === "string" ? <img src={legend.src} style={{ width: 30, height: 30 }} /> : legend.src}

                {legend.label === selectedType ? <LegendTextStrong>{legend.label}</LegendTextStrong> : <LegendText>{legend.label}</LegendText>}
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
          );
        })
      )}
    </LegendWrapper>
  );
};

export default Legend;
