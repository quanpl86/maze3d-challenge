const COMPREHENSIVE_THEMES_DATA = [
    // Classic & Neutral
    {"ground": "ground.checker", "obstacle": "wall.brick02", "tags": ["classic"]},
    {"ground": "ground.earth", "obstacle": "wall.brick04", "tags": ["natural"]},
    {"ground": "ground.normal", "obstacle": "wall.brick01", "tags": ["classic"]},
    {"ground": "ground.earthChecker", "obstacle": "wall.brick03", "tags": ["natural"]},

    // Stone & Rock
    {"ground": "stone.stone01", "obstacle": "wall.brick03", "tags": ["stone"]},
    {"ground": "stone.stone02", "obstacle": "wall.brick05", "tags": ["stone"]},
    {"ground": "stone.stone03", "obstacle": "wall.brick06", "tags": ["stone"]},
    {"ground": "stone.stone04", "obstacle": "wall.stone01", "tags": ["stone", "dark"]},
    {"ground": "stone.stone05", "obstacle": "wall.brick01", "tags": ["stone"]},
    {"ground": "stone.stone06", "obstacle": "wall.brick02", "tags": ["stone", "light"]},

    // Special Environments
    {"ground": "ground.mud", "obstacle": "wall.brick03", "tags": ["natural", "dark"]},
    {"ground": "ground.snow", "obstacle": "wall.brick06", "tags": ["winter"]},

    // --- [BỔ SUNG] Các bộ theme kết hợp mới ---
    {"ground": "ground.snow", "obstacle": "ice.ice01", "tags": ["winter", "ice"]},
    {"ground": "stone.stone01", "obstacle": "wall.stone01", "tags": ["stone", "monochrome"]},
    {"ground": "ground.earth", "obstacle": "wall.brick01", "tags": ["natural", "classic"]},
    {"ground": "stone.stone05", "obstacle": "wall.brick04", "tags": ["stone", "warm"]},
    {"ground": "ground.checker", "obstacle": "wall.brick05", "tags": ["classic", "dark"]},
    {"ground": "ice.ice01", "obstacle": "wall.brick01", "tags": ["winter", "mixed"]},
    {"ground": "ground.mud", "obstacle": "wall.brick02", "tags": ["natural", "contrast"]},
    {"ground": "stone.stone04", "obstacle": "wall.brick06", "tags": ["stone", "dark", "contrast"]},
    {"ground": "ground.normal", "obstacle": "wall.brick03", "tags": ["classic", "warm"]},
    {"ground": "stone.stone02", "obstacle": "wall.stone01", "tags": ["stone", "dark"]},

    // Prohibited themes (sẽ được lọc ra dựa trên ngữ cảnh)
    {
        "ground": "ice.ice01", "obstacle": "wall.brick05", "tags": ["winter", "ice", "prohibited"],
        // "prohibited_if_item": "crystal" // Đã loại bỏ ràng buộc này
    },
    {
        "ground": "stone.stone07", "obstacle": "wall.brick04", "tags": ["stone", "dark", "prohibited"],
        // "prohibited_if_item": "switch" // Đã loại bỏ ràng buộc này
    }
];

export const Themes = {
    COMPREHENSIVE_THEMES: COMPREHENSIVE_THEMES_DATA
};