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
  collectibles?: { position: Position; id: string; type: string }[];
  interactibles?: { position: Position; id: string; type: string; initialState?: 'on' | 'off' }[];
  // ĐÃ XÓA: solution không còn là một phần của GameConfig
}

interface Action {
  type: string; // Mở rộng để chấp nhận các loại action khác như 'maze_repeat'
  [key: string]: any; // Cho phép các thuộc tính khác như direction, times, actions
}

// THÊM: Định nghĩa cấu trúc cho Blockly Toolbox để dễ dàng xử lý
interface BlocklyToolbox {
  kind: 'categoryToolbox';
  contents: ({ kind: string; type?: string; custom?: string; contents?: any[] })[];
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

interface QuestBlocklyConfig {
  toolbox?: BlocklyToolbox | any; // SỬA LỖI: `toolbox` là tùy chọn để tương thích với augmented config
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

// SỬA LỖI: Hoán đổi hướng Tới (+Z) và Lùi (-Z) để khớp với thực tế game.
// Quy ước đã sửa (theo chiều kim đồng hồ):
// 0: -Z (Lùi / Backward)
// 1: +X (Phải / Right)
// 2: +Z (Tới / Forward)
// 3: -X (Trái / Left)
const directions = [
  { x: 0, z: -1 }, // 0: -Z
  { x: 1, z: 0 },  // 1: +X
  { x: 0, z: 1 },  // 2: +Z
  { x: -1, z: 0 }, // 3: -X
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
  initialSwitchStates: Record<string, 'on' | 'off'> = {}; // THÊM: Lưu trạng thái ban đầu của công tắc
  solutionConfig: Solution; // THAY ĐỔI: solutionConfig giờ là kiểu Solution
  finishPos: Position;

  constructor(gameConfig: GameConfig, solutionConfig: Solution) { // THAY ĐỔI: Nhận solutionConfig
    this.finishPos = gameConfig.finish;
    this.solutionConfig = solutionConfig; // THAY ĐỔI: Gán solutionConfig trực tiếp
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
 * HÀM NÂNG CẤP: Tối ưu hóa một chuỗi hành động thô thành một giải pháp có cấu trúc,
 * dựa trên các khối lệnh có sẵn trong toolbox.
 * @param actions Mảng các hành động thô.
 * @param blocklyConfig Cấu hình toolbox của thử thách.
 * @returns Một đối tượng structuredSolution được tối ưu hóa.
 */
const createStructuredSolution = (
  initialActions: Action[],
  availableBlocks: Set<string> // THAY ĐỔI: Chỉ cần truyền vào các khối lệnh có sẵn
): { main: Action[]; procedures?: Record<string, Action[]> } => {

  let currentActions = [...initialActions];
  const procedures: Record<string, Action[]> = {};
  let procedureCount = 0;

  // --- BƯỚC 2: TỐI ƯU HÓA VÒNG LẶP (LOOP COMPRESSION) ---
  // THAY ĐỔI: Sử dụng trực tiếp `availableBlocks` được truyền vào
  if (availableBlocks.has('maze_repeat') || availableBlocks.has('maze_for')) {
    let changed = true;
    while (changed) {
      changed = false;
      let bestCompression = { benefit: 0, index: -1, length: 0, count: 0 };

      for (let len = Math.floor(currentActions.length / 2); len > 0; len--) {
        for (let i = 0; i <= currentActions.length - 2 * len; i++) {
          const pattern = currentActions.slice(i, i + len);
          let repeatCount = 1;
          while (i + (repeatCount + 1) * len <= currentActions.length) {
            const nextSegment = currentActions.slice(i + repeatCount * len, i + (repeatCount + 1) * len);
            if (JSON.stringify(pattern) === JSON.stringify(nextSegment)) {
              repeatCount++;
            } else {
              break;
            }
          }

          if (repeatCount > 1) {
            const blocksUsed = len * repeatCount;
            const blocksAfter = 1 + len; // 1 khối repeat + các khối bên trong
            const benefit = blocksUsed - blocksAfter;
            if (benefit > bestCompression.benefit) {
              bestCompression = { benefit, index: i, length: len, count: repeatCount };
            }
          }
        }
      }

      if (bestCompression.benefit > 0) {
        const { index, length, count } = bestCompression;
        const pattern = currentActions.slice(index, index + length);
        // Ưu tiên sử dụng 'maze_for' nếu có, nếu không thì dùng 'maze_repeat'
        const loopType = availableBlocks.has('maze_for') ? 'maze_for' : 'maze_repeat';
        const repeatBlock: Action = { type: loopType, times: count, actions: pattern };
        currentActions.splice(index, length * count, repeatBlock);
        changed = true;
      }
    }
  }

  // --- BƯỚC 3: TỐI ƯU HÓA BẰNG HÀM (FUNCTION EXTRACTION) ---
  // THAY ĐỔI: Sử dụng trực tiếp `availableBlocks`
  if (availableBlocks.has('PROCEDURE')) {
    let changed = true;
    while (changed) {
      changed = false;
      let bestPattern = { benefit: 0, sequence: [] as Action[], occurrences: [] as number[] };

      // Tìm tất cả các chuỗi con và tính lợi nhuận
      for (let len = Math.floor(currentActions.length / 2); len > 0; len--) {
        for (let i = 0; i <= currentActions.length - len; i++) {
          const sequence = currentActions.slice(i, i + len);
          const occurrences: number[] = [i];
          let k = i + len;
          while (k <= currentActions.length - len) {
            const nextSegment = currentActions.slice(k, k + len);
            if (JSON.stringify(sequence) === JSON.stringify(nextSegment)) {
              occurrences.push(k);
              k += len; // Bỏ qua phần đã khớp để tránh overlapping
            } else {
              k++;
            }
          }

          if (occurrences.length > 1) {
            const blocksUsed = occurrences.length * len;
            const blocksAfter = len + occurrences.length; // Định nghĩa hàm + các lần gọi hàm
            const benefit = blocksUsed - blocksAfter;

            if (benefit > bestPattern.benefit) {
              bestPattern = { benefit, sequence, occurrences };
            }
          }
        }
      }

      // Nếu tìm thấy một mẫu có lợi, thực hiện thay thế
      if (bestPattern.benefit > 0) {
        procedureCount++;
        const procName = `PROCEDURE_${procedureCount}`;
        procedures[procName] = bestPattern.sequence;

        const callBlock: Action = { type: 'CALL', name: procName };
        
        // Thay thế các chuỗi đã tìm thấy bằng khối gọi hàm, từ cuối lên đầu để không làm thay đổi chỉ số
        for (let i = bestPattern.occurrences.length - 1; i >= 0; i--) {
          const index = bestPattern.occurrences[i];
          currentActions.splice(index, bestPattern.sequence.length, callBlock);
        }
        changed = true; // Lặp lại để tìm thêm hàm (có thể lồng nhau)
      }
    }
  }

  // --- BƯỚC 4: CHUYỂN ĐỔI CÁC KHỐI GỌI HÀM TẠM THỜI ---
  // Chuyển các khối 'CALL' tạm thời thành khối 'procedures_callnoreturn' chuẩn của Blockly
  const finalMain = currentActions.map(action => {
    if (action.type === 'CALL' && action.name) {
      return {
        type: 'procedures_callnoreturn',
        mutation: {
          name: action.name // Tên hàm sẽ được hiển thị trên khối
        }
      };
    }
    return action;
  });

  // Trả về kết quả cuối cùng
  return { main: finalMain, procedures: Object.keys(procedures).length > 0 ? procedures : undefined };
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
    // NÂNG CẤP: Đếm cả khối lồng nhau trong 'maze_repeat' và 'maze_for'
    if ((action.type === 'maze_repeat' || action.type === 'maze_for') && Array.isArray(action.actions)) {
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
 * @param blocklyConfig Cấu hình toolbox của thử thách.
 * @param solutionConfig Đối tượng cấu hình solution (chứa itemGoals).
 */
export const solveMaze = (gameConfig: GameConfig, solutionConfig: Solution, blocklyConfig?: QuestBlocklyConfig): Solution | null => { // THAY ĐỔI: Thêm blocklyConfig
  return aStarPathSolver(gameConfig, solutionConfig, blocklyConfig);
};

/** TÁI CẤU TRÚC: Thuật toán A* mới, tìm đường đi theo VỊ TRÍ thay vì HÀNH ĐỘNG */
const aStarPathSolver = (gameConfig: GameConfig, solutionConfig: Solution, blocklyConfig?: QuestBlocklyConfig): Solution | null => { // THAY ĐỔI: Thêm blocklyConfig
    if (!gameConfig.players?.[0]?.start || !gameConfig.finish) {
        console.error("Solver: Thiếu điểm bắt đầu hoặc kết thúc.");
        return null;
    }

    // BƯỚC 1: Phân tích toolbox để lấy các khối lệnh có sẵn ngay từ đầu.
    const availableBlocks = new Set<string>();
    // SỬA LỖI: Củng cố logic để xử lý các cấu trúc blocklyConfig khác nhau.
    // `augmented_config` có thể lồng `toolbox` trong một cấp nữa.
    const toolbox = (blocklyConfig as any)?.toolbox || blocklyConfig;
    const toolboxContents = toolbox?.contents;

    if (toolboxContents) {
      const queue = [...toolboxContents];
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) continue;
        if (item.type) availableBlocks.add(item.type);
        if (item.custom === 'PROCEDURE') availableBlocks.add('PROCEDURE');
        // SỬA LỖI: Luôn duyệt vào 'contents' nếu nó tồn tại, không phụ thuộc vào các điều kiện khác.
        // Điều này đảm bảo các category lồng nhau được xử lý chính xác.
        if (Array.isArray(item.contents)) queue.push(...item.contents); 
      }
    }
    console.log("Solver: Các khối lệnh có sẵn từ toolbox:", Array.from(availableBlocks));

    const world = new GameWorld(gameConfig, solutionConfig);
    const startPos = gameConfig.players[0].start;
    // Lấy hướng ban đầu từ gameConfig.
    // Nếu không được cung cấp, mặc định là 2 (hướng +Z/Tới theo quy ước đã sửa).
    const startDir = gameConfig.players[0].start.direction !== undefined ? gameConfig.players[0].start.direction : 2; // Sửa mặc định thành 2 (+Z)

    const startState = new GameState(startPos, startDir, world); // world đã có solutionConfig
    const startNode = new PathNode(startState);

    const openList: PathNode[] = [];
    const closedList: Map<string, number> = new Map(); // Map<stateKey, gCost>

    const manhattan = (p1: Position, p2: Position): number => {
        return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y) + Math.abs(p1.z - p2.z);
    };

    const heuristic = (state: GameState): number => {
      const currentPos = state.position; // THAY ĐỔI: Sử dụng solutionConfig từ world
      const requiredGoals = world.solutionConfig.itemGoals || {}; // THAY ĐỔI: Sử dụng solutionConfig từ world
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
  
      // SỬA LỖI: Logic heuristic cũ không chính xác và có thể đánh giá quá cao chi phí,
      // dẫn đến việc A* chọn đường đi không tối ưu.
      // Logic mới: Heuristic phải là giá trị lớn nhất của (khoảng cách đến một mục tiêu phụ +
      // khoảng cách từ mục tiêu đó đến đích). Điều này đảm bảo heuristic vẫn "admissible"
      // (không đánh giá quá cao) và cung cấp một ước tính tốt hơn.
      let maxHeuristic = manhattan(currentPos, world.finishPos); // Bắt đầu với khoảng cách đến đích cuối cùng

      // Cải tiến Heuristic: Nếu có thể dùng hàm, giảm nhẹ heuristic để khuyến khích các đường đi có thể tối ưu hóa
      if (availableBlocks.has('PROCEDURE')) {
        maxHeuristic *= 0.95;
      }

      for (const pos of remainingGoalPositions) {
        // Tính tổng chi phí ước tính nếu đi qua mục tiêu này
        const costViaThisGoal = manhattan(currentPos, pos) + manhattan(pos, world.finishPos);
        // Heuristic là chi phí tối đa trong tất cả các khả năng
        maxHeuristic = Math.max(maxHeuristic, costViaThisGoal);
      }
      
      return maxHeuristic;
    };

    const isGoalAchieved = (state: GameState): boolean => {
        const isAtFinish = state.position.x === world.finishPos.x && state.position.y === world.finishPos.y && state.position.z === world.finishPos.z;
        if (!isAtFinish) return false;

        // THAY ĐỔI: Logic kiểm tra mục tiêu bị sai. Cần đếm số lượng vật phẩm đã thu thập theo đúng `goalType`.
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

    // XÓA BỎ KHỐI TIỀN XỬ LÝ: Logic này phức tạp và gây ra lỗi không nhất quán
    // giữa lần quay đầu và các lần quay sau. Vòng lặp A* chính sẽ xử lý tất cả
    // các hành động xoay một cách đồng bộ.
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
            // THAY ĐỔI: Truyền trực tiếp `availableBlocks` vào hàm tối ưu hóa
            const newStructuredSolution = createStructuredSolution(convertRawToStructuredActions(path), availableBlocks);

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

        const neighbors = findNeighbors(state, world);

        for (const neighbor of neighbors) {
            const { pos: neighborPos, action: moveAction } = neighbor;
            const nextState = state.clone();
            nextState.position = neighborPos;
            const neighborPosKey = `${neighborPos.x},${neighborPos.y},${neighborPos.z}`;

            let cost = 0;
            const actionsToReachNeighbor: string[] = [];
            const lastAction = currentNode.rawActionsToReach.length > 0 ? currentNode.rawActionsToReach[currentNode.rawActionsToReach.length - 1] : null;

            // --- LOGIC MỚI: Truyền `lastAction` vào `calculateTurnActions` để có thể áp dụng chiết khấu lặp lại ---
            const { actions: turnActions, newDirection: targetDir, cost: turnCost } = calculateTurnActions(state, neighborPos, lastAction);
            actionsToReachNeighbor.push(...turnActions);
            cost += turnCost;

            // --- LOGIC MỚI: KHUYẾN KHÍCH SỰ LẶP LẠI ---
            // Giảm nhẹ chi phí nếu hành động giống hành động trước đó để A* ưu tiên các chuỗi lặp lại.
            const REPETITION_DISCOUNT = 0.01; // Tăng nhẹ chiết khấu để có tác động rõ ràng hơn

            // Thêm hành động và chi phí cho di chuyển (walk/jump)
            if (moveAction === 'walk') {
                actionsToReachNeighbor.push('moveForward');
                let moveCost = 1.0;
                if (lastAction === 'moveForward') {
                    moveCost -= REPETITION_DISCOUNT;
                }
                cost += moveCost;
            } else { // jump
                actionsToReachNeighbor.push('jump');
                let jumpCost = 1.2; // Nhảy tốn nhiều chi phí hơn một chút
                if (lastAction === 'jump') {
                    jumpCost -= REPETITION_DISCOUNT;
                }
                cost += jumpCost;
            }
            
            nextState.direction = targetDir;

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

/**
 * HÀM MỚI: Tìm tất cả các hàng xóm hợp lệ từ một trạng thái nhất định.
 * @param state Trạng thái hiện tại.
 * @param world Thế giới game.
 * @returns Một mảng các hàng xóm hợp lệ.
 */
function findNeighbors(state: GameState, world: GameWorld): { pos: Position, action: 'walk' | 'jump' }[] {
    const neighbors: { pos: Position, action: 'walk' | 'jump' }[] = [];
    const { x, y, z } = state.position;

    // Duyệt qua 4 hướng chính
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
        const jumpUpObstaclePos = { x: nextX, y: y, z: nextZ };
        const jumpUpLandingPos = { x: nextX, y: y + 1, z: nextZ };
        if (world.worldMap.has(`${jumpUpObstaclePos.x},${jumpUpObstaclePos.y},${jumpUpObstaclePos.z}`) &&
            !world.worldMap.has(`${jumpUpLandingPos.x},${jumpUpLandingPos.y},${jumpUpLandingPos.z}`)) {
            neighbors.push({ pos: jumpUpLandingPos, action: 'jump' });
        }

        // 3. Kiểm tra nhảy xuống (Jump Down)
        const jumpDownAirPos = { x: nextX, y: y, z: nextZ };
        const jumpDownLandingPos = { x: nextX, y: y - 1, z: nextZ };
        const groundBelowJumpDown = { x: nextX, y: y - 2, z: nextZ };
        if (!world.worldMap.has(`${jumpDownAirPos.x},${jumpDownAirPos.y},${jumpDownAirPos.z}`) &&
            !world.worldMap.has(`${jumpDownLandingPos.x},${jumpDownLandingPos.y},${jumpDownLandingPos.z}`) &&
            world.isWalkable(groundBelowJumpDown)) {
            neighbors.push({ pos: jumpDownLandingPos, action: 'jump' });
        }
    }
    return neighbors;
}

/**
 * HÀM MỚI: Tính toán các hành động xoay, hướng mới và chi phí để đi từ trạng thái hiện tại đến vị trí tiếp theo.
 */
function calculateTurnActions(currentState: GameState, nextPos: Position, lastAction: string | null): { actions: string[], newDirection: number, cost: number } {
    const actions: string[] = [];
    const REPETITION_DISCOUNT = 0.01; // Tăng nhẹ chiết khấu để có tác động rõ ràng hơn
    let cost = 0;

    const dx = nextPos.x - currentState.position.x;
    const dz = nextPos.z - currentState.position.z;
    // SỬA LỖI: Cập nhật ánh xạ dx, dz sang targetDir theo quy ước hướng đã sửa.
    let targetDir: number;
    if (dx === 1) targetDir = 1;      // Phải (+X)
    else if (dx === -1) targetDir = 3;// Trái (-X)
    else if (dz === 1) targetDir = 2; // Tới (+Z)
    else if (dz === -1) targetDir = 0;// Lùi (-Z)
    else targetDir = currentState.direction;

    if (targetDir !== currentState.direction) {
        // SỬA LỖI DỨT ĐIỂM: Logic quay đang bị ngược. Hoán đổi lại turnLeft và turnRight.
        // diff = 1 (theo chiều kim đồng hồ) phải là turnRight.
        // diff = 3 (ngược chiều kim đồng hồ) phải là turnLeft.
        const diff = (targetDir - currentState.direction + 4) % 4;
        if (diff === 1) {
            actions.push('turnRight');
            cost += (lastAction === 'turnRight' ? 0.1 - REPETITION_DISCOUNT : 0.1);
        } else if (diff === 3) {
            actions.push('turnLeft');
            cost += (lastAction === 'turnLeft' ? 0.1 - REPETITION_DISCOUNT : 0.1);
        } else if (diff === 2) {
            actions.push('turnRight', 'turnRight');
            cost += 0.2; // Khó áp dụng chiết khấu cho quay 180 độ, tạm giữ nguyên
        }
    }

    return { actions, newDirection: targetDir, cost };
}