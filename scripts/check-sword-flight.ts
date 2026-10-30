import assert from "node:assert/strict";
import { test } from "node:test";
import { advanceFlight, createFlightState, type FlightInput, type FlightState } from "../lib/swordFlightSimulation";
import { FLIGHT_FOOT_CLEARANCE, FLIGHT_ISLANDS, FLIGHT_WALK_SPEED, type FlightPoint } from "../lib/swordFlightSpec";
import { FLIGHT_ISLAND_LAYOUTS } from "../lib/flightIslandLayout";
import { FLIGHT_PAVILION, islandEdge, islandSurfaceHeight, islandTopHeight, pavilionRoofHeight } from "../lib/flightIslandShape";
import { createIslandGeometry } from "../lib/flightLandscapeGeometry";
import { flightLandingAt } from "../lib/swordFlightLanding";
import { flightSurfaceAt } from "../lib/swordFlightSurface";
import { isFlightPositionBlocked, traceFlightMotion } from "../lib/swordFlightCollision";
import { FLIGHT_MOUNTAINS, flightMountainHeight } from "../lib/flightMountainShape";
import { createFlightMountainGeometry } from "../lib/flightMountainGeometry";

const IDLE: FlightInput = { turn: 0, pitch: 0, lift: 0, boost: false, brake: false, land: false };
const home = FLIGHT_ISLANDS[0];

function run(state: FlightState, input: Partial<FlightInput>, frames: number) {
  for (let frame = 0; frame < frames; frame += 1) state = advanceFlight(state, { ...IDLE, ...input }, 1 / 60);
  return state;
}

function walkingAt(x: number, z: number, yaw = 0): FlightState {
  const surface = flightSurfaceAt([x, 300, z]);
  assert.ok(surface, "test starts on a real surface");
  return { ...createFlightState(), position: [x, surface.height + FLIGHT_FOOT_CLEARANCE, z], yaw, mode: "walking", speed: 0, location: surface.islandId };
}

test("all ten islands accept landing on their terrace and record one visit", () => {
  for (const island of FLIGHT_ISLANDS) {
    const position: FlightPoint = [island.position[0], island.position[1] + 7, island.position[2] + FLIGHT_ISLAND_LAYOUTS[island.id].deckZ];
    const state = advanceFlight({ ...createFlightState(), position }, { ...IDLE, land: true }, 1 / 60);
    assert.equal(state.mode, "walking", island.id);
    assert.equal(state.location, island.id);
    assert.deepEqual(state.visited, [island.id]);
    assert.equal(isFlightPositionBlocked(state.position), false, island.id);
    assert.deepEqual(run(state, { land: true }, 10).visited, [island.id]);
  }
});

test("standing still on a platform has no automatic forward movement", () => {
  const state = walkingAt(0, FLIGHT_ISLAND_LAYOUTS.wind.deckZ);
  assert.deepEqual(run(state, {}, 600).position, state.position);
});

test("walking traverses the terrace steps into the island", () => {
  const state = walkingAt(0, FLIGHT_ISLAND_LAYOUTS.wind.deckZ);
  const next = run(state, { pitch: 1 }, Math.ceil(10.5 / FLIGHT_WALK_SPEED * 60));
  assert.equal(next.mode, "walking");
  assert.ok(next.position[2] < state.position[2] - 9);
  assert.equal(isFlightPositionBlocked(next.position), false);
});

test("pavilion stairs lead inside without colliding with the floor", () => {
  const state = walkingAt(FLIGHT_PAVILION.x, FLIGHT_PAVILION.z + 6);
  const next = run(state, { pitch: 1 }, Math.ceil(7 / FLIGHT_WALK_SPEED * 60));
  assert.equal(next.mode, "walking");
  assert.ok(next.position[2] < FLIGHT_PAVILION.z + 1, JSON.stringify(next));
  assert.ok(Math.abs(next.position[1] - (home.position[1] + FLIGHT_PAVILION.floor + 0.22 + FLIGHT_FOOT_CLEARANCE)) < 0.01);
});

test("walking forwards and backwards off an island automatically resumes outward flight", () => {
  const edge = islandEdge(Math.PI / 2, home.radius);
  for (const backward of [false, true]) {
    let state = walkingAt(0, edge - 0.5, backward ? 0 : Math.PI);
    for (let frame = 0; frame < 120 && state.mode === "walking"; frame += 1) {
      state = advanceFlight(state, { ...IDLE, pitch: backward ? -1 : 1 }, 1 / 60);
    }
    assert.equal(state.mode, "flying");
    assert.ok(state.position[2] >= edge);
    const next = run(state, {}, 30);
    assert.ok(next.position[2] > state.position[2]);
    assert.equal(isFlightPositionBlocked(next.position), false);
  }
});

test("space takes off from a platform and flight can be slowed to land again", () => {
  const state = walkingAt(0, FLIGHT_ISLAND_LAYOUTS.wind.deckZ);
  const flying = advanceFlight(state, { ...IDLE, lift: 1 }, 1 / 60);
  assert.equal(flying.mode, "flying");
  assert.ok(flying.position[1] > state.position[1]);
  const next = advanceFlight(flying, { ...IDLE, land: true }, 1 / 60);
  assert.equal(next.mode, "walking");
  const braking = run({ ...createFlightState(), position: [2000, 150, 2000] }, { brake: true }, 120);
  assert.ok(braking.speed >= 3 && braking.speed < 3.01);
});

test("open sky beyond the previous boundary never resets the player", () => {
  const state = { ...createFlightState(), position: [3000, 160, 3000] as FlightPoint };
  const next = run(state, { boost: true }, 600);
  assert.equal(next.position[0], 3000);
  assert.ok(next.position[2] < 2650 && next.position[2] > 2400);
  assert.ok(next.elapsed > 9.9);
});

test("flying above island geometry is clear while roofs and cliffs block the swept body", () => {
  assert.equal(traceFlightMotion([-3, 20, 8], [-3, 20, -10]).blocked, false);
  assert.equal(traceFlightMotion([-3, 12, 8], [-3, 12, -10]).blocked, true);
  assert.equal(traceFlightMotion([40, 2, 0], [10, 2, 0]).blocked, true);
  const next = run({ ...createFlightState(), position: [40, 2, 0], yaw: -Math.PI / 2 }, {}, 100);
  assert.ok(next.position[0] > 25 && next.position[0] < 40);
  assert.ok(Math.abs(next.position[2]) < 1e-10);
});

test("landing cannot teleport through a roof or snap up through an island", () => {
  const x = FLIGHT_PAVILION.x + 3;
  const z = FLIGHT_PAVILION.z + 3;
  assert.equal(flightLandingAt([x, home.position[1] + pavilionRoofHeight(3, 3) + 0.3, z]), null);
  assert.equal(flightLandingAt([0, 0, FLIGHT_ISLAND_LAYOUTS.wind.deckZ]), null);
  assert.equal(flightLandingAt([0, 80, FLIGHT_ISLAND_LAYOUTS.wind.deckZ]), null);
});

test("lifting escapes vertical cliff contact instead of getting stuck against its side", () => {
  const contact = run({ ...createFlightState(), position: [40, 4.5, 0], yaw: -Math.PI / 2 }, {}, 120);
  const lifted = run(contact, { lift: 1 }, 60);
  assert.ok(lifted.position[1] > contact.position[1] + 9);
  assert.equal(isFlightPositionBlocked(lifted.position), false);
});

test("turning away frees the rider from beneath a real cliff overhang", () => {
  const contact = run({ ...createFlightState(), position: [40, 2, 0], yaw: -Math.PI / 2 }, {}, 120);
  const escaped = run(contact, { turn: 1 }, 200);
  assert.ok(Math.hypot(escaped.position[0] - contact.position[0], escaped.position[2] - contact.position[2]) > 5);
  assert.equal(isFlightPositionBlocked(escaped.position), false);
});

test("trees and pavilion posts block walking rather than resetting the player", () => {
  const postX = FLIGHT_PAVILION.x + FLIGHT_PAVILION.postOffset;
  const postZ = FLIGHT_PAVILION.z + FLIGHT_PAVILION.postOffset;
  const next = run(walkingAt(postX, postZ - 1, Math.PI), { pitch: 1 }, 60);
  assert.ok(next.position[2] < postZ - 0.3);
  assert.equal(next.mode, "walking");
  const tree = FLIGHT_ISLAND_LAYOUTS.wind.trees[0];
  assert.equal(isFlightPositionBlocked([tree.position[0], home.position[1] + tree.position[1] + FLIGHT_FOOT_CLEARANCE, tree.position[2]]), true);
});

test("mountain surfaces match rendered triangles and remain clear above their actual height", () => {
  for (const mountain of FLIGHT_MOUNTAINS.slice(0, 5)) {
    const geometry = createFlightMountainGeometry(mountain.shape + 1);
    const positions = geometry.getAttribute("position");
    for (let index = 0; index < positions.count; index += 87) {
      let x = 0, y = 0, z = 0;
      for (let offset = 0; offset < 3; offset += 1) {
        x += positions.getX(index + offset) / 3;
        y += positions.getY(index + offset) / 3;
        z += positions.getZ(index + offset) / 3;
      }
      if (y < 0.01) continue;
      const worldX = mountain.x + x * mountain.width * Math.cos(mountain.rotation) + z * mountain.width * 0.8 * Math.sin(mountain.rotation);
      const worldZ = mountain.z - x * mountain.width * Math.sin(mountain.rotation) + z * mountain.width * 0.8 * Math.cos(mountain.rotation);
      const height = flightMountainHeight(worldX, worldZ, mountain);
      assert.ok(height !== null);
      assert.ok(Math.abs(height - (-45 + y * mountain.height)) < 0.0001);
      assert.equal(isFlightPositionBlocked([worldX, height + 4, worldZ]), false);
    }
    geometry.dispose();
  }
});

test("walking height agrees with the actual island triangles at every sampled face", () => {
  for (const island of FLIGHT_ISLANDS) {
    const geometry = createIslandGeometry(island.radius, island.height, true);
    const positions = geometry.getAttribute("position");
    const indices = geometry.getIndex()!;
    for (let index = 0; index < indices.count; index += 15) {
      let x = 0, y = 0, z = 0;
      for (let offset = 0; offset < 3; offset += 1) {
        const vertex = indices.getX(index + offset);
        x += positions.getX(vertex) / 3;
        y += positions.getY(vertex) / 3;
        z += positions.getZ(vertex) / 3;
      }
      const height = islandSurfaceHeight(x, z, island.radius);
      assert.ok(height !== null);
      assert.ok(Math.abs(height - y) < 0.0001, `${island.id}: ${height} != ${y}`);
    }
    geometry.dispose();
  }
});

test("zero elapsed time leaves the state untouched", () => {
  const state = createFlightState();
  assert.equal(advanceFlight(state, { ...IDLE, land: true }, 0), state);
  assert.equal(isFlightPositionBlocked(state.position), false);
  assert.ok(Number.isFinite(islandTopHeight(0, 0, home.radius)));
});
