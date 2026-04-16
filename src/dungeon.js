// ============================================================================
// SEEDED RANDOM NUMBER GENERATOR
// ============================================================================
class SeededRandom {
    constructor(seed) {
        this.seed = seed || Math.floor(Math.random() * 1000000);
        this.state = this.seed;
    }

    next() {
        // Linear congruential generator
        this.state = (this.state * 1664525 + 1013904223) % 4294967296;
        return this.state / 4294967296;
    }

    range(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    choice(arr) {
        return arr[Math.floor(this.next() * arr.length)];
    }
}

// ============================================================================
// DATA STRUCTURES
// ============================================================================
class Rectangle {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    get centerX() { return this.x + this.width / 2; }
    get centerY() { return this.y + this.height / 2; }
}

class BSPNode {
    constructor(rect) {
        this.rect = rect;
        this.left = null;
        this.right = null;
        this.room = null;
    }

    isLeaf() {
        return this.left === null && this.right === null;
    }
}

class Room {
    constructor(id, rect) {
        this.id = id;
        this.rect = rect;
        this.hasKey = null;  // null or key color
        this.hasDoor = null; // null or door color
        this.isStart = false;
    }
}

class MinHeap {
    constructor() {
        this.heap = [];
    }

    push(item) {
        this.heap.push(item);
        this.bubbleUp(this.heap.length - 1);
    }

    pop() {
        if (this.heap.length === 0) return null;
        if (this.heap.length === 1) return this.heap.pop();

        const min = this.heap[0];
        this.heap[0] = this.heap.pop();
        this.bubbleDown(0);
        return min;
    }

    bubbleUp(idx) {
        while (idx > 0) {
            const parentIdx = Math.floor((idx - 1) / 2);
            if (this.heap[idx].distance >= this.heap[parentIdx].distance) break;
            [this.heap[idx], this.heap[parentIdx]] = [this.heap[parentIdx], this.heap[idx]];
            idx = parentIdx;
        }
    }

    bubbleDown(idx) {
        while (true) {
            let minIdx = idx;
            const leftIdx = 2 * idx + 1;
            const rightIdx = 2 * idx + 2;

            if (leftIdx < this.heap.length && this.heap[leftIdx].distance < this.heap[minIdx].distance) {
                minIdx = leftIdx;
            }
            if (rightIdx < this.heap.length && this.heap[rightIdx].distance < this.heap[minIdx].distance) {
                minIdx = rightIdx;
            }

            if (minIdx === idx) break;
            [this.heap[idx], this.heap[minIdx]] = [this.heap[minIdx], this.heap[idx]];
            idx = minIdx;
        }
    }

    isEmpty() {
        return this.heap.length === 0;
    }

    size() {
        return this.heap.length;
    }
}

// ============================================================================
// DUNGEON GENERATOR CLASS
// ============================================================================
class DungeonGenerator {
    constructor(config) {
        this.config = config;
        this.rng = new SeededRandom(config.seed);
        this.root = null;
        this.rooms = [];
        this.corridors = [];
        this.graph = new Map(); // adjacency list
    }

    // ========================================================================
    // PHASE 1: BINARY SPACE PARTITIONING
    // ========================================================================
    generate() {
        const rect = new Rectangle(0, 0, this.config.mapSize, this.config.mapSize);
        this.root = new BSPNode(rect);
        this.splitNode(this.root, 0);
        this.createRooms(this.root);
    }

    splitNode(node, depth) {
        if (depth >= this.config.maxDepth) return;

        const { width, height } = node.rect;
        const minSize = this.config.minRoomSize * 2;

        // Can't split if too small
        if (width < minSize && height < minSize) return;

        // Decide split direction
        let splitHorizontally;
        if (width > height && width >= minSize) {
            splitHorizontally = false;
        } else if (height > width && height >= minSize) {
            splitHorizontally = true;
        } else if (width >= minSize && height >= minSize) {
            splitHorizontally = this.rng.next() > 0.5;
        } else {
            return; // Can't split
        }

        // Calculate split position
        if (splitHorizontally) {
            const splitMin = Math.floor(height * 0.3);
            const splitMax = Math.floor(height * 0.7);
            if (splitMax <= splitMin) return;

            const splitPos = this.rng.range(splitMin, splitMax);

            node.left = new BSPNode(
                new Rectangle(node.rect.x, node.rect.y, width, splitPos)
            );
            node.right = new BSPNode(
                new Rectangle(node.rect.x, node.rect.y + splitPos, width, height - splitPos)
            );
        } else {
            const splitMin = Math.floor(width * 0.3);
            const splitMax = Math.floor(width * 0.7);
            if (splitMax <= splitMin) return;

            const splitPos = this.rng.range(splitMin, splitMax);

            node.left = new BSPNode(
                new Rectangle(node.rect.x, node.rect.y, splitPos, height)
            );
            node.right = new BSPNode(
                new Rectangle(node.rect.x + splitPos, node.rect.y, width - splitPos, height)
            );
        }

        // Recursively split children
        this.splitNode(node.left, depth + 1);
        this.splitNode(node.right, depth + 1);
    }

    createRooms(node) {
        if (node.isLeaf()) {
            // Create a room with random insets, clamped to ensure positive dimensions
            const maxInsetX = Math.max(1, Math.floor(node.rect.width * 0.2));
            const maxInsetY = Math.max(1, Math.floor(node.rect.height * 0.2));

            const insetX = this.rng.range(5, Math.max(5, maxInsetX));
            const insetY = this.rng.range(5, Math.max(5, maxInsetY));
            const insetW = this.rng.range(5, Math.max(5, maxInsetX));
            const insetH = this.rng.range(5, Math.max(5, maxInsetY));

            const roomWidth = Math.max(10, node.rect.width - insetX - insetW);
            const roomHeight = Math.max(10, node.rect.height - insetY - insetH);

            const roomRect = new Rectangle(
                node.rect.x + insetX,
                node.rect.y + insetY,
                roomWidth,
                roomHeight
            );

            const room = new Room(this.rooms.length, roomRect);
            node.room = room;
            this.rooms.push(room);
        } else {
            if (node.left) this.createRooms(node.left);
            if (node.right) this.createRooms(node.right);
        }
    }

    // ========================================================================
    // PHASE 2: PRIM'S MINIMUM SPANNING TREE
    // ========================================================================
    buildMST() {
        if (this.rooms.length === 0) return;

        const visited = new Set();
        const heap = new MinHeap();

        // Start from random room
        const startRoom = this.rng.choice(this.rooms);
        visited.add(startRoom.id);

        // Add all edges from start room
        for (const room of this.rooms) {
            if (room.id !== startRoom.id) {
                const distance = this.euclideanDistance(startRoom, room);
                heap.push({ from: startRoom, to: room, distance });
            }
        }

        // Build MST
        while (!heap.isEmpty() && visited.size < this.rooms.length) {
            const edge = heap.pop();

            if (visited.has(edge.to.id)) continue;

            // Add edge to MST
            this.corridors.push({ from: edge.from, to: edge.to });
            visited.add(edge.to.id);

            // Update graph adjacency list
            if (!this.graph.has(edge.from.id)) this.graph.set(edge.from.id, []);
            if (!this.graph.has(edge.to.id)) this.graph.set(edge.to.id, []);
            this.graph.get(edge.from.id).push(edge.to.id);
            this.graph.get(edge.to.id).push(edge.from.id);

            // Add edges from newly visited room
            for (const room of this.rooms) {
                if (!visited.has(room.id)) {
                    const distance = this.euclideanDistance(edge.to, room);
                    heap.push({ from: edge.to, to: room, distance });
                }
            }
        }
    }

    euclideanDistance(room1, room2) {
        const dx = room1.rect.centerX - room2.rect.centerX;
        const dy = room1.rect.centerY - room2.rect.centerY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // ========================================================================
    // PHASE 3: BACKTRACKING FOR KEY-DOOR PLACEMENT
    // ========================================================================
    placeKeysAndDoors(numKeys) {
        // Place start position in a random room
        const startRoom = this.rng.choice(this.rooms);
        startRoom.isStart = true;

        const colors = ['#ffcc00', '#ff00ff', '#00ffff', '#ff6600', '#00ff00'];
        const keyColors = colors.slice(0, numKeys);

        // Try to place each key-door pair
        for (let i = 0; i < numKeys; i++) {
            const color = keyColors[i];
            const placed = this.backtrackPlace(startRoom.id, color, new Set());
            if (!placed) {
                console.warn(`Could not place key-door pair ${i}`);
            }
        }
    }

    backtrackPlace(startId, color, attempted) {
        // Get available rooms (not start, no items yet)
        const availableRooms = this.rooms.filter(r =>
            !r.isStart && r.hasKey === null && r.hasDoor === null && !attempted.has(r.id)
        );

        if (availableRooms.length < 2) return false;

        // Shuffle available rooms
        const shuffled = [...availableRooms].sort(() => this.rng.next() - 0.5);

        // Try each room for key
        for (const keyRoom of shuffled) {
            keyRoom.hasKey = color;

            // Try each remaining room for door
            for (const doorRoom of shuffled) {
                if (doorRoom.id === keyRoom.id) continue;

                doorRoom.hasDoor = color;

                // Check constraint: can we reach door from start without passing through key room?
                if (!this.canReachWithoutKey(startId, doorRoom.id, keyRoom.id)) {
                    // Valid placement!
                    return true;
                }

                doorRoom.hasDoor = null;
            }

            keyRoom.hasKey = null;
            attempted.add(keyRoom.id);
        }

        return false;
    }

    canReachWithoutKey(startId, doorId, keyId) {
        // DFS to check if door is reachable without going through key room
        const visited = new Set();
        const stack = [startId];

        while (stack.length > 0) {
            const current = stack.pop();

            if (current === doorId) return true; // Bad: reached door without key
            if (current === keyId) continue; // Don't pass through key room
            if (visited.has(current)) continue;

            visited.add(current);

            const neighbors = this.graph.get(current) || [];
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    stack.push(neighbor);
                }
            }
        }

        return false; // Good: can't reach door without key
    }

    // ========================================================================
    // PHASE 4: GRAPH ANALYSIS (DFS/BFS)
    // ========================================================================
    analyzeGraph() {
        const result = { reachable: 0, maxDepth: 0, cycles: 0, keyDoorValid: true };
        if (this.rooms.length === 0) return result;

        // DFS to check reachability
        const startRoom = this.rooms.find(r => r.isStart);
        if (!startRoom) return result;

        const visited = new Set();
        this.dfs(startRoom.id, visited);
        result.reachable = visited.size;

        // Cycle detection via DFS with parent tracking
        result.cycles = this.detectCycles();

        // BFS to compute depths (for difficulty tuning)
        const depths = this.bfs(startRoom.id);
        result.maxDepth = Math.max(...Object.values(depths));

        // Validate all key-door orderings across every traversal path
        result.keyDoorValid = this.validateKeyDoorOrdering(startRoom.id);

        return result;
    }

    // Cycle detection: in an undirected graph, a cycle exists
    // if DFS encounters a visited node that isn't the parent
    detectCycles() {
        const visited = new Set();
        let cycleCount = 0;

        for (const room of this.rooms) {
            if (!visited.has(room.id)) {
                cycleCount += this.dfsCycleDetect(room.id, -1, visited);
            }
        }
        return cycleCount;
    }

    dfsCycleDetect(nodeId, parentId, visited) {
        visited.add(nodeId);
        let cycles = 0;
        const neighbors = this.graph.get(nodeId) || [];

        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                cycles += this.dfsCycleDetect(neighbor, nodeId, visited);
            } else if (neighbor !== parentId) {
                // Found a back-edge → cycle
                cycles++;
            }
        }
        return cycles;
    }

    // Validate that for every key-door pair, the key room is
    // encountered before the door room on ALL paths from start
    validateKeyDoorOrdering(startId) {
        const keyRooms = this.rooms.filter(r => r.hasKey !== null);
        const doorRooms = this.rooms.filter(r => r.hasDoor !== null);

        for (const doorRoom of doorRooms) {
            // Find the matching key room by color
            const keyRoom = keyRooms.find(k => k.hasKey === doorRoom.hasDoor);
            if (!keyRoom) return false; // Door with no matching key

            // Check: is it possible to reach the door WITHOUT
            // passing through the key room? If yes → invalid
            if (this.canReachWithoutKey(startId, doorRoom.id, keyRoom.id)) {
                return false;
            }
        }
        return true;
    }

    dfs(roomId, visited) {
        visited.add(roomId);
        const neighbors = this.graph.get(roomId) || [];
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                this.dfs(neighbor, visited);
            }
        }
    }

    bfs(startId) {
        const depths = {};
        const queue = [{ id: startId, depth: 0 }];
        const visited = new Set([startId]);

        while (queue.length > 0) {
            const { id, depth } = queue.shift();
            depths[id] = depth;

            const neighbors = this.graph.get(id) || [];
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push({ id: neighbor, depth: depth + 1 });
                }
            }
        }

        return depths;
    }
}

module.exports = {
    SeededRandom,
    Rectangle,
    BSPNode,
    Room,
    MinHeap,
    DungeonGenerator
};
