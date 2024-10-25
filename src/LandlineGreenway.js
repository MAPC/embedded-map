import React, { useState } from 'react';
import styled, { keyframes, css } from 'styled-components';

// Styled Components
const Container = styled.div`
  font-family: Arial, sans-serif;
  width:1000px;
  margin: 0 auto;
  padding: 20px;
  z-index: 100000;
  position: absolute;
  top: 50%; /* Center vertically */
  left: 50%; /* Center horizontally */
  transform: translate(-50%, -50%); /* Adjust position to be centered */
  background-color: ${props => (props.isExpanded ? '#fff' : 'transparent')}; /* Conditional background color */
  border-radius: 8px; /* Optional: Rounded corners */
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); /* Optional: Shadow for depth */
`;

const Header = styled.h1`
  color: #0047AB;
  text-align: center;
`;

const ContentWrapper = styled.div`
  display: flex; /* Use flexbox for horizontal layout */
  justify-content: space-between; /* Space between the columns */
  margin-top: 20px; /* Optional: Add some margin for spacing */
`;

const ChartContainer = styled.div`
  flex: 1; /* Allow this to grow and fill space */
  margin-right: 20px; /* Add space between columns */
`;

const SummaryContainer = styled.div`
  flex: 1; /* Allow this to grow and fill space */
`;

const CityBar = styled.div`
  width: 100%; /* Full width */
  display: flex;
  align-items: center;
  margin-bottom: 5px;
`;

const CityName = styled.span`
  width: 100px;
  text-align: right;
  padding-right: 10px;
  font-size: 12px;
`;

const expandAnimation = keyframes`
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
`;

const BarContainer = styled.div`
  flex-grow: 1;
  height: 15px;
  display: flex;
`;

const Bar = styled.div`
  height: 100%;
  transform-origin: left;
  transition: all 0.3s ease;

  &:hover {
    filter: brightness(1.2);
  }

  ${props => props.animate && css`
    animation: ${expandAnimation} 0.5s ease-out;
  `}
`;

const Summary = styled.div`
  background-color: #f0f0f0;
  padding: 20px;
`;

const Terminology = styled.div`
  background-color: #f0f0f0;
  padding: 20px;
  margin-top: 20px;
`;

const ToggleButton = styled.button`
  position: absolute; /* Absolute position */
  top: 35%; /* Fixed top position */
  right: -17.5vw; /* Fixed right position */
  padding: 10px 20px;
  background-color: #0047AB;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  z-index: 100001; /* Ensure it's above the container */

  &:hover {
    background-color: #003377;
  }
`;

const CloseButton = styled.button`
  position: absolute; /* Position it in the top-right corner */
  top: 10px; /* Distance from the top */
  right: 10px; /* Distance from the right */
  background: none; /* No background */
  border: none; /* No border */
  color: #0047AB; /* Cross color */
  font-size: 24px; /* Size of the cross */
  cursor: pointer;
  
  &:hover {
    color: #003377; /* Darker shade on hover */
  }
`;

const LandlineGreenway = () => {
  const [hoveredCity, setHoveredCity] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLandlinePopup, setShowLandlinePopup] = useState(false);
  const cities = [
    { name: 'Acton', existing: 20, inConstruction: 5, proposed: 75 },
    { name: 'Arlington', existing: 40, inConstruction: 0, proposed: 60 },
    // Add more cities here...
  ];

  const landlineData = [
    { name: 'Greenway 1' },
    { name: 'Greenway 2' },
    { name: 'Greenway 3' },
    // Add more landline greenways as needed
  ];

  const toggleDataVisibility = () => {
    setIsExpanded(prev => !prev);
  };

  return (
    <Container isExpanded={isExpanded}>
      {isExpanded && <Header>LANDLINE GREENWAY STATUS</Header>}
      
      {isExpanded && (
        <CloseButton onClick={toggleDataVisibility}>
          &times; {/* Cross symbol */}
        </CloseButton>
      )}
      
      {!isExpanded && (
        <ToggleButton onClick={toggleDataVisibility}>
          Show Landline Greenway Status
        </ToggleButton>
      )}
      
      {isExpanded && (
        <ContentWrapper>
          <ChartContainer>
            <ChartContainer>
              {cities.map(city => (
                <CityBar
                  key={city.name}
                  onMouseEnter={() => setHoveredCity(city.name)}
                  onMouseLeave={() => setHoveredCity(null)}
                >
                  <CityName>{city.name}</CityName>
                  <BarContainer>
                    <Bar
                      style={{ width: `${city.existing}%`, backgroundColor: '#4CAF50' }}
                      animate={hoveredCity === city.name}
                    />
                    <Bar
                      style={{ width: `${city.inConstruction}%`, backgroundColor: '#FFC107' }}
                      animate={hoveredCity === city.name}
                    />
                    <Bar
                      style={{ width: `${city.proposed}%`, backgroundColor: '#FFE4B5' }}
                      animate={hoveredCity === city.name}
                    />
                  </BarContainer>
                </CityBar>
              ))}
            </ChartContainer>
          </ChartContainer>
          <SummaryContainer>
            <Summary>
              <h2>ENTIRE MAPC REGION</h2>
              <p>913 MILES TOTAL</p>
              <BarContainer style={{ height: '30px', marginBottom: '10px' }}>
                <Bar style={{ width: '36%', backgroundColor: '#4CAF50' }} />
                <Bar style={{ width: '9%', backgroundColor: '#FFC107' }} />
                <Bar style={{ width: '55%', backgroundColor: '#FFE4B5' }} />
              </BarContainer>
              <p>325 MILES EXISTING | 82 MILES IN CONSTRUCTION | 506 MILES PROPOSED</p>
            </Summary>
            <Terminology>
              <h2>ADDITIONAL TERMINOLOGY</h2>
              <p><strong>Trail or Path</strong> is a broadly generic term used to describe a corridor that is separated from traffic on its own right of way and largely through a natural landscape. A trail may be restricted to certain types of users, or time of day, or may have no restrictions.</p>
              <p><strong>Rail Trail</strong> is a trail that runs along a former rail bed corridor. It may be fully engineered with a paved surface of asphalt or stone dust, or unimproved with a dirt or ballast path.</p>
              <p><strong>Bikeway</strong> is a term used at one point in time to qualify for funding construction of trails for transportation (such as the Minuteman Bikeway). However, bicyclists are just one of many users on these trails.</p>
            </Terminology>
          </SummaryContainer>
        </ContentWrapper>
      )}

      {/* Popup for Landline Greenways */}
      {showLandlinePopup && (
        <LandlinePopup
          landlines={landlineData}
          onClose={() => setShowLandlinePopup(false)}
        />
      )}
    </Container>
  );
};

export default LandlineGreenway;
