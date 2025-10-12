import numpy as np
import random
import json
import argparse
from typing import Dict, List, Tuple, Any

# Helper classes and types
Position = Dict[str, int]  # {"x": int, "y": int, "z": int}
Block = Dict[str, Any]     # {"modelKey": str, "position": Position}

def is_valid_pos(pos: Tuple[int, int, int], shape: Tuple[int, int, int]) -> bool:
    """Check if position is within grid bounds."""
    return 0 <= pos[0] < shape[0] and 0 <= pos[1] < shape[1] and 0 <= pos[2] < shape[2]

def get_neighbors(pos: Tuple[int, int, int], shape: Tuple[int, int, int]) -> List[Tuple[int, int, int]]:
    """Get adjacent positions (N/S/E/W, up/down max 1)."""
    deltas = [(1,0,0), (-1,0,0), (0,0,1), (0,0,-1)]
    neighbors = []
    for dx, dy, dz in deltas:
        new_pos = (pos[0] + dx, pos[1] + dy, pos[2] + dz)
        if abs(dy) <= 1 and is_valid_pos(new_pos, shape):
            neighbors.append(new_pos)
    return neighbors

def bfs_connected(grid: np.ndarray, start: Tuple[int, int, int], finish: Tuple[int, int, int], portals: List[Tuple[Position, Position]], ground_type: str) -> bool:
    """Check if start and finish are connected via ground blocks, accounting for portals."""
    from collections import deque
    visited = set()
    queue = deque([start])
    portal_pairs = {}
    for a, b in portals:
        ga = (a['x'], a['y'] - 1, a['z']) if is_valid_pos((a['x'], a['y'] - 1, a['z']), grid.shape) and grid[a['x'], a['y'] - 1, a['z']] == ground_type else None
        gb = (b['x'], b['y'] - 1, b['z']) if is_valid_pos((b['x'], b['y'] - 1, b['z']), grid.shape) and grid[b['x'], b['y'] - 1, b['z']] == ground_type else None
        if ga and gb:
            portal_pairs[ga] = gb
            portal_pairs[gb] = ga
    while queue:
        pos = queue.popleft()
        if pos == finish:
            return True
        if pos in visited:
            continue
        visited.add(pos)
        for neigh in get_neighbors(pos, grid.shape):
            if grid[neigh] == ground_type and neigh not in visited:
                queue.append(neigh)
        if pos in portal_pairs:
            tele = portal_pairs[pos]
            if tele not in visited:
                queue.append(tele)
    return False

# Step 1: Initialize Grid
def step1_initialize_grid(max_x: int, max_y: int, max_z: int) -> np.ndarray:
    shape = (max_x + 1, max_y + 1, max_z + 1)
    grid = np.full(shape, "empty", dtype=object)
    return grid

# Step 2: Place Start and Finish
def step2_place_start_finish(grid: np.ndarray) -> Tuple[Tuple[int, int, int], Tuple[int, int, int]]:
    shape = grid.shape
    min_dist = max(shape[0], shape[2]) // 3
    while True:
        start_x = random.randint(1, shape[0]//2)
        start_z = random.randint(1, shape[2]//2)
        start = (start_x, 1, start_z)  
        
        finish_x = random.randint(shape[0]//2, shape[0]-1)
        finish_z = random.randint(shape[2]//2, shape[2]-1)
        finish = (finish_x, 1, finish_z)  
        
        dist = abs(start[0] - finish[0]) + abs(start[2] - finish[2])
        if dist >= min_dist and start != finish:
            break
    return start, finish

# Step 3: Generate Main Path (single path only)
def step3_generate_main_path(grid: np.ndarray, start: Tuple[int, int, int], finish: Tuple[int, int, int], ground_type: str) -> List[Tuple[int, int, int]]:
    # Use A* for reliable path
    from heapq import heappush, heappop
    def heuristic(a, b):
        return abs(a[0] - b[0]) + abs(a[1] - b[1]) + abs(a[2] - b[2])
    
    open_set = []
    heappush(open_set, (0, start))
    came_from = {}
    g_score = {start: 0}
    f_score = {start: heuristic(start, finish)}
    
    while open_set:
        _, current = heappop(open_set)
        if current == finish:
            # Reconstruct path
            path = []
            while current in came_from:
                path.append(current)
                current = came_from[current]
            path.append(start)
            path.reverse()
            # Place ground
            for pos in path:
                grid[pos] = ground_type
            return path
        for neighbor in get_neighbors(current, grid.shape):
            tentative_g = g_score[current] + 1
            if tentative_g < g_score.get(neighbor, float('inf')):
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g
                f_score[neighbor] = tentative_g + heuristic(neighbor, finish)
                if neighbor not in [item[1] for item in open_set]:
                    heappush(open_set, (f_score[neighbor], neighbor))
    raise ValueError("No path found from start to finish")

# Step 5: Add Height Variations
def step5_add_height_variations(grid: np.ndarray, path: List[Tuple[int, int, int]], ground_type: str) -> np.ndarray:
    current_y = path[0][1]
    for i in range(1, len(path)):
        if random.random() < 0.15:  # Lower chance to increase y for simplicity
            new_y = min(current_y + 1, grid.shape[1] - 1)
            old_pos = path[i]
            new_pos = (old_pos[0], new_y, old_pos[2])
            if is_valid_pos(new_pos, grid.shape) and grid[new_pos] == "empty":
                grid[new_pos] = grid[old_pos]
                grid[old_pos] = "empty"
                path[i] = new_pos
                current_y = new_y
    return grid

# Step 6: Place Portals (1-2 pairs optional)
def step6_place_portals(grid: np.ndarray, path: List[Tuple[int, int, int]], portals_count: int) -> List[Tuple[Position, Position]]:
    portals = []
    max_portals = min(2, portals_count)  # Max 2
    for _ in range(max_portals):
        if len(path) < 5:
            break
        seg_start = random.randint(1, len(path)-4)
        seg_end = seg_start + random.randint(2, min(4, len(path)-seg_start-1))
        portal_a = {"x": path[seg_start][0], "y": path[seg_start][1] + 1, "z": path[seg_start][2]}
        portal_b = {"x": path[seg_end][0], "y": path[seg_end][1] + 1, "z": path[seg_end][2]}
        portals.append((portal_a, portal_b))
        # Remove ground between
        for i in range(seg_start + 1, seg_end):
            grid[path[i]] = "empty"
            # To keep path connected via portal, we rely on bfs with portals
    return portals

# Step 10: Place Interactables (crystal or switch)
def step10_place_interactables(path: List[Tuple[int, int, int]], items_list: List[str]) -> List[Dict[str, Any]]:
    collectibles = []
    item_id = 1
    for pos in path[1:-1]:  # Avoid start/finish
        if random.random() < 0.15:  # Lower chance for simplicity
            item_type = random.choice(items_list)
            collectible = {
                "id": f"c{item_id}",
                "type": item_type,
                "position": {"x": pos[0], "y": pos[1] + 1, "z": pos[2]}
            }
            collectibles.append(collectible)
            item_id += 1
    return collectibles

# Step 11: Finalize Players and Finish
def step11_finalize_players_finish(start: Tuple[int, int, int], finish: Tuple[int, int, int]) -> Tuple[List[Dict[str, Any]], Position]:
    players = [{
        "id": "player1",
        "start": {"x": start[0], "y": start[1], "z": start[2], "direction": random.randint(0, 3)}
    }]
    finish_pos = {"x": finish[0], "y": finish[1], "z": finish[2]}
    return players, finish_pos

# Step 12: Output Config
def step12_output_config(grid: np.ndarray, players: List[Dict[str, Any]], collectibles: List[Dict[str, Any]], finish: Position, portals: List[Tuple[Position, Position]]) -> str:
    blocks = []
    shape = grid.shape
    for x in range(shape[0]):
        for y in range(shape[1]):
            for z in range(shape[2]):
                model = grid[x,y,z]
                if model != "empty":
                    blocks.append({"modelKey": model, "position": {"x": x, "y": y, "z": z}})
    
    # Add portals
    for a, b in portals:
        blocks.append({"modelKey": "misc.portal", "position": a})
        blocks.append({"modelKey": "misc.portal", "position": b})
    
    game_config = {
        "gameConfig": {
            "type": "maze",
            "renderer": "3d",
            "blocks": blocks,
            "players": players,
            "collectibles": collectibles,
            "finish": finish
        }
    }
    return json.dumps(game_config, indent=2)

# Main function (simplified: single path, 1-2 portals max)
def generate_maze_config(max_x: int = 9, max_y: int = 5, max_z: int = 9, ground_type: str = "ground.normal", 
                         items_list: List[str] = ["crystal", "switch"], portals_count: int = 1, seed: int = 42) -> str:
    random.seed(seed)
    np.random.seed(seed)
    
    # Step 1
    grid = step1_initialize_grid(max_x, max_y, max_z)
    
    # Step 2
    start, finish = step2_place_start_finish(grid)
    
    # Step 3
    main_path = step3_generate_main_path(grid, start, finish, ground_type)
    
    # Step 5
    grid = step5_add_height_variations(grid, main_path, ground_type)
    
    finish = main_path[-1]  # Update finish after height
    
    # Step 6
    portals = step6_place_portals(grid, main_path, portals_count)
    
    # Check connectivity
    if not bfs_connected(grid, start, finish, portals, ground_type):
        raise ValueError("Map not connected")
    
    # Step 10
    collectibles = step10_place_interactables(main_path, items_list)
    
    # Step 11
    players, finish_pos = step11_finalize_players_finish(start, finish)
    
    # Step 12
    json_output = step12_output_config(grid, players, collectibles, finish_pos, portals)
    
    return json_output

# Command line interface
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate Maze Game Config")
    parser.add_argument("--max_x", type=int, default=9)
    parser.add_argument("--max_y", type=int, default=5)
    parser.add_argument("--max_z", type=int, default=9)
    parser.add_argument("--ground_type", type=str, default="ground.normal")
    parser.add_argument("--items", type=str, default="crystal,switch", help="Comma-separated items e.g. crystal,switch")
    parser.add_argument("--portals", type=int, default=1)
    parser.add_argument("--seed", type=int, default=13)
    parser.add_argument("--output", type=str, default="game_config.json")
    
    args = parser.parse_args()
    items_list = args.items.split(",")
    
    config = generate_maze_config(args.max_x, args.max_y, args.max_z, args.ground_type, items_list, args.portals, args.seed)
    
    with open(args.output, "w") as f:
        f.write(config)
    print(f"Generated config saved to {args.output}")