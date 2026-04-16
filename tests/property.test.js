/**
 * Property-Based Tests using fast-check
 * Generates hundreds of random seeds and asserts invariants hold universally
 */
const fc = require('fast-check');
const { DungeonGenerator } = require('../src/dungeon');

// Helper: get leaf nodes
function getLeafNodes(node) {
    if (!node) return [];
    if (node.isLeaf()) return [node];
    return [...getLeafNodes(node.left), ...getLeafNodes(node.right)];
}

// Arbitrary for dungeon configs
const dungeonConfigArb = fc.record({
    mapSize: fc.integer({ min: 400, max: 1200 }),
    minRoomSize: fc.integer({ min: 30, max: 80 }),
    maxDepth: fc.integer({ min: 3, max: 7 }),
    seed: fc.integer({ min: 1, max: 1000000 }),
    numKeys: fc.integer({ min: 1, max: 5 })
});

function generateFullDungeon(config) {
    const gen = new DungeonGenerator({
        mapSize: config.mapSize,
        minRoomSize: config.minRoomSize,
        maxDepth: config.maxDepth,
        seed: config.seed
    });
    gen.generate();
    gen.buildMST();
    gen.placeKeysAndDoors(config.numKeys);
    return gen;
}

describe('Property-Based Tests (fast-check)', () => {

    describe('BSP Properties', () => {
        test('rooms are always non-overlapping for any config', () => {
            fc.assert(
                fc.property(dungeonConfigArb, (config) => {
                    const gen = generateFullDungeon(config);

                    for (let i = 0; i < gen.rooms.length; i++) {
                        for (let j = i + 1; j < gen.rooms.length; j++) {
                            const a = gen.rooms[i].rect;
                            const b = gen.rooms[j].rect;

                            const noOverlap =
                                a.x + a.width <= b.x ||
                                b.x + b.width <= a.x ||
                                a.y + a.height <= b.y ||
                                b.y + b.height <= a.y;

                            if (!noOverlap) return false;
                        }
                    }
                    return true;
                }),
                { numRuns: 100 }
            );
        });

        test('at least 2 rooms are always generated', () => {
            fc.assert(
                fc.property(dungeonConfigArb, (config) => {
                    const gen = generateFullDungeon(config);
                    return gen.rooms.length >= 2;
                }),
                { numRuns: 100 }
            );
        });

        test('all rooms have positive dimensions', () => {
            fc.assert(
                fc.property(dungeonConfigArb, (config) => {
                    const gen = generateFullDungeon(config);
                    return gen.rooms.every(r =>
                        r.rect.width > 0 && r.rect.height > 0
                    );
                }),
                { numRuns: 100 }
            );
        });

        test('leaf partition area equals total canvas area', () => {
            fc.assert(
                fc.property(dungeonConfigArb, (config) => {
                    const gen = new DungeonGenerator({
                        mapSize: config.mapSize,
                        minRoomSize: config.minRoomSize,
                        maxDepth: config.maxDepth,
                        seed: config.seed
                    });
                    gen.generate();

                    const leaves = getLeafNodes(gen.root);
                    const totalArea = leaves.reduce(
                        (s, l) => s + l.rect.width * l.rect.height, 0
                    );

                    return totalArea === config.mapSize * config.mapSize;
                }),
                { numRuns: 100 }
            );
        });
    });

    describe('MST Properties', () => {
        test('corridor count is always N-1 for N rooms', () => {
            fc.assert(
                fc.property(dungeonConfigArb, (config) => {
                    const gen = generateFullDungeon(config);
                    return gen.corridors.length === gen.rooms.length - 1;
                }),
                { numRuns: 100 }
            );
        });

        test('MST graph is always connected', () => {
            fc.assert(
                fc.property(dungeonConfigArb, (config) => {
                    const gen = generateFullDungeon(config);

                    const visited = new Set();
                    const stack = [0];
                    while (stack.length > 0) {
                        const id = stack.pop();
                        if (visited.has(id)) continue;
                        visited.add(id);
                        const neighbors = gen.graph.get(id) || [];
                        for (const n of neighbors) {
                            if (!visited.has(n)) stack.push(n);
                        }
                    }

                    return visited.size === gen.rooms.length;
                }),
                { numRuns: 100 }
            );
        });

        test('MST graph has no cycles', () => {
            fc.assert(
                fc.property(dungeonConfigArb, (config) => {
                    const gen = generateFullDungeon(config);
                    return gen.detectCycles() === 0;
                }),
                { numRuns: 100 }
            );
        });
    });

    describe('Key-Door Properties', () => {
        test('key always precedes door on all paths from start', () => {
            fc.assert(
                fc.property(dungeonConfigArb, (config) => {
                    const gen = generateFullDungeon(config);
                    const startRoom = gen.rooms.find(r => r.isStart);
                    if (!startRoom) return true;

                    const keys = gen.rooms.filter(r => r.hasKey !== null);
                    const doors = gen.rooms.filter(r => r.hasDoor !== null);

                    for (const doorRoom of doors) {
                        const keyRoom = keys.find(k => k.hasKey === doorRoom.hasDoor);
                        if (!keyRoom) continue;

                        // Must NOT be able to reach door without key
                        if (gen.canReachWithoutKey(startRoom.id, doorRoom.id, keyRoom.id)) {
                            return false;
                        }
                    }
                    return true;
                }),
                { numRuns: 200 }
            );
        });

        test('exactly one start room exists', () => {
            fc.assert(
                fc.property(dungeonConfigArb, (config) => {
                    const gen = generateFullDungeon(config);
                    const startCount = gen.rooms.filter(r => r.isStart).length;
                    return startCount === 1;
                }),
                { numRuns: 100 }
            );
        });

        test('no room has both key and door', () => {
            fc.assert(
                fc.property(dungeonConfigArb, (config) => {
                    const gen = generateFullDungeon(config);
                    return gen.rooms.every(r =>
                        !(r.hasKey !== null && r.hasDoor !== null)
                    );
                }),
                { numRuns: 100 }
            );
        });
    });

    describe('Full Pipeline Properties', () => {
        test('all rooms reachable from start for any config', () => {
            fc.assert(
                fc.property(dungeonConfigArb, (config) => {
                    const gen = generateFullDungeon(config);
                    const analysis = gen.analyzeGraph();
                    return analysis.reachable === gen.rooms.length;
                }),
                { numRuns: 200 }
            );
        });

        test('analyzeGraph never throws for any valid config', () => {
            fc.assert(
                fc.property(dungeonConfigArb, (config) => {
                    const gen = generateFullDungeon(config);
                    try {
                        gen.analyzeGraph();
                        return true;
                    } catch {
                        return false;
                    }
                }),
                { numRuns: 100 }
            );
        });

        test('deterministic: same seed always yields same room count', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 100000 }),
                    (seed) => {
                        const config = { mapSize: 800, minRoomSize: 40, maxDepth: 5, seed, numKeys: 2 };
                        const gen1 = generateFullDungeon(config);
                        const gen2 = generateFullDungeon(config);
                        return gen1.rooms.length === gen2.rooms.length;
                    }
                ),
                { numRuns: 50 }
            );
        });
    });
});
