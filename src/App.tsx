import { useEffect, useState } from "react";
import styles from "./App.module.scss";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import {
  BoidModel,
  Bot,
  generateRandomBot,
  runStepChange,
} from "./AutomataUtils";
import { scaleLinear } from "@visx/scale";
import { Button, Collapse } from "@blueprintjs/core";
import { Cog, Th } from "@blueprintjs/icons";
import { ThreeBoidsRenderer } from "./ThreeBoidsRenderer";

const BoidSvg = ({
  x,
  y,
  rotation,
  size,
}: {
  x: number;
  y: number;
  rotation: number;
  size: number;
}) => {
  // Convert size (10-200) to scale factor (0.2-4.0)
  const scaleFactor = size / 50;
  const halfWidth = 5 * scaleFactor;
  const length = 10 * scaleFactor;

  return (
    <g transform={`translate(${x}, ${y}) rotate(${rotation})`}>
      <polygon
        points={`-${halfWidth},-${halfWidth} ${length},0 -${halfWidth},${halfWidth}`}
        fill="var(--bot-color)"
      />
    </g>
  );
};

const boidModel = new BoidModel(
  75, // visualRange - Ben Eater uses 75
  1, // turnFactor - Ben Eater uses 1 for boundary turning
  20, // minDistance - Ben Eater uses 20 for separation
  0.005, // centeringFactor - Ben Eater uses 0.005
  0.05, // avoidFactor - Ben Eater uses 0.05
  0.05, // matchingFactor - Ben Eater uses 0.05
  15, // speedLimit - Ben Eater uses 15
  50, // margin - boundary margin for gentle turning
  -100, // xMin
  -100, // yMin
  100, // xMax
  100 // yMax
);

function App() {
  const [count, setCount] = useState(0);
  const [numberOfBots, setNumberOfBots] = useState(10);
  const [bots, setBots] = useState<Bot[]>(() =>
    Array.from({ length: 10 }, generateRandomBot)
  );
  const [isRunning, setIsRunning] = useState(false);
  const [stepsPerSecond, setStepsPerSecond] = useState(50);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [showTablePanel, setShowTablePanel] = useState(false);

  // Behavioral weight states (user-friendly 0-100 scale) - Ben Eater's proportions
  const [cohesionWeight, setCohesionWeight] = useState(50); // centeringFactor - Ben Eater uses 0.005
  const [separationWeight, setSeparationWeight] = useState(50); // avoidFactor - Ben Eater uses 0.05
  const [alignmentWeight, setAlignmentWeight] = useState(50); // matchingFactor - Ben Eater uses 0.05

  // Visual settings
  const [useThreeJS, setUseThreeJS] = useState(true); // Default to Three.js for better visuals
  const [showTrails, setShowTrails] = useState(false);
  const [trailLength, setTrailLength] = useState(50); // Trail length (10-200 points)
  const [botSize, setBotSize] = useState(50); // Bot size scale (0-100)

  const [scale, setScale] = useState({
    width: window.innerWidth,
    height: window.innerHeight - 60,
  });

  // Track actual SVG dimensions
  const [actualSVGDimensions, setActualSVGDimensions] = useState({
    width: 0,
    height: 0,
  });

  // Update bots when numberOfBots changes
  useEffect(() => {
    setBots(Array.from({ length: numberOfBots }, generateRandomBot));
    setCount(0); // Reset count when changing number of bots
  }, [numberOfBots]);

  // Update boid model weights when behavioral weights change
  useEffect(() => {
    // Convert user-friendly 0-100 scale to Ben Eater's algorithm factors
    // Cohesion: 0-100 -> 0-0.01 (Ben Eater uses 0.005)
    // Separation: 0-100 -> 0-0.1 (Ben Eater uses 0.05)
    // Alignment: 0-100 -> 0-0.1 (Ben Eater uses 0.05)

    const cohesionFactor = (cohesionWeight / 100) * 0.01;
    const separationFactor = (separationWeight / 100) * 0.1;
    const alignmentFactor = (alignmentWeight / 100) * 0.1;

    boidModel.updateWeights(cohesionFactor, separationFactor, alignmentFactor);
  }, [cohesionWeight, separationWeight, alignmentWeight]);

  // Update scale to account for panel widths
  useEffect(() => {
    const updateScale = () => {
      const leftPanelWidth = showConfigPanel ? 281 + 40 : 40;
      const rightPanelWidth = showTablePanel ? 250 + 40 : 40;
      const availableWidth =
        window.innerWidth - leftPanelWidth - rightPanelWidth;
      const availableHeight = window.innerHeight - 60; // Account for header

      const newScale = {
        width: Math.max(availableWidth, 200), // Minimum width
        height: Math.max(availableHeight, 200), // Minimum height
      };

      setScale(newScale);
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [showConfigPanel, showTablePanel]);

  // Track actual container dimensions and update boundaries accordingly
  useEffect(() => {
    const setupDimensionTracking = () => {
      const containerElement = document.querySelector(
        `.${styles.gridContainer}`
      ) as HTMLElement;
      if (!containerElement) {
        // Retry after a short delay if container not found
        setTimeout(setupDimensionTracking, 100);
        return;
      }

      const updateContainerDimensions = () => {
        const rect = containerElement.getBoundingClientRect();
        const newDimensions = {
          width: rect.width,
          height: rect.height,
        };

        // Only update if dimensions are valid
        if (newDimensions.width > 0 && newDimensions.height > 0) {
          setActualSVGDimensions(newDimensions);

          // Update boid boundaries based on actual container dimensions
          const aspectRatio = newDimensions.width / newDimensions.height;
          const baseSize = 100;

          let xRange, yRange;
          if (aspectRatio > 1) {
            xRange = baseSize * aspectRatio;
            yRange = baseSize;
          } else {
            xRange = baseSize;
            yRange = baseSize / aspectRatio;
          }

          boidModel.updateBoundaries(-xRange, -yRange, xRange, yRange);

          console.log("Container dimensions update:", {
            actualWidth: newDimensions.width,
            actualHeight: newDimensions.height,
            aspectRatio,
            xRange,
            yRange,
            boundaries: {
              xMin: -xRange,
              yMin: -yRange,
              xMax: xRange,
              yMax: yRange,
            },
          });
        }
      };

      // Initial measurement with a small delay
      setTimeout(updateContainerDimensions, 50);

      // Set up ResizeObserver to track changes
      const resizeObserver = new ResizeObserver(updateContainerDimensions);
      resizeObserver.observe(containerElement);

      return () => {
        resizeObserver.disconnect();
      };
    };

    return setupDimensionTracking();
  }, [showConfigPanel, showTablePanel]); // Re-run when panels change

  // Calculate coordinate ranges using actual SVG dimensions to match boundary calculations
  const actualWidth = actualSVGDimensions.width || scale.width;
  const actualHeight = actualSVGDimensions.height || scale.height;
  const aspectRatio = actualWidth / actualHeight;
  const baseSize = 100;

  let xRange, yRange;
  if (aspectRatio > 1) {
    xRange = baseSize * aspectRatio;
    yRange = baseSize;
  } else {
    xRange = baseSize;
    yRange = baseSize / aspectRatio;
  }

  const xScale = scaleLinear({
    domain: [-xRange, xRange],
    range: [0, actualWidth],
  });
  const yScale = scaleLinear({
    domain: [-yRange, yRange],
    range: [actualHeight, 0],
  });

  // Debug logging for scale values (only log occasionally to avoid spam)
  if (count % 100 === 0) {
    console.log("Fixed scale values:", {
      actualSVGWidth: actualWidth,
      actualSVGHeight: actualHeight,
      aspectRatio,
      xRange,
      yRange,
      xDomain: [-xRange, xRange],
      yDomain: [-yRange, yRange],
      xRangePixels: [0, actualWidth],
      yRangePixels: [actualHeight, 0],
    });
  }

  useEffect(() => {
    let timeoutId: number;

    const step = () => {
      if (isRunning) {
        const { updatedBots, updatedCount } = runStepChange(
          boidModel,
          bots,
          count
        );
        setBots(updatedBots);
        setCount(updatedCount);
        timeoutId = setTimeout(step, 1000 / stepsPerSecond);
      }
    };

    if (isRunning) {
      timeoutId = setTimeout(step, 1000 / stepsPerSecond);
    }

    return () => clearTimeout(timeoutId);
  }, [isRunning, bots, count, stepsPerSecond]);

  const handleStartStopClick = () => {
    setIsRunning((prevIsRunning) => !prevIsRunning);
  };

  return (
    <div className={styles.appContainer}>
      {/* Configuration Panel - Left Side */}
      <div className={styles.configPanel}>
        <Button
          icon={<Cog />}
          minimal
          onClick={() => setShowConfigPanel(!showConfigPanel)}
          className={styles.panelToggleButton}
          title="Configuration"
        >
          {showConfigPanel && (
            <span className={styles.panelLabel}>Configuration</span>
          )}
        </Button>
        <Collapse isOpen={showConfigPanel}>
          <div className={styles.panelContent}>
            <div className={styles.configItem}>
              <label htmlFor="stepsInput">Steps per second:</label>
              <input
                type="number"
                id="stepsInput"
                value={stepsPerSecond}
                onChange={(e) => setStepsPerSecond(Number(e.target.value))}
              />
            </div>
            <div className={styles.configItem}>
              <label htmlFor="botsInput">Number of bots:</label>
              <input
                type="number"
                id="botsInput"
                value={numberOfBots}
                min="1"
                max="100"
                onChange={(e) => setNumberOfBots(Number(e.target.value))}
              />
            </div>

            <div className={styles.configSection}>
              <h4>Visual Settings</h4>

              <div className={styles.configItem}>
                <label>
                  <input
                    type="checkbox"
                    checked={useThreeJS}
                    onChange={(e) => setUseThreeJS(e.target.checked)}
                  />
                  Use Three.js Renderer (Enhanced Graphics)
                </label>
              </div>

              <div className={styles.configItem}>
                <label>
                  <input
                    type="checkbox"
                    checked={showTrails}
                    onChange={(e) => setShowTrails(e.target.checked)}
                  />
                  Show Trails
                </label>
              </div>

              {showTrails && (
                <div className={styles.configItem}>
                  <label htmlFor="trailLengthSlider">
                    Trail Length: {trailLength.toFixed(0)} points
                  </label>
                  <input
                    type="range"
                    id="trailLengthSlider"
                    min="5"
                    max="200"
                    step="5"
                    value={trailLength}
                    onChange={(e) => setTrailLength(Number(e.target.value))}
                  />
                </div>
              )}

              <div className={styles.configItem}>
                <label htmlFor="botSizeSlider">
                  Bot Size: {botSize.toFixed(0)}
                </label>
                <input
                  type="range"
                  id="botSizeSlider"
                  min="10"
                  max="200"
                  step="5"
                  value={botSize}
                  onChange={(e) => setBotSize(Number(e.target.value))}
                />
              </div>
            </div>

            <div className={styles.configSection}>
              <h4>Behavioral Weights</h4>

              <div className={styles.configItem}>
                <label htmlFor="cohesionSlider">
                  Cohesion (move toward center): {cohesionWeight.toFixed(0)}
                </label>
                <input
                  type="range"
                  id="cohesionSlider"
                  min="0"
                  max="100"
                  step="1"
                  value={cohesionWeight}
                  onChange={(e) => setCohesionWeight(Number(e.target.value))}
                />
              </div>

              <div className={styles.configItem}>
                <label htmlFor="separationSlider">
                  Separation (avoid others): {separationWeight.toFixed(0)}
                </label>
                <input
                  type="range"
                  id="separationSlider"
                  min="0"
                  max="100"
                  step="1"
                  value={separationWeight}
                  onChange={(e) => setSeparationWeight(Number(e.target.value))}
                />
              </div>

              <div className={styles.configItem}>
                <label htmlFor="alignmentSlider">
                  Alignment (match velocities): {alignmentWeight.toFixed(0)}
                </label>
                <input
                  type="range"
                  id="alignmentSlider"
                  min="0"
                  max="100"
                  step="1"
                  value={alignmentWeight}
                  onChange={(e) => setAlignmentWeight(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        </Collapse>
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        <header className={styles.header}>
          <h1 className={styles.title}>Boids</h1>
          <div className={styles.controlBar}>
            <button onClick={handleStartStopClick}>
              {isRunning ? "Stop" : "Start"}
            </button>
          </div>
        </header>
        <div className={styles.gridContainer}>
          {useThreeJS ? (
            <ThreeBoidsRenderer
              bots={bots}
              width={actualWidth}
              height={actualHeight}
              xRange={xRange}
              yRange={yRange}
              showTrails={showTrails}
              trailLength={trailLength}
              botSize={botSize}
            />
          ) : (
            <svg className={styles.fullSizeSvg} width="100%" height="100%">
              {bots.map((bot) => {
                const x = xScale(bot.xPos);
                const y = yScale(bot.yPos);
                const rotation =
                  (Math.atan2(-bot.yVel, bot.xVel) * 180) / Math.PI;
                return (
                  <BoidSvg
                    key={bot.id}
                    x={x}
                    y={y}
                    rotation={rotation}
                    size={botSize}
                  />
                );
              })}
            </svg>
          )}
        </div>
      </div>

      {/* Position Table Panel - Right Side */}
      <div className={styles.tablePanel}>
        <Button
          icon={<Th />}
          minimal
          onClick={() => setShowTablePanel(!showTablePanel)}
          className={styles.panelToggleButton}
          title="Position Table"
        >
          {showTablePanel && (
            <span className={styles.panelLabel}>Bot Positions</span>
          )}
        </Button>
        <Collapse isOpen={showTablePanel}>
          <div className={styles.panelContent}>
            <div className={styles.tableContainer}>
              <table>
                <thead>
                  <tr>
                    <th>Bot ID</th>
                    <th>xPos</th>
                    <th>yPos</th>
                    <th>xVel</th>
                    <th>yVel</th>
                  </tr>
                </thead>
                <tbody>
                  {bots.map((bot) => (
                    <tr key={bot.id}>
                      <td>{bot.id}</td>
                      <td>{bot.xPos.toFixed(2)}</td>
                      <td>{bot.yPos.toFixed(2)}</td>
                      <td>{bot.xVel.toFixed(2)}</td>
                      <td>{bot.yVel.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Collapse>
      </div>
    </div>
  );
}

export default App;
