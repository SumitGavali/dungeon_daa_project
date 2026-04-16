/**
 * BSP (Binary Space Partitioning) Unit Tests
 * Tests Phase 1: Divide & Conquer spatial partitioning
 */
const { DungeonGenerator, BSPNode, Rectangle } = require('../src/dungeon');

function createGenerator(overrides = {}) {
    const config = {
        mapSize: 800,
        minRoomSize: 40,
        maxDepth: 6,
        seed: 12345,
        ...overrides
    };
    return new DungeonGenerator(config);
}

// Helper: collect all leaf nodes from BSP tree
function getLeafNodes(node) {
    if (!node) return [];
    if (node.isLeaf()) return [node];
    return [...getLeafNodes(node.left), ...getLeafNodes(node.right)];
}

// Helper: count total BSP nodes
function countNodes(node) {
    if (!node) return 0;
    return 1 + countNodes(node.left) + countNodes(node.right);
}

// Helper: get tree depth
function getTreeDepth(node) {
    if (!node) return 0;
    if (node.isLeaf()) return 1;
    return 1 + Math.max(getTreeDepth(node.left), getTreeDepth(node.right));
}

describe('BSP Phase 1: Binary Space Partitioning', () => {

    describe('Basic BSP Tree Structure', () => {
        test('root node covers entire map canvas', () => {
            const gen = createGenerator({ mapSize: 800 });
            gen.generate();

            expect(gen.root).not.toBeNull();
            expect(gen.root.rect.x).toBe(0);
            expect(gen.root.rect.y).toBe(0);
            expect(gen.root.rect.width).toBe(800);
            expect(gen.root.rect.height).toBe(800);
        });

        test('BSP tree is a proper binary tree (every non-leaf has 2 children)', () => {
            const gen = createGenerator();
            gen.generate();

            function checkBinaryProperty(node) {
                if (!node) return true;
                if (node.isLeaf()) return true;
                // Non-leaf must have both children
                expect(node.left).not.toBeNull();
                expect(node.right).not.toBeNull();
                return checkBinaryProperty(node.left) && checkBinaryProperty(node.right);
            }

            checkBinaryProperty(gen.root);
        });

        test('tree depth does not exceed maxDepth + 1', () => {
            const maxDepth = 5;
            const gen = createGenerator({ maxDepth });
            gen.generate();

            const depth = getTreeDepth(gen.root);
            expect(depth).toBeLessThanOrEqual(maxDepth + 1);
        });

        test('generates at least 2 rooms for any valid config', () => {
            const gen = createGenerator({ maxDepth: 3 });
            gen.generate();

            expect(gen.rooms.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Partition Non-Overlap Guarantee', () => {
        test('leaf partitions do not overlap each other', () => {
            const gen = createGenerator();
            gen.generate();

            const leaves = getLeafNodes(gen.root);

            for (let i = 0; i < leaves.length; i++) {
                for (let j = i + 1; j < leaves.length; j++) {
                    const a = leaves[i].rect;
                    const b = leaves[j].rect;

                    // Two rectangles overlap if NOT (one is fully left/right/above/below)
                    const noOverlap =
                        a.x + a.width <= b.x ||
                        b.x + b.width <= a.x ||
                        a.y + a.height <= b.y ||
                        b.y + b.height <= a.y;

                    expect(noOverlap).toBe(true);
                }
            }
        });

        test('rooms are contained within their partition boundaries', () => {
            const gen = createGenerator();
            gen.generate();

            const leaves = getLeafNodes(gen.root);

            for (const leaf of leaves) {
                if (leaf.room) {
                    const r = leaf.room.rect;
                    const p = leaf.rect;

                    expect(r.x).toBeGreaterThanOrEqual(p.x);
                    expect(r.y).toBeGreaterThanOrEqual(p.y);
                    expect(r.x + r.width).toBeLessThanOrEqual(p.x + p.width);
                    expect(r.y + r.height).toBeLessThanOrEqual(p.y + p.height);
                }
            }
        });

        test('generated rooms do not overlap each other', () => {
            const gen = createGenerator();
            gen.generate();

            for (let i = 0; i < gen.rooms.length; i++) {
                for (let j = i + 1; j < gen.rooms.length; j++) {
                    const a = gen.rooms[i].rect;
                    const b = gen.rooms[j].rect;

                    const noOverlap =
                        a.x + a.width <= b.x ||
                        b.x + b.width <= a.x ||
                        a.y + a.height <= b.y ||
                        b.y + b.height <= a.y;

                    expect(noOverlap).toBe(true);
                }
            }
        });
    });

    describe('Split Logic', () => {
        test('partitions cover the entire canvas area (no gaps)', () => {
            const gen = createGenerator({ mapSize: 400 });
            gen.generate();

            const leaves = getLeafNodes(gen.root);
            const totalLeafArea = leaves.reduce(
                (sum, leaf) => sum + leaf.rect.width * leaf.rect.height, 0
            );

            // Total leaf area should equal canvas area
            expect(totalLeafArea).toBe(400 * 400);
        });

        test('split ratios stay within 30%-70% range', () => {
            const gen = createGenerator({ maxDepth: 4 });
            gen.generate();

            function checkSplitRatios(node) {
                if (!node || node.isLeaf()) return;

                const parent = node.rect;

                // Check if split is horizontal or vertical by looking at children
                if (node.left.rect.width === parent.width) {
                    // Horizontal split
                    const ratio = node.left.rect.height / parent.height;
                    expect(ratio).toBeGreaterThanOrEqual(0.25); // small tolerance
                    expect(ratio).toBeLessThanOrEqual(0.75);
                } else {
                    // Vertical split
                    const ratio = node.left.rect.width / parent.width;
                    expect(ratio).toBeGreaterThanOrEqual(0.25);
                    expect(ratio).toBeLessThanOrEqual(0.75);
                }

                checkSplitRatios(node.left);
                checkSplitRatios(node.right);
            }

            checkSplitRatios(gen.root);
        });

        test('recursion terminates when partition is below minimum room size', () => {
            // Very large minRoomSize should produce fewer rooms
            const genSmall = createGenerator({ minRoomSize: 80, maxDepth: 8, seed: 99 });
            genSmall.generate();

            const genLarge = createGenerator({ minRoomSize: 30, maxDepth: 8, seed: 99 });
            genLarge.generate();

            expect(genSmall.rooms.length).toBeLessThan(genLarge.rooms.length);
        });
    });

    describe('Room Properties', () => {
        test('every room has positive width and height', () => {
            const gen = createGenerator();
            gen.generate();

            for (const room of gen.rooms) {
                expect(room.rect.width).toBeGreaterThan(0);
                expect(room.rect.height).toBeGreaterThan(0);
            }
        });

        test('room IDs are sequential starting from 0', () => {
            const gen = createGenerator();
            gen.generate();

            for (let i = 0; i < gen.rooms.length; i++) {
                expect(gen.rooms[i].id).toBe(i);
            }
        });

        test('every leaf node has exactly one room', () => {
            const gen = createGenerator();
            gen.generate();

            const leaves = getLeafNodes(gen.root);
            for (const leaf of leaves) {
                expect(leaf.room).not.toBeNull();
            }
            // Number of rooms equals number of leaves
            expect(gen.rooms.length).toBe(leaves.length);
        });
    });

    describe('Deterministic Seeds', () => {
        test('same seed produces identical room layouts', () => {
            const gen1 = createGenerator({ seed: 42 });
            gen1.generate();

            const gen2 = createGenerator({ seed: 42 });
            gen2.generate();

            expect(gen1.rooms.length).toBe(gen2.rooms.length);

            for (let i = 0; i < gen1.rooms.length; i++) {
                expect(gen1.rooms[i].rect.x).toBe(gen2.rooms[i].rect.x);
                expect(gen1.rooms[i].rect.y).toBe(gen2.rooms[i].rect.y);
                expect(gen1.rooms[i].rect.width).toBe(gen2.rooms[i].rect.width);
                expect(gen1.rooms[i].rect.height).toBe(gen2.rooms[i].rect.height);
            }
        });

        test('different seeds produce different layouts', () => {
            const gen1 = createGenerator({ seed: 1 });
            gen1.generate();

            const gen2 = createGenerator({ seed: 999 });
            gen2.generate();

            // Very unlikely to have identical layouts with different seeds
            const sameLayout = gen1.rooms.length === gen2.rooms.length &&
                gen1.rooms.every((r, i) => r.rect.x === gen2.rooms[i].rect.x);

            expect(sameLayout).toBe(false);
        });
    });
});
