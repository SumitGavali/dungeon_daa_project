<div align="center">
  
# 🏰 Procedural Dungeon Generator

**A High-Performance Algorithmic Experiment in Procedural Generation & Graph Theory**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![JavaScript](https://img.shields.io/badge/Language-JavaScript-F7DF1E?logo=javascript&logoColor=black)](#)
[![Testing: Jest + Fast-Check](https://img.shields.io/badge/Testing-Jest%20%7C%20Fast--Check-C21325?logo=jest&logoColor=white)](#)

[Features](#-features) • [Algorithms](#-core-algorithms) • [Installation](#-getting-started) • [Testing](#-testing-architecture)

</div>

<br>

Welcome to the **Procedural Dungeon Generator**, a technical implementation built to showcase rigorous Design and Analysis of Algorithms (DAA) concepts. The system procedurally generates randomized dungeons using a multi-phase algorithmic pipeline, enforcing gameplay constraints, analyzing graph properties, and presenting real-time visual traversal mechanisms.

---

## ⚡ Core Algorithms 

The generation pipeline relies on four explicit computational phases:

| Phase | Category | Algorithm Employed | Complexity | Purpose |
|:---:|:---:|---|:---:|---|
| **1** | Divide & Conquer | **Binary Space Partitioning (BSP)** | `O(N)` | Recursively splits space to guarantee non-overlapping root structures (leaf nodes). |
| **2** | Greedy Search | **Prim's Algorithm (MST)** | `O(E \log V)` | Uses a Min-Priority Queue to build a Minimum Spanning Tree, ensuring all rooms are connected by exactly `V - 1` corridors. |
| **3** | Constraint Satisfaction | **Backtracking Engine** | `O(K! \times V)` | Solves key-door lock topologies. Enforces constraints by confirming via DFS that a locked door is *strictly unreachable* without finding its key first. |
| **4** | Graph Traversal | **DFS / BFS Validation** | `O(V + E)` | Validates the graph logic post-generation. Runs DFS for cycle detection / reachability, and BFS to map shortest-path depths for game difficulty tracking. |

---

## 🚀 Advanced Features

In addition to core generation, this engine supports advanced real-time graph interactions:

* **Animated Generation Visulization:** Observe the exact step-by-step state changes for BSP subdivision, Prim's edge growth, Backtracking heuristic permutations, and DFS.
* **A\* Pathfinding ($A^*$):** An interactive pathfinding mode utilizing $A^*$ Search with a Manhattan Heuristic. Click any room to immediately visualize the lowest-cost path from the start point.
* **Tarjan's Analysis:** Toggles real-time detection of critical structure failures using Tarjan's Bridge-Finding Algorithm. Visually highlights articulation points (critical rooms) and bridges (critical corridors). Generates sub-graphs through looping corridor logic.

---

## 🛠️ Testing Architecture

Correctness and invariant states are verified rigorously through 64 comprehensive tests split into distinct paradigms.

1. **Unit Testing:** Validates localized structure mechanics (e.g., MinHeap priorities, CSP heuristics).
2. **Property-Based Testing (generative):** Uses `fast-check` to rapidly fire off thousands of random generation seeds spanning wildly different map configurations, strictly verifying properties like:
    - *No MST graph contains disconnected subgraphs.*
    - *Total MST Edge count strictly equals `N - 1`.*
    - *BSP leaves exactly match sum root surface area.*

---

## 💻 Getting Started

You can run the core visualizer entirely locally through your web browser, but to experience the testing environment, minimal Node tooling is required.

### 1. View the Generator 
Simply clone the repository and open `dungeon-generator.html` inside any modern web browser to interact with the canvas. 

```bash
git clone https://github.com/SumitGavali/dungeon_daa_project.git
```

### 2. Run the Test Suites
To run the automated tests, install the dependencies and trigger Jest.

```bash
# 1. CD into directory
cd dungeon_daa_project

# 2. Install dependencies (jest, fast-check)
npm install

# 3. Run all property and unit tests
npm test
```

<div align="center">
  <br>
  <i>Designed for deep algorithmic insights and robust graph constraints.</i>
</div>
