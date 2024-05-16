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

export class IdentityModel implements Model {
  update(bots: Bot[]): Bot[] {
    return bots;
  }
}

export class BoidModel implements Model {
  private visualRange: number;
  private turnFactor: number;
  private protectedRange: number;
  private centeringFactor: number;
  private avoidFactor: number;
  private matchingFactor: number;
  private maxSpeed: number;
  private minSpeed: number;
  private maxBias: number;
  private biasIncrement: number;
  private defaultBiasVal: number;

  constructor(
    visualRange: number,
    turnFactor: number,
    protectedRange: number,
    centeringFactor: number,
    avoidFactor: number,
    matchingFactor: number,
    maxSpeed: number,
    minSpeed: number,
    maxBias: number,
    biasIncrement: number,
    defaultBiasVal: number
  ) {
    this.visualRange = visualRange;
    this.turnFactor = turnFactor;
    this.protectedRange = protectedRange;
    this.centeringFactor = centeringFactor;
    this.avoidFactor = avoidFactor;
    this.matchingFactor = matchingFactor;
    this.maxSpeed = maxSpeed;
    this.minSpeed = minSpeed;
    this.maxBias = maxBias;
    this.biasIncrement = biasIncrement;
    this.defaultBiasVal = defaultBiasVal;
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

      // Boundary handling (adjust velocities based on margins)

      // Bias handling (based on scout group)

      // Speed control (minSpeed and maxSpeed enforcement)

      // Update position
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
  const xVel = Math.random() * 2 - 1; // Random x velocity (-1 to 1)
  const yVel = Math.random() * 2 - 1; // Random y velocity (-1 to 1)

  return { id, xPos, yPos, xVel, yVel };
}
