import numpy as np
import random
import json
import argparse
from typing import Dict, List, Tuple, Any

# Helper classes and types
Position = Dict[str, int]  # {"x": int, "y": int, "z": int}
Block = Dict[str, Any]     # {"modelKey": str, "position": Position}

# Theme configurations
THEMES = {
    "Winter": {
        "ground": [("ground.snow", 0.8), ("ground.normal", 0.2)],
        "scenery": [("ice.ice01", 0.3), ("water.water01", 0.1), ("stone.stone01", 0.3), ("stone.stone02", 0.3)],
        "obstacles": [("wall.stone01", 0.5), ("stone.stone01", 0.2), ("stone.stone02", 0.2), ("stone.stone03", 0.1)],
        "height_increase": True  # Increase height gradually
    },
    "Lava": {
        "ground": [("ground.mud", 0.5), ("ground.normal", 0.5)],
        "scenery": [("lava.lava01", 0.4), ("stone.stone04", 0.2), ("stone.stone05", 0.2), ("stone.stone06", 0.2)],
        "obstacles": [("wall.brick01", 0.3), ("wall.brick02", 0.3), ("wall.brick03", 0.3), ("stone.stone04", 0.1)],
        "height_increase": False
    },
    "Spring": {
        "ground": [("ground.earth", 0.7), ("ground.earthChecker", 0.3)],
        "scenery": [("water.water01", 0.3), ("stone.stone01", 0.3), ("stone.stone02", 0.4)],
        "obstacles": [("wall.brick04", 0.3), ("wall.brick05", 0.3), ("wall.brick06", 0.3), ("stone.stone01", 0.1)],
        "height_increase": True
    },
    "Mud": {
        "ground": [("ground.mud", 0.8), ("ground.earth", 0.2)],
        "scenery": [("water.water01", 0.4), ("stone.stone05", 0.3), ("stone.stone06", 0.2), ("stone.stone07", 0.1)],
        "obstacles": [("wall.stone01", 0.5), ("stone.stone05", 0.2), ("stone.stone06", 0.2), ("stone.stone07", 0.1)],
        "height_increase": False
    },
    "Space": {
        "ground": [("ground.checker", 0.6), ("ground.normal", 0.4)],
        "scenery": [("ice.ice01", 0.2), ("stone.stone01", 0.2), ("stone.stone02", 0.2), ("stone.stone03", 0.2), ("stone.stone04", 0.1), ("stone.stone05", 0.1)],
        "obstacles": [("wall.brick01", 0.3), ("stone.stone03", 0.2), ("stone.stone04", 0.2), ("stone.stone05", 0.2), ("stone.stone06", 0.1)],
        "height_increase": False  # Random variations
    }
}

def weighted_choice(choices: List[Tuple[str, float]]) -> str:
    """Select a modelKey based on weights."""
    items, weights = zip(*choices)
    return random.choices(items, weights=weights)[0]

def is_valid_pos(pos: Tuple[int, int, int], shape: Tuple[int, int, int]) -> bool:
    """Check if position is within grid bounds."""
    return 0 <= pos[0] < shape[0] and 0 <= pos[1] < shape[1] and 0 <= pos[2] < shape[2]

def get_neighbors(pos: Tuple[int, int, int], shape: Tuple[int, int, int]) -> List[Tuple[int, int, int]]:
    """Get adjacent positions (N/S/E/W, up/down max 1)."""
    deltas = [(1,0,0), (-1,0,0), (0,0,1), (0,0,-1), (0,1,0), (0,-1,0)]
    neighbors = []
    for dx, dy, dz in deltas:
        if abs(dy) <= 1:  # Max height diff 1
            new_pos = (pos[0] + dx, pos[1] + dy, pos[2] + dz)
            if is_valid_pos(new_pos, shape):
                neighbors.append(new_pos)
    return neighbors

def bfs_connected(grid: np.ndarray, start: Tuple[int, int, int], finish: Tuple[int, int, int], portals: List[Tuple[Position, Position]]) -> bool:
    """Check if start and finish are connected via ground blocks, accounting for portals."""
    if grid[start] != "ground":
        return False
    from collections import deque
    visited = set()
    queue = deque([start])
    portal_pairs = {}
    for a, b in portals:
        ga = (a['x'], a['y'] - 1, a['z'])
        gb = (b['x'], b['y'] - 1, b['z'])
        if grid[ga] == "ground" and grid[gb] == "ground":
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
            if grid[neigh] == "ground" and neigh not in visited:
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
def step2_place_start_finish(grid: np.ndarray, theme: str) -> Tuple[Tuple[int, int, int], Tuple[int, int, int]]:
    shape = grid.shape
    min_dist = max(shape[0], shape[2]) // 3
    while True:
        start_x = random.randint(shape[0]//4, shape[0]//2)
        start_z = random.randint(shape[2]//4, shape[2]//2)
        start = (start_x, 1, start_z)  # y=1 default
        
        finish_x = random.randint(0, shape[0]-1)
        finish_z = random.randint(0, shape[2]-1)
        finish_y = 1  # Set to 1 initially; height variation will adjust if needed
        finish = (finish_x, finish_y, finish_z)
        
        dist = abs(start[0] - finish[0]) + abs(start[2] - finish[2])
        if dist >= min_dist and start != finish:
            break
    return start, finish

# Step 3: Generate Main Path
def step3_generate_main_path(grid: np.ndarray, start: Tuple[int, int, int], finish: Tuple[int, int, int], theme: str) -> List[Tuple[int, int, int]]:
    # Simple random walk with bias towards finish
    path = [start]
    current = start
    max_attempts = 1000  # Prevent infinite loop
    attempts = 0
    while current != finish and attempts < max_attempts:
        neighbors = [n for n in get_neighbors(current, grid.shape) if n not in path]
        if not neighbors:
            # Backtrack if stuck
            if len(path) > 1:
                path.pop()
                current = path[-1]
            else:
                raise ValueError("Path generation failed")
            continue
        # Bias towards finish
        neighbors.sort(key=lambda n: abs(n[0]-finish[0]) + abs(n[2]-finish[2]) + abs(n[1]-finish[1])*0.5)
        next_pos = neighbors[0]
        path.append(next_pos)
        current = next_pos
        attempts += 1
    if current != finish:
        raise ValueError("Path generation failed after max attempts")
    # Place ground
    for pos in path:
        grid[pos] = "ground"
    return path

# Step 4: Add Secondary Paths
def step4_add_secondary_paths(grid: np.ndarray, main_path: List[Tuple[int, int, int]], finish: Tuple[int, int, int], num_paths: int, theme: str) -> List[List[Tuple[int, int, int]]]:
    all_paths = [main_path]
    for _ in range(num_paths - 1):
        start_branch = random.choice(main_path[1:-1])  # Branch from main
        branch_path = step3_generate_main_path(np.copy(grid), start_branch, finish, theme)  # Reuse function
        all_paths.append(branch_path)
        for pos in branch_path:
            if grid[pos] == "empty":
                grid[pos] = "ground"
    return all_paths

# Step 5: Add Height Variations
def step5_add_height_variations(grid: np.ndarray, all_paths: List[List[Tuple[int, int, int]]], start: Tuple[int, int, int], theme: str) -> np.ndarray:
    if not THEMES[theme]["height_increase"]:
        return grid
    # To ensure consistent heights, apply to main path first
    main_path = all_paths[0]
    current_y = start[1]
    for i in range(1, len(main_path)):
        if random.random() < 0.2:  # 20% chance to increase y
            new_y = min(current_y + 1, grid.shape[1] - 1)
            old_pos = main_path[i]
            new_pos = (old_pos[0], new_y, old_pos[2])
            if is_valid_pos(new_pos, grid.shape) and grid[new_pos] == "empty":
                grid[new_pos] = grid[old_pos]
                grid[old_pos] = "empty"
                main_path[i] = new_pos
                current_y = new_y
    # For secondary paths, adjust heights to match intersections with main
    for path in all_paths[1:]:
        current_y = grid[path[0]][1] if isinstance(grid[path[0]], str) else path[0][1]  # Get y from branch point
        for i in range(1, len(path)):
            if random.random() < 0.1:  # Lower chance for branches
                new_y = min(current_y + 1, grid.shape[1] - 1)
                old_pos = path[i]
                new_pos = (old_pos[0], new_y, old_pos[2])
                if is_valid_pos(new_pos, grid.shape) and grid[new_pos] == "empty":
                    grid[new_pos] = grid[old_pos]
                    grid[old_pos] = "empty"
                    path[i] = new_pos
                    current_y = new_y
    return grid

# Step 6: Place Portals
def step6_place_portals(grid: np.ndarray, all_paths: List[List[Tuple[int, int, int]]], portals_count: int) -> List[Tuple[Position, Position]]:
    portals = []
    for _ in range(portals_count):
        path = random.choice(all_paths)
        if len(path) < 5:
            continue
        seg_start = random.randint(1, len(path)-4)
        seg_end = seg_start + random.randint(2, min(5, len(path)-seg_start-1))
        portal_a = {"x": path[seg_start][0], "y": path[seg_start][1] + 1, "z": path[seg_start][2]}
        portal_b = {"x": path[seg_end][0], "y": path[seg_end][1] + 1, "z": path[seg_end][2]}
        portals.append((portal_a, portal_b))
        # Remove ground between
        for i in range(seg_start + 1, seg_end):
            grid[path[i]] = "empty"
    return portals

# Step 7: Add Walls and Obstacles
def step7_add_walls_obstacles(grid: np.ndarray, walls_density: float, theme: str) -> np.ndarray:
    shape = grid.shape
    for x in range(shape[0]):
        for y in range(shape[1]):
            for z in range(shape[2]):
                if grid[x,y,z] == "empty" and random.random() < walls_density:
                    # Check if adjacent to path but not blocking
                    neighbors = get_neighbors((x,y,z), shape)
                    if any(grid[n] == "ground" for n in neighbors):
                        model = weighted_choice(THEMES[theme]["obstacles"])
                        grid[x,y,z] = model
                        # Make taller
                        for dy in range(1, random.randint(1,3)):
                            tall_pos = (x, y+dy, z)
                            if is_valid_pos(tall_pos, shape) and grid[tall_pos] == "empty":
                                grid[tall_pos] = model
    return grid

# Step 8: Add Scenery
def step8_add_scenery(grid: np.ndarray, theme: str) -> np.ndarray:
    shape = grid.shape
    for x in range(shape[0]):
        for z in range(shape[2]):
            for y in range(shape[1]):
                if grid[x,y,z] == "empty" and random.random() < 0.3:  # 30% fill
                    if y <= 1:  # Prefer hazards at low y
                        model = weighted_choice(THEMES[theme]["scenery"])
                        grid[x,y,z] = model
    return grid

# Step 9: Diversify Blocks
def step9_diversify_blocks(grid: np.ndarray, theme: str) -> np.ndarray:
    shape = grid.shape
    for x in range(shape[0]):
        for y in range(shape[1]):
            for z in range(shape[2]):
                if grid[x,y,z] == "ground":
                    grid[x,y,z] = weighted_choice(THEMES[theme]["ground"])
    return grid

# Step 10: Place Interactables
def step10_place_interactables(all_paths: List[List[Tuple[int, int, int]]], items_list: List[str]) -> List[Dict[str, Any]]:
    collectibles = []
    item_id = 1
    placed_positions = set()
    for path in all_paths:
        for pos in path[1:-1]:  # Avoid start and finish
            if random.random() < 0.2 and pos not in placed_positions:  # 20% chance
                item_type = random.choice(items_list)
                collectible = {
                    "id": f"c{item_id}",
                    "type": item_type,
                    "position": {"x": pos[0], "y": pos[1] + 1, "z": pos[2]}
                }
                collectibles.append(collectible)
                placed_positions.add(pos)
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
    
    # Add portals as misc blocks
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

# Main function to chain all steps
def generate_maze_config(max_x: int = 9, max_y: int = 5, max_z: int = 9, theme: str = "Winter", num_paths: int = 1, 
                         items_list: List[str] = ["crystal"], portals_count: int = 0, walls_density: float = 0.2, seed: int = 42) -> str:
    random.seed(seed)
    np.random.seed(seed)
    
    # Step 1
    grid = step1_initialize_grid(max_x, max_y, max_z)
    
    # Step 2
    start, finish = step2_place_start_finish(grid, theme)
    
    # Step 3
    main_path = step3_generate_main_path(grid, start, finish, theme)
    
    # Step 4
    all_paths = step4_add_secondary_paths(grid, main_path, finish, num_paths, theme)
    
    # Step 5
    grid = step5_add_height_variations(grid, all_paths, start, theme)
    
    # Update finish to the main path's final position
    finish = all_paths[0][-1]
    
    # Check if all paths end at the same finish (for multi-path consistency)
    for p in all_paths:
        if p[-1] != finish:
            raise ValueError("Finish positions differ across paths after height variation")
    
    # Step 6
    portals = step6_place_portals(grid, all_paths, portals_count)
    
    # Step 7
    grid = step7_add_walls_obstacles(grid, walls_density, theme)
    
    # Check connectivity
    if not bfs_connected(grid, start, finish, portals):
        raise ValueError("Map not connected after obstacles")
    
    # Step 8
    grid = step8_add_scenery(grid, theme)
    
    # Step 9
    grid = step9_diversify_blocks(grid, theme)
    
    # Step 10
    collectibles = step10_place_interactables(all_paths, items_list)
    
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
    parser.add_argument("--theme", type=str, default="Winter", choices=list(THEMES.keys()))
    parser.add_argument("--num_paths", type=int, default=1)
    parser.add_argument("--items", type=str, default="crystal", help="Comma-separated items e.g. crystal,key")
    parser.add_argument("--portals", type=int, default=1)
    parser.add_argument("--walls_density", type=float, default=0.0)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--output", type=str, default="game_config.json")
    
    args = parser.parse_args()
    items_list = args.items.split(",")
    
    config = generate_maze_config(args.max_x, args.max_y, args.max_z, args.theme, args.num_paths, items_list, args.portals, args.walls_density, args.seed)
    
    with open(args.output, "w") as f:
        f.write(config)
    print(f"Generated config saved to {args.output}")
