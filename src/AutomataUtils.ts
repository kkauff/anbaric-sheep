export interface Bot {
  id: number;
  xPos: number;
  yPos: number;
  xVel: number;
  yVel: number;
}

// Define a common interface for all models
export interface Model {
  update(bots: Bot[]): Bot[];
}

export class BoidModel implements Model {
  private visualRange: number;
  private turnFactor: number;
  private minDistance: number; // Separation distance (like Ben Eater's)
  private centeringFactor: number;
  private avoidFactor: number;
  private matchingFactor: number;
  private speedLimit: number;
  private margin: number; // Boundary margin
  private xMin: number;
  private yMin: number;
  private xMax: number;
  private yMax: number;

  constructor(
    visualRange: number,
    turnFactor: number,
    minDistance: number,
    centeringFactor: number,
    avoidFactor: number,
    matchingFactor: number,
    speedLimit: number,
    margin: number,
    xMin: number,
    yMin: number,
    xMax: number,
    yMax: number
  ) {
    this.visualRange = visualRange;
    this.turnFactor = turnFactor;
    this.minDistance = minDistance;
    this.centeringFactor = centeringFactor;
    this.avoidFactor = avoidFactor;
    this.matchingFactor = matchingFactor;
    this.speedLimit = speedLimit;
    this.margin = margin;
    this.xMin = xMin;
    this.yMin = yMin;
    this.xMax = xMax;
    this.yMax = yMax;
  }

  // Method to update the behavioral weights
  updateWeights(
    centeringFactor: number,
    avoidFactor: number,
    matchingFactor: number
  ) {
    this.centeringFactor = centeringFactor;
    this.avoidFactor = avoidFactor;
    this.matchingFactor = matchingFactor;
  }

  // Method to update the boundaries
  updateBoundaries(xMin: number, yMin: number, xMax: number, yMax: number) {
    this.xMin = xMin;
    this.yMin = yMin;
    this.xMax = xMax;
    this.yMax = yMax;
  }

  // Helper function to calculate distance between two boids
  private distance(boid1: Bot, boid2: Bot): number {
    return Math.sqrt(
      (boid1.xPos - boid2.xPos) * (boid1.xPos - boid2.xPos) +
        (boid1.yPos - boid2.yPos) * (boid1.yPos - boid2.yPos)
    );
  }

  // Rule 1: Cohesion - fly towards center of mass of neighbors
  private flyTowardsCenter(boid: Bot, bots: Bot[]): void {
    let centerX = 0;
    let centerY = 0;
    let numNeighbors = 0;

    for (const otherBoid of bots) {
      if (
        boid.id !== otherBoid.id &&
        this.distance(boid, otherBoid) < this.visualRange
      ) {
        centerX += otherBoid.xPos;
        centerY += otherBoid.yPos;
        numNeighbors++;
      }
    }

    if (numNeighbors > 0) {
      centerX = centerX / numNeighbors;
      centerY = centerY / numNeighbors;

      boid.xVel += (centerX - boid.xPos) * this.centeringFactor;
      boid.yVel += (centerY - boid.yPos) * this.centeringFactor;
    }
  }

  // Rule 2: Separation - avoid other boids that are too close
  private avoidOthers(boid: Bot, bots: Bot[]): void {
    let moveX = 0;
    let moveY = 0;

    for (const otherBoid of bots) {
      if (boid.id !== otherBoid.id) {
        if (this.distance(boid, otherBoid) < this.minDistance) {
          moveX += boid.xPos - otherBoid.xPos;
          moveY += boid.yPos - otherBoid.yPos;
        }
      }
    }

    boid.xVel += moveX * this.avoidFactor;
    boid.yVel += moveY * this.avoidFactor;
  }

  // Rule 3: Alignment - match velocity with neighbors
  private matchVelocity(boid: Bot, bots: Bot[]): void {
    let avgDX = 0;
    let avgDY = 0;
    let numNeighbors = 0;

    for (const otherBoid of bots) {
      if (
        boid.id !== otherBoid.id &&
        this.distance(boid, otherBoid) < this.visualRange
      ) {
        avgDX += otherBoid.xVel;
        avgDY += otherBoid.yVel;
        numNeighbors++;
      }
    }

    if (numNeighbors > 0) {
      avgDX = avgDX / numNeighbors;
      avgDY = avgDY / numNeighbors;

      boid.xVel += (avgDX - boid.xVel) * this.matchingFactor;
      boid.yVel += (avgDY - boid.yVel) * this.matchingFactor;
    }
  }

  // Speed limiting
  private limitSpeed(boid: Bot): void {
    const speed = Math.sqrt(boid.xVel * boid.xVel + boid.yVel * boid.yVel);
    if (speed > this.speedLimit) {
      boid.xVel = (boid.xVel / speed) * this.speedLimit;
      boid.yVel = (boid.yVel / speed) * this.speedLimit;
    }
  }

  // Boundary handling - Ben Eater's gentle approach with hard constraints
  private keepWithinBounds(boid: Bot): void {
    // Gentle turning when approaching boundaries
    if (boid.xPos < this.xMin + this.margin) {
      boid.xVel += this.turnFactor;
    }
    if (boid.xPos > this.xMax - this.margin) {
      boid.xVel -= this.turnFactor;
    }
    if (boid.yPos < this.yMin + this.margin) {
      boid.yVel += this.turnFactor;
    }
    if (boid.yPos > this.yMax - this.margin) {
      boid.yVel -= this.turnFactor;
    }

    // Hard constraints to prevent going outside boundaries
    if (boid.xPos < this.xMin) {
      boid.xPos = this.xMin;
      boid.xVel = Math.abs(boid.xVel); // Bounce back
    }
    if (boid.xPos > this.xMax) {
      boid.xPos = this.xMax;
      boid.xVel = -Math.abs(boid.xVel); // Bounce back
    }
    if (boid.yPos < this.yMin) {
      boid.yPos = this.yMin;
      boid.yVel = Math.abs(boid.yVel); // Bounce back
    }
    if (boid.yPos > this.yMax) {
      boid.yPos = this.yMax;
      boid.yVel = -Math.abs(boid.yVel); // Bounce back
    }
  }

  update(bots: Bot[]): Bot[] {
    return bots.map((boid) => {
      // Apply the three rules
      this.flyTowardsCenter(boid, bots);
      this.avoidOthers(boid, bots);
      this.matchVelocity(boid, bots);

      // Apply constraints
      this.limitSpeed(boid);
      this.keepWithinBounds(boid);

      // Update position based on velocity
      boid.xPos += boid.xVel;
      boid.yPos += boid.yVel;

      return boid;
    });
  }
}

export function runStepChange(
  model: Model,
  bots: Bot[],
  count: number
): { updatedBots: Bot[]; updatedCount: number } {
  const updatedBots = model.update(bots);
  const updatedCount = count + 1;
  return { updatedBots, updatedCount };
}

export function generateRandomBot(): Bot {
  const id = Math.floor(Math.random() * 1000); // Unique ID for each bot
  const xPos = Math.random() * 100 - 50; // Random x position in [-50, 50]
  const yPos = Math.random() * 100 - 50; // Random y position in [-50, 50]

  // Generate velocity with guaranteed minimum magnitude to prevent stationary bots
  let xVel = Math.random() * 2 - 1; // Random x velocity (-1 to 1)
  let yVel = Math.random() * 2 - 1; // Random y velocity (-1 to 1)

  // Ensure minimum speed of 0.3 to prevent near-zero velocities
  const currentSpeed = Math.sqrt(xVel * xVel + yVel * yVel);
  const minSpeed = 0.3;

  if (currentSpeed < minSpeed) {
    // Scale up the velocity to meet minimum speed requirement
    const scale = minSpeed / currentSpeed;
    xVel *= scale;
    yVel *= scale;
  }

  return { id, xPos, yPos, xVel, yVel };
}
