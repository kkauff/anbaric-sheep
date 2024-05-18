import { useEffect, useState } from "react";
import "./App.css";
import {
  BoidModel,
  Bot,
  generateRandomBot,
  runStepChange,
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

function App() {
  const [count, setCount] = useState(0);
  const [bots, setBots] = useState<Bot[]>(initialBots);
  const [isRunning, setIsRunning] = useState(false);
  const [stepsPerSecond, setStepsPerSecond] = useState(1);

  const MIN = -100;
  const MAX = 100;
  const SCALE = 400;

  useEffect(() => {
    let timeoutId: number;

    const step = () => {
      if (isRunning) {
        const { updatedBots, updatedCount } = runStepChange(
          new BoidModel(
            40,
            // 0.2,
            8,
            0.0005,
            0.05,
            0.05,
            // 6,
            // 3,
            // 0.01,
            // 0.00004,
            // 0.001
            MIN,
            MIN,
            MAX,
            MAX
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

  const xScale = scaleLinear({
    domain: [MIN, MAX],
    range: [0, SCALE],
  });
  const yScale = scaleLinear({
    domain: [MIN, MAX],
    range: [SCALE, 0],
  });

  return (
    <>
      <h1>Boids</h1>
      <p>
        https://vanhunteradams.com/Pico/Animal_Movement/Boids-algorithm.html#Algorithm-Overview
      </p>
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
      <svg width={SCALE} height={SCALE}>
        {/* Horizontal boundaries */}
        <line
          x1={xScale(MIN)}
          x2={xScale(MAX)}
          y1={yScale(MIN)}
          y2={yScale(MIN)}
          stroke="gray"
          strokeWidth={2}
        />
        <line
          x1={xScale(MIN)}
          x2={xScale(MAX)}
          y1={yScale(MAX)}
          y2={yScale(MAX)}
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

        {/* Custom SVG for bot positions */}
        {bots.map((bot) => {
          const x = xScale(bot.xPos);
          const y = yScale(bot.yPos);
          const rotation = (Math.atan2(bot.yVel, bot.xVel) * 180) / Math.PI;

          return <BoidSvg key={bot.id} x={x} y={y} rotation={rotation} />;
        })}
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
