import { useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import {
  BoidModel,
  Bot,
  generateRandomBot,
  runStepChange,
} from "./AutomataUtils";
import { scaleLinear } from "@visx/scale";

const initialBots: Bot[] = Array.from({ length: 10 }, generateRandomBot);

function App() {
  const [count, setCount] = useState(0);
  const [bots, setBots] = useState<Bot[]>(initialBots);
  const [isRunning, setIsRunning] = useState(false);
  const [stepsPerSecond, setStepsPerSecond] = useState(1);

  useEffect(() => {
    let timeoutId: number;

    const step = () => {
      if (isRunning) {
        const { updatedBots, updatedCount } = runStepChange(
          new BoidModel(
            40,
            0.2,
            8,
            0.0005,
            0.05,
            0.05,
            6,
            3,
            0.01,
            0.00004,
            0.001
          ),
          bots,
          count
        );
        setBots(updatedBots);
        setCount(updatedCount);
        timeoutId = setTimeout(step, 1000 / stepsPerSecond); // Run every second
      }
    };

    if (isRunning) {
      timeoutId = setTimeout(step, 1000 / stepsPerSecond); // Initial run
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isRunning, bots, count]);

  const handleStartStopClick = () => {
    setIsRunning((prevIsRunning) => !prevIsRunning);
  };

  // Define scales for x and y positions
  const xScale = scaleLinear({
    domain: [-100, 100], // Adjust as needed
    range: [0, 400], // Adjust as needed
  });
  const yScale = scaleLinear({
    domain: [-100, 100], // Adjust as needed
    range: [400, 0], // Adjust as needed
  });

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Boids</h1>
      <div className="card">
        <label htmlFor="stepsInput">Steps per second:</label>
        <input
          type="number"
          id="stepsInput"
          value={stepsPerSecond}
          onChange={(e) => setStepsPerSecond(Number(e.target.value))}
          style={{ marginRight: "10px" }} // Adjust the margin as needed
        />
        <button onClick={handleStartStopClick}>
          {isRunning ? "Stop" : "Start"}
        </button>
      </div>
      {/* Bot positions visualization */}
      <svg width={400} height={400}>
        {/* Horizontal boundaries */}
        <line
          x1={xScale(-100)}
          x2={xScale(100)}
          y1={yScale(-100)}
          y2={yScale(-100)}
          stroke="gray"
          strokeWidth={2}
        />
        <line
          x1={xScale(-100)}
          x2={xScale(100)}
          y1={yScale(100)}
          y2={yScale(100)}
          stroke="gray"
          strokeWidth={2}
        />

        {/* Vertical boundaries */}
        <line
          x1={xScale(-100)}
          x2={xScale(-100)}
          y1={yScale(-100)}
          y2={yScale(100)}
          stroke="black"
          strokeWidth={2}
        />
        <line
          x1={xScale(100)}
          x2={xScale(100)}
          y1={yScale(-100)}
          y2={yScale(100)}
          stroke="black"
          strokeWidth={2}
        />

        {/* Bolded lines at x = 0 and y = 0 */}
        <line
          x1={xScale(0)}
          x2={xScale(0)}
          y1={yScale(-100)}
          y2={yScale(100)}
          stroke="black"
          strokeWidth={2}
        />
        <line
          x1={xScale(-100)}
          x2={xScale(100)}
          y1={yScale(0)}
          y2={yScale(0)}
          stroke="black"
          strokeWidth={2}
        />

        {/* Existing bot positions visualization */}
        {bots.map((bot) => (
          <rect
            key={bot.id}
            x={xScale(bot.xPos)}
            y={yScale(bot.yPos)}
            width={5}
            height={5}
            fill="blue"
          />
        ))}
      </svg>
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
              <td>{bot.xPos}</td>
              <td>{bot.yPos}</td>
              <td>{bot.xVel}</td>
              <td>{bot.yVel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default App;
