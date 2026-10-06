/** Pure, frame-rate independent simulation for the arcade sprint. */
export const TRACKS = [
  {
    id: 'midnight',
    name: 'Midnight Run',
    location: 'Tokyo, Japan',
    description: 'Neon lights. Open highway. One perfect run.',
    color: '#c0f65a',
    accent: '#c0f65a',
    skyTop: '#0b1023',
    skyBottom: '#242840',
    horizon: '#524061',
    ground: '#182129',
    road: '#303842',
    scenery: 'city',
  },
  {
    id: 'coast',
    name: 'Coastal Escape',
    location: 'Amalfi Coast, Italy',
    description: 'Chase the sunset along the Mediterranean.',
    color: '#7ed9ef',
    accent: '#7ed9ef',
    skyTop: '#314964',
    skyBottom: '#efa989',
    horizon: '#eeae89',
    ground: '#36776f',
    road: '#42494d',
    scenery: 'coast',
  },
  {
    id: 'desert',
    name: 'Desert Heat',
    location: 'Monument Valley, USA',
    description: 'Red rocks and long roads under a golden sky.',
    color: '#f4b36a',
    accent: '#f4b36a',
    skyTop: '#663c4c',
    skyBottom: '#f0b27c',
    horizon: '#ca7854',
    ground: '#9a6147',
    road: '#51494a',
    scenery: 'desert',
  },
];

const LANES = [-0.58, 0, 0.58];
const CAR_COLORS = ['#f5c143', '#ed765d', '#e1e6eb', '#9886ed', '#71bbd4'];
const DIFFICULTIES = {
  easy: { cruise: 175, topSpeed: 240, spawnMin: 1.4, spawnRange: 0.5, trafficSpeed: 100 },
  normal: { cruise: 190, topSpeed: 240, spawnMin: 1.0, spawnRange: 0.4, trafficSpeed: 106 },
  expert: { cruise: 205, topSpeed: 240, spawnMin: 0.75, spawnRange: 0.4, trafficSpeed: 114 },
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function roll(game) {
  const value = Number(game._random());
  return Number.isFinite(value) ? clamp(value, 0, 0.999999) : 0.5;
}

/** Create a fresh race. No timers, DOM access, or global state are needed. */
export function createGame({ difficulty = 'normal', random = Math.random } = {}) {
  const selectedDifficulty = Object.hasOwn(DIFFICULTIES, difficulty) ? difficulty : 'normal';
  return {
    status: 'ready',
    difficulty: selectedDifficulty,
    playerX: 0,
    speed: 0,
    distance: 0,
    elapsed: 0,
    score: 0,
    overtakes: 0,
    health: 3,
    boost: 100,
    boosting: false,
    invincible: 0,
    collisionFlash: 0,
    lastOvertake: 0,
    traffic: [],
    roadCurve: 0,
    result: null,
    targetDistance: 5000,
    _random: typeof random === 'function' ? random : Math.random,
    _steeringVelocity: 0,
    _spawnTimer: 1.1,
    _nextCarId: 1,
    _boostReady: true,
    _penalty: 0,
    _completionBonus: 0,
  };
}

/** Restart the same state object so renderers can keep their reference. */
export function startGame(game) {
  Object.assign(game, createGame({ difficulty: game.difficulty, random: game._random }));
  game.status = 'running';
  return game;
}

export function pauseGame(game) {
  if (game.status === 'running') {
    game.status = 'paused';
    game.boosting = false;
  }
  return game;
}

export function resumeGame(game) {
  if (game.status === 'paused') game.status = 'running';
  return game;
}

function spawnTraffic(game, config) {
  // Never create a three-car wall at the horizon, even while the player brakes.
  const nearHorizon = game.traffic.filter(car => Math.abs(car.z) < 0.2);
  if (nearHorizon.length >= 2) return;

  let availableLanes = LANES.filter(x =>
    !nearHorizon.some(car => Math.abs(car.x - x) < 0.22),
  );
  // The opening seconds give the player room to learn the controls.
  if (game.elapsed < 6) availableLanes = availableLanes.filter(x => Math.abs(x - game.playerX) > 0.3);
  if (!availableLanes.length) return;

  const x = availableLanes[Math.floor(roll(game) * availableLanes.length)];
  game.traffic.push({
    id: game._nextCarId++,
    x,
    z: 0.02,
    color: CAR_COLORS[Math.floor(roll(game) * CAR_COLORS.length)],
    speed: config.trafficSpeed + roll(game) * 24,
    passed: false,
    hit: false,
  });
}

/**
 * Advance at most 50 ms. Call in small steps if advancing a longer period.
 * input: { left, right, brake, boost }, all optional booleans.
 */
export function updateGame(game, dt, input = {}) {
  if (game.status !== 'running') return game;
  const step = Number.isFinite(dt) ? clamp(dt, 0, 0.05) : 0;
  if (step === 0) return game;
  const controls = input ?? {};
  const config = DIFFICULTIES[game.difficulty] ?? DIFFICULTIES.normal;

  game.elapsed += step;
  game.invincible = Math.max(0, game.invincible - step);
  game.collisionFlash = Math.max(0, game.collisionFlash - step);
  game.lastOvertake = Math.max(0, game.lastOvertake - step);

  if (!controls.boost || game.boost >= 30) game._boostReady = true;
  const useBoost = Boolean(controls.boost && !controls.brake && game._boostReady && game.boost > 0);
  if (useBoost) {
    game.boost = Math.max(0, game.boost - 30 * step);
    if (game.boost === 0) game._boostReady = false;
  } else {
    game.boost = Math.min(100, game.boost + 8 * step);
  }
  game.boosting = useBoost && game.boost > 0;

  if (controls.brake) {
    game.speed = Math.max(0, game.speed - 245 * step);
  } else {
    const onShoulder = Math.abs(game.playerX) > 0.89;
    const targetSpeed = onShoulder ? 130 : useBoost ? config.topSpeed : config.cruise;
    const acceleration = useBoost ? 110 : 67;
    if (game.speed < targetSpeed) game.speed = Math.min(targetSpeed, game.speed + acceleration * step);
    else game.speed = Math.max(targetSpeed, game.speed - (onShoulder ? 110 : 45) * step);
  }

  const steeringDirection = Number(Boolean(controls.right)) - Number(Boolean(controls.left));
  const steeringTarget = steeringDirection * (1.45 + Math.min(game.speed, 260) / 260 * 0.7);
  const steeringResponse = 1 - Math.exp(-12 * step);
  game._steeringVelocity += (steeringTarget - game._steeringVelocity) * steeringResponse;
  game.playerX = clamp(game.playerX + game._steeringVelocity * step, -0.96, 0.96);

  game.distance = Math.min(game.targetDistance, game.distance + game.speed / 3.6 * step);
  game.roadCurve = Math.sin(game.distance / 360) * 0.28 + Math.sin(game.distance / 870) * 0.12;

  game._spawnTimer -= step;
  if (game._spawnTimer <= 0) {
    spawnTraffic(game, config);
    game._spawnTimer = config.spawnMin + roll(game) * config.spawnRange;
  }

  for (const car of game.traffic) {
    const previousZ = car.z;
    // Relative motion makes braking useful and lets faster traffic pull away.
    const relativeSpeed = (game.speed - (car.speed ?? config.trafficSpeed)) / 300;
    car.z += clamp(relativeSpeed, -0.15, 0.75) * step;

    const inCollisionZone = car.z >= 0.84 && previousZ <= 0.98;
    if (!car.hit && !car.passed && game.invincible === 0 && inCollisionZone && Math.abs(car.x - game.playerX) < 0.21) {
      car.hit = true;
      car.passed = true;
      game.health = Math.max(0, game.health - 1);
      game.speed *= 0.48;
      game.invincible = 1.8;
      game.collisionFlash = 0.55;
      game._penalty += 150;
      if (game.health === 0) {
        game.status = 'finished';
        game.result = 'crashed';
        game.speed = 0;
        game.boosting = false;
        break;
      }
    }

    if (!car.passed && previousZ < 1.02 && car.z >= 1.02) {
      car.passed = true;
      game.overtakes++;
      game.lastOvertake = 0.8;
    }
  }
  game.traffic = game.traffic.filter(car => car.z <= 1.35 && car.z >= -0.25);

  if (game.status === 'running' && game.distance >= game.targetDistance) {
    game.status = 'finished';
    game.result = 'completed';
    game.boosting = false;
    game._completionBonus = 1000 + game.health * 150;
  }
  game.score = Math.max(0, Math.floor(game.distance * 0.2) + game.overtakes * 150 - game._penalty + game._completionBonus);
  return game;
}
