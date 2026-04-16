/**
 * Backtracking & Graph Analysis Unit Tests
 * Tests Phase 3: Key-Door CSP + Phase 4: DFS/BFS verification
 */
const { DungeonGenerator } = require('../src/dungeon');

function createFullDungeon(overrides = {}) {
    const config = {
        mapSize: 800,
        minRoomSize: 40,
        maxDepth: 5,
        seed: 12345,
        ...overrides
    };
    const gen = new DungeonGenerator(config);
    gen.generate();
    gen.buildMST();
    gen.placeKeysAndDoors(overrides.numKeys || 3);
    return gen;
}

describe('Phase 3: Backtracking Key-Door Placement', () => {

    describe('Start Room', () => {
        test('exactly one room is marked as start', () => {
            const gen = createFullDungeon();
            const startRooms = gen.rooms.filter(r => r.isStart);
            expect(startRooms.length).toBe(1);
        });

        test('start room has no key or door', () => {
            const gen = createFullDungeon();
            const startRoom = gen.rooms.find(r => r.isStart);
            expect(startRoom.hasKey).toBeNull();
            expect(startRoom.hasDoor).toBeNull();
        });
    });

    describe('Key-Door Pair Constraints', () => {
        test('each placed key has a matching door with the same color', () => {
            const gen = createFullDungeon({ numKeys: 3 });
            const keys = gen.rooms.filter(r => r.hasKey !== null);
            const doors = gen.rooms.filter(r => r.hasDoor !== null);

            for (const keyRoom of keys) {
                const matchingDoor = doors.find(d => d.hasDoor === keyRoom.hasKey);
                expect(matchingDoor).toBeDefined();
            }
        });

        test('no room has both a key and a door', () => {
            const gen = createFullDungeon({ numKeys: 3 });

            for (const room of gen.rooms) {
                if (room.hasKey !== null) {
                    expect(room.hasDoor).toBeNull();
                }
                if (room.hasDoor !== null) {
                    expect(room.hasKey).toBeNull();
                }
            }
        });

        test('key and door for same color are in different rooms', () => {
            const gen = createFullDungeon({ numKeys: 2 });
            const keys = gen.rooms.filter(r => r.hasKey !== null);
            const doors = gen.rooms.filter(r => r.hasDoor !== null);

            for (const keyRoom of keys) {
                const matchingDoor = doors.find(d => d.hasDoor === keyRoom.hasKey);
                if (matchingDoor) {
                    expect(keyRoom.id).not.toBe(matchingDoor.id);
                }
            }
        });
    });

    describe('Constraint Satisfaction (Key-Before-Door)', () => {
        test('door is NOT reachable from start without passing through key room', () => {
            const gen = createFullDungeon({ numKeys: 3 });
            const startRoom = gen.rooms.find(r => r.isStart);
            const keys = gen.rooms.filter(r => r.hasKey !== null);
            const doors = gen.rooms.filter(r => r.hasDoor !== null);

            for (const doorRoom of doors) {
                const keyRoom = keys.find(k => k.hasKey === doorRoom.hasDoor);
                if (keyRoom) {
                    // canReachWithoutKey should return FALSE for a valid placement
                    const canBypass = gen.canReachWithoutKey(startRoom.id, doorRoom.id, keyRoom.id);
                    expect(canBypass).toBe(false);
                }
            }
        });

        test('constraint holds for multiple key-door pairs', () => {
            for (const numKeys of [1, 2, 3, 4]) {
                const gen = createFullDungeon({ numKeys, seed: 42 });
                const startRoom = gen.rooms.find(r => r.isStart);
                const keys = gen.rooms.filter(r => r.hasKey !== null);
                const doors = gen.rooms.filter(r => r.hasDoor !== null);

                for (const doorRoom of doors) {
                    const keyRoom = keys.find(k => k.hasKey === doorRoom.hasDoor);
                    if (keyRoom) {
                        const canBypass = gen.canReachWithoutKey(startRoom.id, doorRoom.id, keyRoom.id);
                        expect(canBypass).toBe(false);
                    }
                }
            }
        });
    });

    describe('Backtracking Behavior', () => {
        test('placement attempts use backtracking when needed', () => {
            // Test with various seeds — some may require more backtracking
            let totalPlacements = 0;
            for (const seed of [1, 10, 100, 500, 999]) {
                const gen = createFullDungeon({ numKeys: 3, seed });
                const placed = gen.rooms.filter(r => r.hasKey !== null).length;
                totalPlacements += placed;
            }
            // At least some placements should succeed across all seeds
            expect(totalPlacements).toBeGreaterThan(0);
        });

        test('gracefully handles case when not enough rooms for all key-door pairs', () => {
            // Very small dungeon with many keys requested
            const gen = createFullDungeon({ numKeys: 5, maxDepth: 2, seed: 42 });
            // Should not throw — just skips pairs that can't be placed
            expect(() => gen.analyzeGraph()).not.toThrow();
        });
    });
});

describe('Phase 4: Graph Analysis (DFS/BFS)', () => {

    describe('DFS Reachability', () => {
        test('all rooms are reachable from start (full connectivity)', () => {
            const gen = createFullDungeon();
            const analysis = gen.analyzeGraph();
            expect(analysis.reachable).toBe(gen.rooms.length);
        });

        test('reachability holds across different seeds', () => {
            for (const seed of [1, 50, 200, 777, 9999]) {
                const gen = createFullDungeon({ seed });
                const analysis = gen.analyzeGraph();
                expect(analysis.reachable).toBe(gen.rooms.length);
            }
        });
    });

    describe('BFS Shortest Paths', () => {
        test('start room has BFS depth 0', () => {
            const gen = createFullDungeon();
            const startRoom = gen.rooms.find(r => r.isStart);
            const depths = gen.bfs(startRoom.id);
            expect(depths[startRoom.id]).toBe(0);
        });

        test('all depths are non-negative integers', () => {
            const gen = createFullDungeon();
            const startRoom = gen.rooms.find(r => r.isStart);
            const depths = gen.bfs(startRoom.id);

            for (const [id, depth] of Object.entries(depths)) {
                expect(depth).toBeGreaterThanOrEqual(0);
                expect(Number.isInteger(depth)).toBe(true);
            }
        });

        test('BFS covers all rooms', () => {
            const gen = createFullDungeon();
            const startRoom = gen.rooms.find(r => r.isStart);
            const depths = gen.bfs(startRoom.id);
            expect(Object.keys(depths).length).toBe(gen.rooms.length);
        });

        test('maxDepth is greater than 0 for non-trivial dungeons', () => {
            const gen = createFullDungeon();
            const analysis = gen.analyzeGraph();
            expect(analysis.maxDepth).toBeGreaterThan(0);
        });

        test('neighbor depth differs by at most 1 from parent', () => {
            const gen = createFullDungeon();
            const startRoom = gen.rooms.find(r => r.isStart);
            const depths = gen.bfs(startRoom.id);

            for (const [nodeId, nodeDepth] of Object.entries(depths)) {
                const neighbors = gen.graph.get(parseInt(nodeId)) || [];
                for (const neighbor of neighbors) {
                    expect(Math.abs(depths[neighbor] - nodeDepth)).toBeLessThanOrEqual(1);
                }
            }
        });
    });

    describe('Cycle Detection', () => {
        test('MST-only graph has 0 cycles (tree property)', () => {
            const gen = createFullDungeon();
            const analysis = gen.analyzeGraph();
            expect(analysis.cycles).toBe(0);
        });
    });

    describe('Key-Door Validation', () => {
        test('analyzeGraph reports keyDoorValid = true for valid placements', () => {
            const gen = createFullDungeon({ numKeys: 3 });
            const analysis = gen.analyzeGraph();
            expect(analysis.keyDoorValid).toBe(true);
        });

        test('validation passes for all key counts', () => {
            for (const numKeys of [1, 2, 3, 4, 5]) {
                const gen = createFullDungeon({ numKeys, seed: 42 });
                const analysis = gen.analyzeGraph();
                expect(analysis.keyDoorValid).toBe(true);
            }
        });
    });

    describe('Full Pipeline Integration', () => {
        test('complete generation pipeline runs without errors', () => {
            const gen = createFullDungeon();

            expect(gen.rooms.length).toBeGreaterThan(0);
            expect(gen.corridors.length).toBe(gen.rooms.length - 1);

            const analysis = gen.analyzeGraph();
            expect(analysis.reachable).toBe(gen.rooms.length);
            expect(analysis.keyDoorValid).toBe(true);
            expect(analysis.cycles).toBe(0);
        });
    });
});
