# Anbaric Sheep

**React application for simulating swarm behavior based on user-configurable rules.**

Currently we only include a **Boids** simulator with rules pre-configured but weights for those rules configurable.  Boids is an artificial life program that intends to mimic th behavior of flocking birds.  You can learn more about Boids [here](https://people.ece.cornell.edu/land/courses/ece4760/labs/s2021/Boids/Boids.html).  For the Boids siimulator, the user can configure:
* Steps per second
* Number of bots
* Size of bots
* Show trails and trail length (number of steps)
* Weights for:
  * Cohesion - desire to move toward the center of the positions of the other bots
  * Separation - desire to be as far away as possible from the other bots
  * Alignment - desire to have the same velocity as the other bots
    
The user can also optionally view bot positions in a table.

https://github.com/user-attachments/assets/99b9e625-471b-4567-9356-46af0ee62396

