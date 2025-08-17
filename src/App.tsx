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

const BoidSvg = ({
  x,
  y,
  rotation,
}: {
  x: number;
  y: number;
  rotation: number;
}) => (
  <g transform={`translate(${x}, ${y}) rotate(${rotation})`}>
    <polygon points="-5,-5 10,0 -5,5" fill="var(--bot-color)" />
  </g>
);

const boidModel = new BoidModel(
  40,
  8,
  0.0005,
  0.05,
  0.05,
  -100,
  -100,
  100,
  100
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

  // Behavioral weight states (user-friendly 0-5 scale) - using original Reynolds algorithm proportions
  const [cohesionWeight, setCohesionWeight] = useState(1.0); // centeringFactor - weakest
  const [separationWeight, setSeparationWeight] = useState(3.0); // avoidFactor - strongest (collision avoidance priority)
  const [alignmentWeight, setAlignmentWeight] = useState(2.0); // matchingFactor - medium (flocking behavior)

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
    // Convert user-friendly 0-5 scale to algorithm factors
    // Each weight is independent and directly scaled
    const baseFactor = 0.01;

    const cohesionFactor = cohesionWeight * baseFactor;
    const separationFactor = separationWeight * baseFactor;
    const alignmentFactor = alignmentWeight * baseFactor;

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

  // Track actual SVG dimensions and update boundaries accordingly
  useEffect(() => {
    const svgElement = document.querySelector(
      `.${styles.fullSizeSvg}`
    ) as SVGElement;
    if (!svgElement) return;

    const updateSVGDimensions = () => {
      const rect = svgElement.getBoundingClientRect();
      const newDimensions = {
        width: rect.width,
        height: rect.height,
      };

      setActualSVGDimensions(newDimensions);

      // Update boid boundaries based on actual SVG dimensions
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

      console.log("SVG dimensions update:", {
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
    };

    // Initial measurement
    updateSVGDimensions();

    // Set up ResizeObserver to track changes
    const resizeObserver = new ResizeObserver(updateSVGDimensions);
    resizeObserver.observe(svgElement);

    return () => {
      resizeObserver.disconnect();
    };
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
              <h4>Behavioral Weights</h4>

              <div className={styles.configItem}>
                <label htmlFor="cohesionSlider">
                  Cohesion (move toward center): {cohesionWeight.toFixed(1)}
                </label>
                <input
                  type="range"
                  id="cohesionSlider"
                  min="0"
                  max="5"
                  step="0.1"
                  value={cohesionWeight}
                  onChange={(e) => setCohesionWeight(Number(e.target.value))}
                />
              </div>

              <div className={styles.configItem}>
                <label htmlFor="separationSlider">
                  Separation (avoid others): {separationWeight.toFixed(1)}
                </label>
                <input
                  type="range"
                  id="separationSlider"
                  min="0"
                  max="5"
                  step="0.1"
                  value={separationWeight}
                  onChange={(e) => setSeparationWeight(Number(e.target.value))}
                />
              </div>

              <div className={styles.configItem}>
                <label htmlFor="alignmentSlider">
                  Alignment (match velocities): {alignmentWeight.toFixed(1)}
                </label>
                <input
                  type="range"
                  id="alignmentSlider"
                  min="0"
                  max="5"
                  step="0.1"
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
          <svg className={styles.fullSizeSvg} width="100%" height="100%">
            {bots.map((bot) => {
              const x = xScale(bot.xPos);
              const y = yScale(bot.yPos);
              const rotation =
                (Math.atan2(-bot.yVel, bot.xVel) * 180) / Math.PI;
              return <BoidSvg key={bot.id} x={x} y={y} rotation={rotation} />;
            })}
          </svg>
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
