import test from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS, createGame, startGame, updateGame, pauseGame, resumeGame } from '../src/game.js';

function advance(game, seconds, controls = {}) {
  const steps = Math.round(seconds / 0.01);
  for (let i = 0; i < steps; i++) updateGame(game, 0.01, controls);
}

test('tracks are distinct and fresh games do not share state', () => {
  assert.deepEqual(TRACKS.map(track => track.id), ['midnight', 'coast', 'desert']);
  const game = createGame();
  const other = createGame();
  assert.equal(game.status, 'ready');
  assert.equal(game.targetDistance, 5000);
  assert.equal(game.health, 3);
  game.traffic.push({ x: 0 });
  assert.equal(other.traffic.length, 0);
});

test('start resets a race while preserving difficulty and random generator', () => {
  const random = () => 0.2;
  const game = createGame({ difficulty: 'expert', random });
  const reference = game;
  startGame(game);
  advance(game, 5);
  game.health = 1;
  assert.equal(startGame(game), reference);
  assert.equal(game.status, 'running');
  assert.equal(game.distance, 0);
  assert.equal(game.health, 3);
  assert.equal(game.difficulty, 'expert');
  assert.equal(game._random, random);
});

test('automatic acceleration advances distance and braking slows the car', () => {
  const game = startGame(createGame({ random: () => 0.4 }));
  advance(game, 3);
  assert.equal(game.speed, 190);
  assert.ok(game.distance > 70);
  assert.ok(game.score > 0);
  const previousSpeed = game.speed;
  const previousDistance = game.distance;
  advance(game, 0.5, { brake: true });
  assert.ok(game.speed < previousSpeed - 100);
  assert.ok(game.distance > previousDistance);
});

test('steering is gradual, bounded, and opposing inputs cancel', () => {
  const game = startGame(createGame());
  updateGame(game, 0.01, { right: true });
  assert.ok(game.playerX > 0 && game.playerX < 0.02);
  advance(game, 2, { right: true });
  assert.ok(game.playerX <= 1 && game.playerX > 0.9);
  advance(game, 3, { left: true });
  assert.ok(game.playerX >= -1 && game.playerX < -0.9);
  const centered = startGame(createGame());
  advance(centered, 1, { left: true, right: true });
  assert.equal(centered.playerX, 0);
});

test('nitro increases speed, drains, and recharges without exceeding its limits', () => {
  const game = startGame(createGame({ random: () => 0.99 }));
  advance(game, 2, { boost: true });
  assert.equal(game.boosting, true);
  assert.ok(game.speed > 210);
  assert.ok(game.boost > 39 && game.boost < 41);
  advance(game, 1.5, { boost: true });
  assert.equal(game.boosting, false);
  assert.ok(game.boost >= 0);
  const drained = game.boost;
  advance(game, 2);
  assert.ok(game.boost > drained);
  advance(game, 20, { brake: true });
  assert.equal(game.boost, 100);
  updateGame(game, 0.01, { brake: true, boost: true });
  assert.equal(game.boosting, false);
});

test('pause and ready states freeze the simulation; resume continues it', () => {
  const game = createGame();
  updateGame(game, 0.05, { boost: true });
  assert.equal(game.elapsed, 0);
  startGame(game);
  advance(game, 1);
  pauseGame(game);
  const before = JSON.stringify(game);
  advance(game, 5, { boost: true });
  assert.equal(JSON.stringify(game), before);
  resumeGame(game);
  updateGame(game, 0.01);
  assert.ok(game.elapsed > 1);
  assert.equal(game.status, 'running');
});

test('collisions damage the car once and grant temporary invincibility', () => {
  const game = startGame(createGame());
  game.speed = 225;
  game.traffic = [
    { id: 1, x: 0, z: 0.87, speed: 100, passed: false },
    { id: 2, x: 0, z: 0.87, speed: 100, passed: false },
  ];
  updateGame(game, 0.01);
  assert.equal(game.health, 2);
  assert.ok(game.speed < 120);
  assert.ok(game.invincible > 1.7);
  assert.ok(game.collisionFlash > 0);
  advance(game, 0.2);
  assert.equal(game.health, 2);
  game.health = 1;
  game.invincible = 0;
  game.traffic = [{ id: 3, x: 0, z: 0.87, speed: 100, passed: false }];
  updateGame(game, 0.01);
  assert.equal(game.status, 'finished');
  assert.equal(game.result, 'crashed');
  assert.equal(game.speed, 0);
});

test('a clean overtake awards its bonus exactly once', () => {
  const game = startGame(createGame());
  game.speed = 225;
  game.traffic = [{ id: 1, x: 0.58, z: 1.018, speed: 100, passed: false }];
  updateGame(game, 0.01);
  assert.equal(game.overtakes, 1);
  assert.ok(game.score >= 150);
  advance(game, 0.2);
  assert.equal(game.overtakes, 1);
});

test('reaching five kilometres finishes the race and freezes its result', () => {
  const game = startGame(createGame());
  game.distance = 4999;
  game.speed = 225;
  updateGame(game, 0.05);
  assert.equal(game.distance, 5000);
  assert.equal(game.status, 'finished');
  assert.equal(game.result, 'completed');
  assert.ok(game.score >= 2000);
  const elapsed = game.elapsed;
  advance(game, 1);
  assert.equal(game.elapsed, elapsed);
});

test('large or invalid time steps cannot teleport the player', () => {
  const game = startGame(createGame());
  updateGame(game, 1000);
  assert.equal(game.elapsed, 0.05);
  const before = JSON.stringify(game);
  for (const step of [-1, NaN, Infinity, undefined]) updateGame(game, step);
  assert.equal(JSON.stringify(game), before);
});

test('spawning leaves an open lane and the opening traffic avoids the player', () => {
  const game = startGame(createGame({ difficulty: 'expert', random: () => 0 }));
  for (let i = 0; i < 140; i++) {
    updateGame(game, 0.05, { brake: true });
    const nearHorizon = game.traffic.filter(car => Math.abs(car.z) < 0.2);
    assert.ok(nearHorizon.length <= 2);
    if (game.elapsed < 6) assert.ok(game.traffic.every(car => Math.abs(car.x) > 0.3));
  }
  assert.ok(game.traffic.length > 0);
});

test('different frame rates produce nearly the same motion', () => {
  const fast = startGame(createGame({ random: () => 0.5 }));
  const slow = startGame(createGame({ random: () => 0.5 }));
  advance(fast, 3);
  for (let i = 0; i < 60; i++) updateGame(slow, 0.05);
  assert.ok(Math.abs(fast.speed - slow.speed) < 0.01);
  assert.ok(Math.abs(fast.distance - slow.distance) < 2);
});

test('expert difficulty produces more traffic than normal and easy', () => {
  const spawned = ['easy', 'normal', 'expert'].map(difficulty => {
    const game = startGame(createGame({ difficulty, random: () => 0.5 }));
    // Keep speed and player protection equal to isolate the spawn schedules.
    for (let frame = 0; frame < 400; frame++) {
      game.speed = 240;
      game.boost = 100;
      game.invincible = 100;
      updateGame(game, 0.05, { boost: true });
    }
    return game._nextCarId - 1;
  });
  assert.ok(spawned[0] < spawned[1], `easy ${spawned[0]} vs normal ${spawned[1]}`);
  assert.ok(spawned[1] < spawned[2], `normal ${spawned[1]} vs expert ${spawned[2]}`);
});

test('all difficulties respect the advertised 240 km/h nitro top speed', () => {
  for (const difficulty of ['easy', 'normal', 'expert']) {
    const game = startGame(createGame({ difficulty, random: () => 0.5 }));
    let peakSpeed = 0;
    for (let frame = 0; frame < 300; frame++) {
      updateGame(game, 0.01, { boost: true });
      peakSpeed = Math.max(peakSpeed, game.speed);
    }
    assert.equal(peakSpeed, 240, difficulty);
  }
});
