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
  // private turnFactor: number;
  private protectedRange: number;
  private centeringFactor: number;
  private avoidFactor: number;
  private matchingFactor: number;
  // private maxSpeed: number;
  // private minSpeed: number;
  // private maxBias: number;
  // private biasIncrement: number;
  // private defaultBiasVal: number;
  private xMin: number;
  private yMin: number;
  private xMax: number;
  private yMax: number;

  constructor(
    visualRange: number,
    // turnFactor: number,
    protectedRange: number,
    centeringFactor: number,
    avoidFactor: number,
    matchingFactor: number,
    // maxSpeed: number,
    // minSpeed: number,
    // maxBias: number,
    // biasIncrement: number,
    // defaultBiasVal: number
    xMin: number,
    yMin: number,
    xMax: number,
    yMax: number
  ) {
    this.visualRange = visualRange;
    // this.turnFactor = turnFactor;
    this.protectedRange = protectedRange;
    this.centeringFactor = centeringFactor;
    this.avoidFactor = avoidFactor;
    this.matchingFactor = matchingFactor;
    // this.maxSpeed = maxSpeed;
    // this.minSpeed = minSpeed;
    // this.maxBias = maxBias;
    // this.biasIncrement = biasIncrement;
    // this.defaultBiasVal = defaultBiasVal;
    this.xMin = xMin;
    this.yMin = yMin;
    this.xMax = xMax;
    this.yMax = yMax;
  }

  update(bots: Bot[]): Bot[] {
    const visualRangeSquared = this.visualRange * this.visualRange;
    const protectedRangeSquared = this.protectedRange * this.protectedRange;

    return bots.map((boid) => {
      let xposAvg = 0;
      let yposAvg = 0;
      let xvelAvg = 0;
      let yvelAvg = 0;
      let neighboringBoids = 0;
      let closeDx = 0;
      let closeDy = 0;

      for (const otherBoid of bots) {
        if (boid.id !== otherBoid.id) {
          const dx = boid.xPos - otherBoid.xPos;
          const dy = boid.yPos - otherBoid.yPos;
          const squaredDistance = dx * dx + dy * dy;

          if (squaredDistance < visualRangeSquared) {
            if (squaredDistance < protectedRangeSquared) {
              closeDx += boid.xPos - otherBoid.xPos;
              closeDy += boid.yPos - otherBoid.yPos;
            } else {
              xposAvg += otherBoid.xPos;
              yposAvg += otherBoid.yPos;
              xvelAvg += otherBoid.xVel;
              yvelAvg += otherBoid.yVel;
              neighboringBoids++;
            }
          }
        }
      }

      if (neighboringBoids > 0) {
        xposAvg /= neighboringBoids;
        yposAvg /= neighboringBoids;
        xvelAvg /= neighboringBoids;
        yvelAvg /= neighboringBoids;

        boid.xVel +=
          (xposAvg - boid.xPos) * this.centeringFactor +
          (xvelAvg - boid.xVel) * this.matchingFactor;
        boid.yVel +=
          (yposAvg - boid.yPos) * this.centeringFactor +
          (yvelAvg - boid.yVel) * this.matchingFactor;
      }

      boid.xVel += closeDx * this.avoidFactor;
      boid.yVel += closeDy * this.avoidFactor;

      // Update position
      boid.xPos += boid.xVel;
      boid.yPos += boid.yVel;

      // Boundary handling
      if (boid.xPos < this.xMin) {
        boid.xPos = this.xMin;
        boid.xVel = -boid.xVel; // Reflect velocity
      } else if (boid.xPos > this.xMax) {
        boid.xPos = this.xMax;
        boid.xVel = -boid.xVel; // Reflect velocity
      }

      if (boid.yPos < this.yMin) {
        boid.yPos = this.yMin;
        boid.yVel = -boid.yVel; // Reflect velocity
      } else if (boid.yPos > this.yMax) {
        boid.yPos = this.yMax;
        boid.yVel = -boid.yVel; // Reflect velocity
      }

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
