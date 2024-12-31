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
/* eslint-disable max-len */
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
  /*
  {
    src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAXUlEQVQ4jWNhoDJgGTVwEIfh9cPzHSg1TNM28QDL9YNzGxgYGesZ/v+n2HXXD88/wAI2jFrg/3+HEZkOGRkPgPxOFdP+/29k0bRNdKRWkmGAeRnGGSmRQmUw+A0EAB1DG0sM6h4hAAAAAElFTkSuQmCC",
    label: "Shared Street - Suburban",
  },
  {
    src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAUklEQVQ4jWNhoDJgGTVwJIXh9UPz/mNVwch4QNM20RGu7vB8B4b///ejK9O0S2KkrQsHv4Ga0DAgBDRtEw+AQpaggdQCLFQzCQpGDaQcDP4wBADlKw2jsAsIggAAAABJRU5ErkJggg==",
    label: "Shared Street - Envisioned",
  },
  */
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
  /* eslint-enable max-len */
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
