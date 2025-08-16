import { useEffect, useState } from "react";
import "./App.css";
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
    <polygon points="-5,-5 10,0 -5,5" fill="brown" />
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
  const [scale, setScale] = useState({
    width: window.innerWidth,
    height: window.innerHeight - 60,
  });

  // Update bots when numberOfBots changes
  useEffect(() => {
    setBots(Array.from({ length: numberOfBots }, generateRandomBot));
    setCount(0); // Reset count when changing number of bots
  }, [numberOfBots]);

  useEffect(() => {
    const handleResize = () => {
      setScale({ width: window.innerWidth, height: window.innerHeight - 60 });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const xScale = scaleLinear({
    domain: [-100, 100],
    range: [0, scale.width],
  });
  const yScale = scaleLinear({
    domain: [-100, 100],
    range: [scale.height, 0],
  });

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
    <div className="app-container">
      {/* Configuration Panel - Left Side */}
      <div className="config-panel">
        <Button
          icon={<Cog />}
          minimal
          onClick={() => setShowConfigPanel(!showConfigPanel)}
          className="panel-toggle-button"
          title="Configuration"
        >
          {showConfigPanel && (
            <span className="panel-label">Configuration</span>
          )}
        </Button>
        <Collapse isOpen={showConfigPanel}>
          <div className="panel-content">
            <div className="config-item">
              <label htmlFor="stepsInput">Steps per second:</label>
              <input
                type="number"
                id="stepsInput"
                value={stepsPerSecond}
                onChange={(e) => setStepsPerSecond(Number(e.target.value))}
              />
            </div>
            <div className="config-item">
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
          </div>
        </Collapse>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <header className="header">
          <h1 className="title">Boids</h1>
          <div className="control-bar">
            <button onClick={handleStartStopClick}>
              {isRunning ? "Stop" : "Start"}
            </button>
          </div>
        </header>
        <div className="grid-container">
          <svg className="full-size-svg" width="100%" height="100%">
            {bots.map((bot) => {
              const x = xScale(bot.xPos);
              const y = yScale(bot.yPos);
              const rotation = (Math.atan2(bot.yVel, bot.xVel) * 180) / Math.PI;
              return <BoidSvg key={bot.id} x={x} y={y} rotation={rotation} />;
            })}
          </svg>
        </div>
      </div>

      {/* Position Table Panel - Right Side */}
      <div className="table-panel">
        <Button
          icon={<Th />}
          minimal
          onClick={() => setShowTablePanel(!showTablePanel)}
          className="panel-toggle-button"
          title="Position Table"
        >
          {showTablePanel && <span className="panel-label">Bot Positions</span>}
        </Button>
        <Collapse isOpen={showTablePanel}>
          <div className="panel-content">
            <div className="table-container">
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
