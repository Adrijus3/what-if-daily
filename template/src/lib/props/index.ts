/**
 * PROP LIBRARY  -  reusable, on-style props for the "What If" Daily shorts.
 *
 *   import {earth, rocket, cat, loopPhase} from './lib/props';
 *   earth(ctx, 540, 700, 1.2, t);                 // (ctx, x, y, s = 1, t = 0, opts = {}), centred on x, y
 *   rocket(ctx, 300, 900, 0.8, t, {rot: 0.5});    // per-prop options are typed (RocketOpts, CatOpts ...)
 *   cat(ctx, 800, 1100, 1, t, {flip: true, mood: 'surprised'});
 *
 * Rules every prop follows: ink outline + amber rim (screen-left) + violet rim (screen-right) + soft gradient + top highlight;
 * uses ctx.save()/restore(); deterministic (seeded rng, never Math.random); idle motion is driven by loopPhase()/idle() so it
 * loops seamlessly (the period is always D / n for a whole n, D = TIMELINE.duration). No text unless `opts.label` is passed.
 *
 *   space:   earth moon sun mars saturn blackHole asteroid rocket ufo satellite
 *   nature:  tree cloudPuff volcano wave rock iceberg
 *   animals: cat duck dinosaur shark
 *   objects: pizza burger coffeeCup phone lightbulb clock car plane house cityBlock
 *
 * Visual QA: node qa/props_gallery.mjs   (writes qa/sheets/props_gallery.png and checks loop + determinism of every prop)
 */
import type {PropFn, PropOpts} from './kit';
import * as space from './space';
import * as nature from './nature';
import * as animals from './animals';
import * as objects from './objects';

export * from './kit';
export * from './space';
export * from './nature';
export * from './animals';
export * from './objects';

/** every prop by category (used by qa/props_gallery.mjs and handy for picking props by name) */
export const PROP_CATALOG: Record<string, Record<string, PropFn<any>>> = {
  space: {earth: space.earth, moon: space.moon, sun: space.sun, mars: space.mars, saturn: space.saturn, blackHole: space.blackHole, asteroid: space.asteroid, rocket: space.rocket, ufo: space.ufo, satellite: space.satellite},
  nature: {tree: nature.tree, cloudPuff: nature.cloudPuff, volcano: nature.volcano, wave: nature.wave, rock: nature.rock, iceberg: nature.iceberg},
  animals: {cat: animals.cat, duck: animals.duck, dinosaur: animals.dinosaur, shark: animals.shark},
  objects: {pizza: objects.pizza, burger: objects.burger, coffeeCup: objects.coffeeCup, phone: objects.phone, lightbulb: objects.lightbulb, clock: objects.clock, car: objects.car, plane: objects.plane, house: objects.house, cityBlock: objects.cityBlock},
};
export type {PropOpts};
