/**
 * @file gameSolver.ts (Ported from gameSolver.py)
 * @description Một bộ giải mê cung sử dụng thuật toán A* để tìm đường đi tối ưu, có xử lý các mục tiêu phụ.
 * Hiện tại hỗ trợ di chuyển cơ bản, nhận diện tường và tìm đến điểm kết thúc.
 * Có thể mở rộng để xử lý các đối tượng tương tác phức tạp hơn (công tắc, cổng dịch chuyển).
 */

// Định nghĩa các kiểu dữ liệu cần thiết cho solver
interface Position {
  x: number;
  y: number;
  z: number;
}

interface GameConfig {
  blocks: { position: Position, modelKey: string }[]; // THÊM: modelKey cho block
  players: { start: Position & { direction?: number } }[]; // THÊM: direction cho người chơi
  finish: Position;
  // THÊM: interactibles và collectibles để solver biết mục tiêu
  collectibles?: { position: Position, id: string, type: string }[];
  interactibles?: { position: Position, id: string, type: string, initialState?: 'on' | 'off' }[];
  solution?: { itemGoals?: Record<string, any> }; // Thêm solution config để biết mục tiêu
}

interface Action {
  type: string; // Mở rộng để chấp nhận các loại action khác như 'maze_repeat'
  [key: string]: any; // Cho phép các thuộc tính khác như direction, times, actions
}

// SỬA LỖI: Mở rộng interface Solution để bao gồm tất cả các trường có thể có
// trong object solution của file JSON, không chỉ rawActions và structuredSolution.
interface Solution {
  type?: string;
  itemGoals?: Record<string, any>;
  optimalBlocks?: number;
  optimalLines?: number;
  rawActions: string[];
  structuredSolution: { main: Action[], procedures?: Record<string, any> };
  // Giữ lại các trường khác có thể tồn tại
  [key: string]: any;
}

// --- START: LOGIC PORTED FROM PYTHON ---

/**
 * Đại diện cho một "bản chụp" của toàn bộ game tại một thời điểm.
 * Tương đương với lớp GameState trong Python.
 */
class GameState {
  position: Position; // Vị trí hiện tại
  direction: number;  // Hướng hiện tại (0: +X, 1: +Z, 2: -X, 3: -Z)
  collectedItems: Set<string>; // Các vật phẩm đã thu thập
  switchStates: Map<string, 'on' | 'off'>; // Trạng thái của các công tắc

  constructor(startPos: Position, startDir: number, world: GameWorld) {
    this.position = { ...startPos };
    this.direction = startDir;
    this.collectedItems = new Set();
    this.switchStates = new Map(Object.entries(world.initialSwitchStates));
  }

  clone(): GameState {
    // SỬA LỖI: Tạo một instance mới và sao chép các thuộc tính một cách thủ công
    // thay vì gọi lại constructor với dữ liệu không chính xác.
    // Điều này đảm bảo rằng trạng thái của `switchStates` và `collectedItems` được giữ lại chính xác.
    const newState = Object.create(Object.getPrototypeOf(this));
    newState.position = { ...this.position };
    newState.direction = this.direction;
    newState.collectedItems = new Set(this.collectedItems);
    newState.switchStates = new Map(this.switchStates);
    return newState;
  }

  getKey(): string {
    const items = Array.from(this.collectedItems).sort().join(',');
    const switches = Array.from(this.switchStates.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:${v}`).join(',');
    return `${this.position.x},${this.position.y},${this.position.z},${this.direction}|i:${items}|s:${switches}`;
  }
}

const directions = [
  { x: 1, z: 0 },  // 0
  { x: 0, z: 1 },  // 1
  { x: -1, z: 0 }, // 2
  { x: 0, z: -1 }, // 3
];

/**
 * Nút chứa trạng thái và các thông tin chi phí cho thuật toán A*.
 * Tương đương lớp PathNode trong Python.
 */
class PathNode {
  state: GameState;
  parent: PathNode | null = null; // Sửa đổi: parent sẽ là một node vị trí, không phải hành động
  action: string | null = null;
  gCost: number = 0; // Chi phí từ điểm bắt đầu đến nút hiện tại
  hCost: number = 0; // Chi phí ước tính từ nút hiện tại đến đích (heuristic)

  constructor(state: GameState) {
    this.state = state;
  }

  // HÀM MỚI: Dùng để lưu trữ chuỗi hành động thô dẫn đến node này
  rawActionsToReach: string[] = [];

  // HÀM MỚI: Lấy key chỉ dựa trên vị trí, bỏ qua hướng và các trạng thái khác
  getPosKey = (): string => `${this.state.position.x},${this.state.position.y},${this.state.position.z}`;

  get fCost(): number {
    return this.gCost + this.hCost;
  }
}

/**
 * Mô hình hóa thế giới game để solver dễ truy vấn.
 * Tương đương lớp GameWorld trong Python.
 */
class GameWorld {
  walkableGrounds: Set<string> = new Set(['wall.brick01', 'wall.brick02', 'wall.brick03', 'wall.brick04', 'wall.brick05', 'wall.brick06', 'ground.checker', 'ground.earth', 'ground.earthChecker', 'ground.mud', 'ground.normal', 'ground.snow', 'stone.stone01', 'stone.stone02', 'stone.stone03', 'stone.stone04', 'stone.stone05', 'stone.stone06', 'stone.stone07', 'ice.ice01']);
  worldMap: Map<string, string> = new Map();
  collectiblesByPos: Map<string, { id: string, type: string }> = new Map();
  collectiblesById: Map<string, { position: Position, type: string }> = new Map();
  switchesByPos: Map<string, { id: string, initialState: 'on' | 'off' }> = new Map();
  initialSwitchStates: Record<string, 'on' | 'off'> = {};
  solutionConfig: { itemGoals?: Record<string, any> };
  finishPos: Position;

  constructor(gameConfig: GameConfig) {
    this.finishPos = gameConfig.finish;
    this.solutionConfig = gameConfig.solution || {};
    // SỬA LỖI: Lưu modelKey của block thay vì chỉ là chuỗi 'block'
    gameConfig.blocks.forEach(b => {
      const posKey = `${b.position.x},${b.position.y},${b.position.z}`;
      this.worldMap.set(posKey, b.modelKey);
    });
    (gameConfig.collectibles || []).forEach(c => {
      const posKey = `${c.position.x},${c.position.y},${c.position.z}`;
      this.collectiblesByPos.set(posKey, { id: c.id, type: c.type });
      this.collectiblesById.set(c.id, { position: c.position, type: c.type });
    });
    (gameConfig.interactibles || []).forEach(i => {
      if (i.type === 'switch') {
        const posKey = `${i.position.x},${i.position.y},${i.position.z}`;
        this.switchesByPos.set(posKey, { id: i.id, initialState: i.initialState || 'off' });
        this.initialSwitchStates[i.id] = i.initialState || 'off';
      }
    });
  }

  /**
   * HÀM MỚI: Kiểm tra xem một vị trí có nền đất đi được (walkable) ở bên dưới không.
   * @param pos Vị trí cần kiểm tra.
   * @returns `true` nếu có nền đi được, ngược lại `false`.
   */
  isWalkable(pos: Position): boolean {
    const groundModel = this.worldMap.get(`${pos.x},${pos.y},${pos.z}`);
    return groundModel !== undefined && this.walkableGrounds.has(groundModel);
  }
}
// --- END: LOGIC PORTED FROM PYTHON ---

/**
 * HÀM MỚI: Chuyển đổi một mảng chuỗi rawActions thành một mảng đối tượng Action
 * để tương thích với hàm createStructuredSolution.
 * @param rawActions Mảng các chuỗi hành động thô.
 * @returns Một mảng các đối tượng Action.
 */
const convertRawToStructuredActions = (rawActions: string[]): Action[] => {
  return rawActions.map(actionString => {
    switch (actionString) {
      case 'moveForward':
        return { type: 'maze_moveForward' };
      case 'turnLeft':
        return { type: 'maze_turn', direction: 'turnLeft' };
      case 'turnRight':
        return { type: 'maze_turn', direction: 'turnRight' };
      case 'collect':
        return { type: 'maze_collect' };
      case 'toggleSwitch':
        // SỬA LỖI: Trả về đúng type 'maze_toggleSwitch' theo cấu trúc chuẩn.
        return { type: 'maze_toggleSwitch' };
      case 'jump':
        return { type: 'maze_jump' };
      default:
        return { type: actionString }; // Fallback cho các action khác
    }
  });
};

/**
 * Tối ưu hóa một chuỗi hành động thô thành một giải pháp có cấu trúc (với vòng lặp).
 * Thuật toán này tìm kiếm các chuỗi hành động lặp lại và nén chúng.
 * @param actions Mảng các hành động thô.
 * @returns Một đối tượng structuredSolution được tối ưu hóa.
 */
const createStructuredSolution = (actions: Action[]): { main: Action[] } => {
  if (actions.length < 2) {
    return { main: actions };
  }

  let bestCompressed = [...actions];

  // Thử nén với các độ dài chuỗi lặp khác nhau (từ dài nhất có thể đến 1)
  for (let len = Math.floor(actions.length / 2); len >= 1; len--) {
    const compressed = [];
    let i = 0;
    while (i < actions.length) {
      const currentSequence = actions.slice(i, i + len);
      
      // Nếu chuỗi hiện tại ngắn hơn độ dài đang xét, không thể lặp lại
      if (currentSequence.length < len) {
        compressed.push(...currentSequence);
        break;
      }

      let repeatCount = 1;
      // Tìm xem chuỗi này lặp lại bao nhiêu lần
      while (i + (repeatCount + 1) * len <= actions.length) {
        const nextSequence = actions.slice(i + repeatCount * len, i + (repeatCount + 1) * len);
        if (JSON.stringify(currentSequence) === JSON.stringify(nextSequence)) {
          repeatCount++;
        } else {
          break;
        }
      }

      if (repeatCount > 1) {
        // Nếu tìm thấy lặp, tạo khối 'maze_repeat'
        // Đệ quy nén các hành động bên trong khối lặp
        const innerSolution = createStructuredSolution(currentSequence);
        compressed.push({
          type: 'maze_repeat',
          times: repeatCount,
          actions: innerSolution.main,
        });
        i += len * repeatCount;
      } else {
        // Nếu không lặp, chỉ thêm hành động đầu tiên và tiếp tục từ hành động tiếp theo
        compressed.push(actions[i]);
        i++;
      }
    }

    // Nếu kết quả nén lần này tốt hơn, lưu lại
    // "Tốt hơn" có thể được định nghĩa là có ít hành động cấp cao nhất hơn
    if (compressed.length < bestCompressed.length) {
      bestCompressed = compressed;
    }
  }

  return { main: bestCompressed };
};

/**
 * HÀM MỚI: Đếm tổng số khối lệnh trong một structuredSolution.
 * Hàm này sẽ đệ quy vào các khối 'maze_repeat' để đếm các khối bên trong.
 * @param actions Mảng các hành động từ structuredSolution.main.
 * @returns Tổng số khối lệnh.
 */
const countBlocksInStructure = (actions: Action[]): number => {
  let count = 0;
  for (const action of actions) {
    count++; // Mỗi action ở cấp hiện tại được tính là 1 khối.
    if (action.type === 'maze_repeat' && Array.isArray(action.actions)) {
      // Nếu là khối lặp, đệ quy để đếm các khối bên trong nó.
      count += countBlocksInStructure(action.actions);
    }
  }
  return count;
};



/**
 * Tìm lời giải cho một cấu hình game mê cung.
 * @param gameConfig Đối tượng cấu hình game.
 * @returns Một đối tượng Solution chứa lời giải, hoặc null nếu không tìm thấy.
 */
export const solveMaze = (gameConfig: GameConfig): Solution | null => {
  return aStarPathSolver(gameConfig);
};

/** TÁI CẤU TRÚC: Thuật toán A* mới, tìm đường đi theo VỊ TRÍ thay vì HÀNH ĐỘNG */
const aStarPathSolver = (gameConfig: GameConfig): Solution | null => {
    if (!gameConfig.players?.[0]?.start || !gameConfig.finish) {
        console.error("Solver: Thiếu điểm bắt đầu hoặc kết thúc.");
        return null;
    }

    const world = new GameWorld(gameConfig);
    const startPos = gameConfig.players[0].start;
    // SỬA LỖI: Lấy chính xác hướng ban đầu từ gameConfig.
    // Nếu không được cung cấp, mặc định là 1 (hướng +Z).
    // Logic cũ đã bỏ qua giá trị này.
    const startDir = gameConfig.players[0].start.direction !== undefined ? gameConfig.players[0].start.direction : 1;

    const startState = new GameState(startPos, startDir, world);
    const startNode = new PathNode(startState);

    const openList: PathNode[] = [];
    const closedList: Map<string, number> = new Map(); // Map<stateKey, gCost>

    const manhattan = (p1: Position, p2: Position): number => {
        return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y) + Math.abs(p1.z - p2.z);
    };

    const heuristic = (state: GameState): number => {
      const currentPos = state.position;
      const requiredGoals = world.solutionConfig.itemGoals || {};
      const remainingGoalPositions: Position[] = [];
  
      // Thêm vị trí các vật phẩm chưa thu thập vào danh sách mục tiêu
      for (const goalType in requiredGoals) {
        if (goalType !== 'switch') {
          const requiredCount = requiredGoals[goalType];
          const collectedCount = Array.from(state.collectedItems).filter(id => world.collectiblesById.get(id)?.type === goalType).length;
          if (collectedCount < requiredCount) {
            world.collectiblesById.forEach((item, id) => {
              if (item.type === goalType && !state.collectedItems.has(id)) {
                remainingGoalPositions.push(item.position);
              }
            });
          }
        }
      }
  
      // Thêm vị trí các công tắc chưa bật vào danh sách mục tiêu
      if (requiredGoals['switch']) {
        world.switchesByPos.forEach((s, posKey) => {
          if (state.switchStates.get(s.id) !== 'on') {
            const [x, y, z] = posKey.split(',').map(Number);
            remainingGoalPositions.push({ x, y, z });
          }
        });
      }
  
      // Nếu không còn mục tiêu phụ, heuristic là khoảng cách đến đích
      if (remainingGoalPositions.length === 0) {
        return manhattan(currentPos, world.finishPos);
      }
  
      // SỬA LỖI: Heuristic đã tính sai. Nó cần phải tính tổng khoảng cách đến
      // mục tiêu phụ xa nhất VÀ từ mục tiêu đó đến đích cuối cùng.
      // Nếu không, nó sẽ đánh giá quá thấp chi phí và đi thẳng đến đích.
      let furthestGoalDist = 0;
      let furthestGoalPos: Position | null = null;
      for (const pos of remainingGoalPositions) {
        const dist = manhattan(currentPos, pos);
        if (dist > furthestGoalDist) {
          furthestGoalDist = dist;
          furthestGoalPos = pos;
        }
      }
      
      return furthestGoalDist + (furthestGoalPos ? manhattan(furthestGoalPos, world.finishPos) : 0);
    };

    const isGoalAchieved = (state: GameState): boolean => {
        const isAtFinish = state.position.x === world.finishPos.x && state.position.y === world.finishPos.y && state.position.z === world.finishPos.z;
        if (!isAtFinish) return false;

        // SỬA LỖI: Logic kiểm tra mục tiêu bị sai. Cần đếm số lượng vật phẩm đã thu thập theo đúng `goalType`.
        const requiredGoals = world.solutionConfig.itemGoals || {};
        for (const goalType in requiredGoals) {
            const requiredCount = requiredGoals[goalType];
            if (goalType === 'switch') {
                // SỬA LỖI: Yêu cầu là TẤT CẢ công tắc phải được bật, không chỉ một số lượng.
                // Lấy tất cả ID công tắc từ bản đồ
                const allSwitchIds = Array.from(world.switchesByPos.values()).map(s => s.id);
                // Kiểm tra xem tất cả chúng có ở trạng thái 'on' không
                const allSwitchesOn = allSwitchIds.every(id => state.switchStates.get(id) === 'on');
                if (!allSwitchesOn) {
                    return false;
                }
            } else {
                // Đếm số vật phẩm đã thu thập thuộc `goalType` này
                const collectedCount = Array.from(state.collectedItems).filter(id => world.collectiblesById.get(id)?.type === goalType).length;

                if (typeof requiredCount === 'string' && requiredCount.toLowerCase() === 'all') {
                    // Nếu yêu cầu là 'all', so sánh với tổng số vật phẩm loại đó có trên bản đồ
                    const totalOfType = Array.from(world.collectiblesById.values()).filter(c => c.type === goalType).length;
                    if (collectedCount < totalOfType) return false;
                } else {
                    // Nếu yêu cầu là một con số cụ thể
                    const numericRequiredCount = Number(requiredCount);
                    // Thêm kiểm tra `!isNaN` để đảm bảo an toàn
                    if (!isNaN(numericRequiredCount) && collectedCount < numericRequiredCount) return false;
                }
            }
        }

        return true;
    };

    startNode.hCost = heuristic(startState);
    openList.push(startNode);

    while (openList.length > 0) {
        openList.sort((a, b) => a.fCost - b.fCost);
        const currentNode = openList.shift()!;
        const stateKey = currentNode.state.getKey();

        if (closedList.has(stateKey) && closedList.get(stateKey)! <= currentNode.gCost) {
            continue;
        }
        closedList.set(stateKey, currentNode.gCost);

        const state = currentNode.state;

        if (isGoalAchieved(state)) {
            const path = currentNode.rawActionsToReach;
            const newStructuredSolution = createStructuredSolution(convertRawToStructuredActions(path));
            const newOptimalBlocks = countBlocksInStructure(newStructuredSolution.main);
            const newOptimalLines = path.length;

            return {
                // SỬA LỖI: Không trả về các trường từ solution cũ nữa.
                // Component cha sẽ chịu trách nhiệm hợp nhất kết quả này.
                // Chỉ trả về những gì solver đã tính toán.
                optimalBlocks: newOptimalBlocks,
                optimalLines: newOptimalLines,
                rawActions: path,
                structuredSolution: newStructuredSolution,
            };
        }

        // --- START: TÁI CẤU TRÚC LOGIC TÌM HÀNG XÓM (Walk, Jump Up, Jump Down) ---
        const neighbors: { pos: Position, action: 'walk' | 'jump' }[] = [];
        const {x, y, z} = state.position;

        // Duyệt qua 4 hướng chính (trước, sau, trái, phải)
        for (const dir of directions) {
            const nextX = x + dir.x;
            const nextZ = z + dir.z;

            // 1. Kiểm tra đi bộ (Walk)
            const walkPos = { x: nextX, y: y, z: nextZ };
            const groundBelowWalkPos = { x: nextX, y: y - 1, z: nextZ };
            if (!world.worldMap.has(`${walkPos.x},${walkPos.y},${walkPos.z}`) && world.isWalkable(groundBelowWalkPos)) {
                neighbors.push({ pos: walkPos, action: 'walk' });
            }

            // 2. Kiểm tra nhảy lên (Jump Up)
            // Điều kiện: có 1 khối ở trước mặt (y) và ô đáp ở trên (y+1) trống
            const jumpUpObstaclePos = { x: nextX, y: y, z: nextZ };
            const jumpUpLandingPos = { x: nextX, y: y + 1, z: nextZ };
            if (world.worldMap.has(`${jumpUpObstaclePos.x},${jumpUpObstaclePos.y},${jumpUpObstaclePos.z}`) && 
                !world.worldMap.has(`${jumpUpLandingPos.x},${jumpUpLandingPos.y},${jumpUpLandingPos.z}`)) {
                neighbors.push({ pos: jumpUpLandingPos, action: 'jump' });
            }

            // 3. Kiểm tra nhảy xuống (Jump Down)
            // Điều kiện: ô ngay phía trước (y) trống và ô đáp ở dưới (y-1) cũng trống
            const jumpDownAirPos = { x: nextX, y: y, z: nextZ };
            const jumpDownLandingPos = { x: nextX, y: y - 1, z: nextZ };
            const groundBelowJumpDown = { x: nextX, y: y - 2, z: nextZ };
            if (!world.worldMap.has(`${jumpDownAirPos.x},${jumpDownAirPos.y},${jumpDownAirPos.z}`) &&
                !world.worldMap.has(`${jumpDownLandingPos.x},${jumpDownLandingPos.y},${jumpDownLandingPos.z}`) &&
                world.isWalkable(groundBelowJumpDown)) {
                neighbors.push({ pos: jumpDownLandingPos, action: 'jump' });
            }
        }
        // --- END: TÁI CẤU TRÚC LOGIC TÌM HÀNG XÓM ---

        for (const neighbor of neighbors) {
            const { pos: neighborPos, action: moveAction } = neighbor;
            const nextState = state.clone();
            nextState.position = neighborPos;
            const neighborPosKey = `${neighborPos.x},${neighborPos.y},${neighborPos.z}`;

            let cost = 0; // Chi phí sẽ được tính dựa trên hành động
            const actionsToReachNeighbor: string[] = [];

            // Tính toán hướng và chi phí xoay người
            const dx = neighborPos.x - state.position.x;
            const dz = neighborPos.z - state.position.z;
            let targetDir: number;
            if (dx === 1) targetDir = 0;
            else if (dz === 1) targetDir = 1;
            else if (dx === -1) targetDir = 2;
            else if (dz === -1) targetDir = 3;
            else targetDir = state.direction; // Fallback, không nên xảy ra với logic hiện tại

            const diff = (targetDir - state.direction + 4) % 4;
            if (diff === 1) { actionsToReachNeighbor.push('turnRight'); cost += 0.1; } 
            else if (diff === 3) { actionsToReachNeighbor.push('turnLeft'); cost += 0.1; } 
            else if (diff === 2) { actionsToReachNeighbor.push('turnRight', 'turnRight'); cost += 0.2; }
            
            nextState.direction = targetDir;

            // Thêm hành động và chi phí cho di chuyển (walk/jump)
            if (moveAction === 'walk') {
                actionsToReachNeighbor.push('moveForward');
                cost += 1.0;
            } else { // jump
                actionsToReachNeighbor.push('jump');
                cost += 1.2; // Nhảy tốn nhiều chi phí hơn một chút
            }

            // Tính chi phí và hành động thu thập/bật công tắc tại ô ĐẾN (chi phí rất nhỏ để ưu tiên)
            const item = world.collectiblesByPos.get(neighborPosKey);
            if (item && !nextState.collectedItems.has(item.id)) {
                nextState.collectedItems.add(item.id);
                cost += 0.01;
                actionsToReachNeighbor.push('collect');
            }

            const switchInfo = world.switchesByPos.get(neighborPosKey);
            if (switchInfo && nextState.switchStates.get(switchInfo.id) !== 'on') {
                nextState.switchStates.set(switchInfo.id, 'on');
                cost += 0.01;
                actionsToReachNeighbor.push('toggleSwitch');
            }

            const newGCost = currentNode.gCost + cost;
            const nextStateKey = nextState.getKey();

            if (closedList.has(nextStateKey) && closedList.get(nextStateKey)! <= newGCost) {
                continue;
            }

            const existingNode = openList.find(n => n.state.getKey() === nextStateKey);
            if (existingNode && existingNode.gCost <= newGCost) {
                continue;
            }

            const nextNode = new PathNode(nextState);
            nextNode.parent = currentNode;
            nextNode.gCost = newGCost;
            nextNode.hCost = heuristic(nextState);
            nextNode.rawActionsToReach = [...currentNode.rawActionsToReach, ...actionsToReachNeighbor];

            if (existingNode) {
                const index = openList.indexOf(existingNode);
                openList[index] = nextNode;
            } else {
                openList.push(nextNode);
            }
        }
    }

    console.error("Solver: Không tìm thấy lời giải.");
    return null;
}