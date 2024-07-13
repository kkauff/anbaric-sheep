import { useEffect, useState } from "react";
import "./App.css";
import {
  BoidModel,
  Bot,
  generateRandomBot,
  runStepChange,
  IdentityModel,
  Model,
} from "./AutomataUtils";
import { scaleLinear } from "@visx/scale";

const initialBots: Bot[] = Array.from({ length: 10 }, generateRandomBot);

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

const models: { displayString: string; model: Model }[] = [
  {
    displayString: "Boids",
    model: new BoidModel(40, 8, 0.0005, 0.05, 0.05, -100, -100, 100, 100),
  },
  { displayString: "Identity", model: new IdentityModel() },
];

function App() {
  const [count, setCount] = useState(0);
  const [bots, setBots] = useState<Bot[]>(initialBots);
  const [isRunning, setIsRunning] = useState(false);
  const [stepsPerSecond, setStepsPerSecond] = useState(50);
  const [selectedModel, setSelectedModel] = useState<Model>(models[0].model);
  const [showTable, setShowTable] = useState(false);
  const [scale, setScale] = useState({
    width: window.innerWidth,
    height: window.innerHeight - 60,
  });

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
          selectedModel,
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
  }, [isRunning, bots, count, selectedModel, stepsPerSecond]);

  const handleStartStopClick = () => {
    setIsRunning((prevIsRunning) => !prevIsRunning);
  };

  return (
    <div className={`container ${showTable ? "show-table" : ""}`}>
      <header className="header">
        <h1 className="title">Boids</h1>
        <div className="config-bar">
          <label htmlFor="stepsInput">Steps per second:</label>
          <input
            type="number"
            id="stepsInput"
            value={stepsPerSecond}
            onChange={(e) => setStepsPerSecond(Number(e.target.value))}
            style={{ marginRight: "10px" }}
          />
          <label htmlFor="modelSelect">Model:</label>
          <select
            id="modelSelect"
            onChange={(e) =>
              setSelectedModel(models[parseInt(e.target.value)].model)
            }
            style={{ marginRight: "10px" }}
          >
            {models.map((model, index) => (
              <option key={index} value={index}>
                {model.displayString}
              </option>
            ))}
          </select>
          <button onClick={handleStartStopClick}>
            {isRunning ? "Stop" : "Start"}
          </button>
          <button onClick={() => setShowTable(!showTable)}>
            {showTable ? "Hide" : "Show"} Position Table
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
      {showTable && (
        <div className="position-table">
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
      )}
    </div>
  );
}

export default App;
