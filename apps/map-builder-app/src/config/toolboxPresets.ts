export const toolboxPresets: Record<string, any> = {
  "commands_l1_move": {
    "kind": "categoryToolbox",
    "contents": [
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMOVEMENT}",
        "categorystyle": "movement_category",
        "contents": [
          { "kind": "block", "type": "maze_moveForward" }
        ]
      }
    ]
  },

  "commands_l2_turn": {
    "kind": "categoryToolbox",
    "contents": [
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMOVEMENT}",
        "categorystyle": "movement_category",
        "contents": [
          { "kind": "block", "type": "maze_moveForward" },
          { "kind": "block", "type": "maze_turn" }
        ]
      }
    ]
  },

  "commands_l3_jump": {
    "kind": "categoryToolbox",
    "contents": [
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMOVEMENT}",
        "categorystyle": "movement_category",
        "contents": [
          { "kind": "block", "type": "maze_moveForward" },
          { "kind": "block", "type": "maze_turn" },
          { "kind": "block", "type": "maze_jump" }
        ]
      }
    ]
  },

  "commands_l4_collect": {
    "kind": "categoryToolbox",
    "contents": [
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMOVEMENT}",
        "categorystyle": "movement_category",
        "contents": [
          { "kind": "block", "type": "maze_moveForward" },
          { "kind": "block", "type": "maze_turn" },
          { "kind": "block", "type": "maze_jump" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATACTIONS}",
        "categorystyle": "actions_category",
        "contents": [
          { "kind": "block", "type": "maze_collect" }
        ]
      }
    ]
  },

  "commands_l5_switch": {
    "kind": "categoryToolbox",
    "contents": [
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMOVEMENT}",
        "categorystyle": "movement_category",
        "contents": [
          { "kind": "block", "type": "maze_moveForward" },
          { "kind": "block", "type": "maze_turn" },
          { "kind": "block", "type": "maze_jump" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATACTIONS}",
        "categorystyle": "actions_category",
        "contents": [
          { "kind": "block", "type": "maze_toggle_switch" }
        ]
      }
    ]
  },

  "commands_l6_comprehensive": {
    "kind": "categoryToolbox",
    "contents": [
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMOVEMENT}",
        "categorystyle": "movement_category",
        "contents": [
          { "kind": "block", "type": "maze_moveForward" },
          { "kind": "block", "type": "maze_turn" },
          { "kind": "block", "type": "maze_jump" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATACTIONS}",
        "categorystyle": "actions_category",
        "contents": [
          { "kind": "block", "type": "maze_collect" },
          { "kind": "block", "type": "maze_toggle_switch" }
        ]
      }
    ]
  },

  "functions_l1_movement_only": {
    "kind": "categoryToolbox",
    "contents": [
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMOVEMENT}",
        "categorystyle": "movement_category",
        "contents": [
          { "kind": "block", "type": "maze_moveForward" },
          { "kind": "block", "type": "maze_turn" },
          { "kind": "block", "type": "maze_jump" }
        ]
      },
      { "kind": "sep" },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATPROCEDURES}",
        "custom": "PROCEDURE",
        "categorystyle": "procedure_category"
      }
    ]
  },

  "functions_l2_collect_gem": {
    "kind": "categoryToolbox",
    "contents": [
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMOVEMENT}",
        "categorystyle": "movement_category",
        "contents": [
          { "kind": "block", "type": "maze_moveForward" },
          { "kind": "block", "type": "maze_turn" },
          { "kind": "block", "type": "maze_jump" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATACTIONS}",
        "categorystyle": "actions_category",
        "contents": [
          { "kind": "block", "type": "maze_collect" }
        ]
      },
      { "kind": "sep" },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATPROCEDURES}",
        "custom": "PROCEDURE",
        "categorystyle": "procedure_category"
      }
    ]
  },

  "functions_l3_toggle_switch": {
    "kind": "categoryToolbox",
    "contents": [
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMOVEMENT}",
        "categorystyle": "movement_category",
        "contents": [
          { "kind": "block", "type": "maze_moveForward" },
          { "kind": "block", "type": "maze_turn" },
          { "kind": "block", "type": "maze_jump" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATACTIONS}",
        "categorystyle": "actions_category",
        "contents": [
          { "kind": "block", "type": "maze_toggle_switch" }
        ]
      },
      { "kind": "sep" },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATPROCEDURES}",
        "custom": "PROCEDURE",
        "categorystyle": "procedure_category"
      }
    ]
  },

  "functions_l4_comprehensive": {
    "kind": "categoryToolbox",
    "contents": [
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMOVEMENT}",
        "categorystyle": "movement_category",
        "contents": [
          { "kind": "block", "type": "maze_moveForward" },
          { "kind": "block", "type": "maze_turn" },
          { "kind": "block", "type": "maze_jump" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATACTIONS}",
        "categorystyle": "actions_category",
        "contents": [
          { "kind": "block", "type": "maze_collect" },
          { "kind": "block", "type": "maze_toggle_switch" }
        ]
      },
      { "kind": "sep" },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATPROCEDURES}",
        "custom": "PROCEDURE",
        "categorystyle": "procedure_category"
      }
    ]
  },

  "loops_l1_basic_movement": {
    "kind": "categoryToolbox",
    "contents": [
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMOVEMENT}",
        "categorystyle": "movement_category",
        "contents": [
          { "kind": "block", "type": "maze_moveForward" },
          { "kind": "block", "type": "maze_turn" },
          { "kind": "block", "type": "maze_jump" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATLOOPS}",
        "categorystyle": "loops_category",
        "contents": [
          {
            "kind": "block",
            "type": "maze_repeat",
            "inputs": {
              "TIMES": {
                "shadow": {
                  "type": "math_number",
                  "fields": { "NUM": 5 }
                }
              }
            }
          }
        ]
      }
    ]
  },

  "loops_l2_with_actions": {
    "kind": "categoryToolbox",
    "contents": [
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMOVEMENT}",
        "categorystyle": "movement_category",
        "contents": [
          { "kind": "block", "type": "maze_moveForward" },
          { "kind": "block", "type": "maze_turn" },
          { "kind": "block", "type": "maze_jump" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATACTIONS}",
        "categorystyle": "actions_category",
        "contents": [
          { "kind": "block", "type": "maze_collect" },
          { "kind": "block", "type": "maze_toggle_switch" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATLOOPS}",
        "categorystyle": "loops_category",
        "contents": [
          {
            "kind": "block",
            "type": "maze_repeat",
            "inputs": {
              "TIMES": {
                "shadow": {
                  "type": "math_number",
                  "fields": { "NUM": 5 }
                }
              }
            }
          }
        ]
      }
    ]
  },

  "loops_l3_functions_integration": {
    "kind": "categoryToolbox",
    "contents": [
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMOVEMENT}",
        "categorystyle": "movement_category",
        "contents": [
          { "kind": "block", "type": "maze_moveForward" },
          { "kind": "block", "type": "maze_turn" },
          { "kind": "block", "type": "maze_jump" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATACTIONS}",
        "categorystyle": "actions_category",
        "contents": [
          { "kind": "block", "type": "maze_collect" },
          { "kind": "block", "type": "maze_toggle_switch" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATLOOPS}",
        "categorystyle": "loops_category",
        "contents": [
          {
            "kind": "block",
            "type": "maze_repeat",
            "inputs": {
              "TIMES": {
                "shadow": {
                  "type": "math_number",
                  "fields": { "NUM": 5 }
                }
              }
            }
          }
        ]
      },
      { "kind": "sep" },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATPROCEDURES}",
        "custom": "PROCEDURE",
        "categorystyle": "procedure_category"
      }
    ]
  },

  "loops_l4_for_loop_only": {
    "kind": "categoryToolbox",
    "contents": [
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMOVEMENT}",
        "categorystyle": "movement_category",
        "contents": [
          { "kind": "block", "type": "maze_moveForward" },
          { "kind": "block", "type": "maze_turn" },
          { "kind": "block", "type": "maze_jump" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATACTIONS}",
        "categorystyle": "actions_category",
        "contents": [
          { "kind": "block", "type": "maze_collect" },
          { "kind": "block", "type": "maze_toggle_switch" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATLOOPS}",
        "categorystyle": "loops_category",
        "contents": [
          {
            "kind": "block",
            "type": "maze_repeat",
            "inputs": {
              "TIMES": { "shadow": { "type": "math_number", "fields": { "NUM": 4 } } }
            }
          }
        ]
      }
    ]
  },

  "variables_l1_basic_assignment": {
    "kind": "categoryToolbox",
    "contents": [
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMOVEMENT}",
        "categorystyle": "movement_category",
        "contents": [
          { "kind": "block", "type": "maze_moveForward" },
          { "kind": "block", "type": "maze_turn" },
          { "kind": "block", "type": "maze_jump" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATLOOPS}",
        "categorystyle": "loops_category",
        "contents": [
          { "kind": "block", "type": "maze_repeat" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMATH}",
        "categorystyle": "math_category",
        "contents": [
          { "kind": "block", "type": "math_number" }
        ]
      },
      { "kind": "sep" },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATVARIABLES}",
        "custom": "VARIABLE",
        "categorystyle": "variable_category"
      }
    ]
  },

  "variables_l2_calculation": {
    "kind": "categoryToolbox",
    "contents": [
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMOVEMENT}",
        "categorystyle": "movement_category",
        "contents": [
          { "kind": "block", "type": "maze_moveForward" },
          { "kind": "block", "type": "maze_turn" },
          { "kind": "block", "type": "maze_jump" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATACTIONS}",
        "categorystyle": "actions_category",
        "contents": [
          { "kind": "block", "type": "maze_collect" },
          { "kind": "block", "type": "maze_toggle_switch" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATLOOPS}",
        "categorystyle": "loops_category",
        "contents": [
          { "kind": "block", "type": "maze_repeat" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMATH}",
        "categorystyle": "math_category",
        "contents": [
          { "kind": "block", "type": "math_number" },
          {
            "kind": "block",
            "type": "math_arithmetic",
            "inputs": {
              "A": { "shadow": { "type": "math_number", "fields": { "NUM": 1 } } },
              "B": { "shadow": { "type": "math_number", "fields": { "NUM": 1 } } }
            }
          }
        ]
      },
      { "kind": "sep" },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATVARIABLES}",
        "custom": "VARIABLE",
        "categorystyle": "variable_category"
      }
    ]
  },

  "variables_l3_game_data": {
    "kind": "categoryToolbox",
    "contents": [
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMOVEMENT}",
        "categorystyle": "movement_category",
        "contents": [
          { "kind": "block", "type": "maze_moveForward" },
          { "kind": "block", "type": "maze_turn" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATLOOPS}",
        "categorystyle": "loops_category",
        "contents": [
          { "kind": "block", "type": "maze_repeat" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMATH}",
        "categorystyle": "math_category",
        "contents": [
          { "kind": "block", "type": "math_number" },
          { "kind": "block", "type": "maze_item_count" }
        ]
      },
      { "kind": "sep" },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATVARIABLES}",
        "custom": "VARIABLE",
        "categorystyle": "variable_category"
      }
    ]
  },

  "variables_comprehensive": {
    "kind": "categoryToolbox",
    "contents": [
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMOVEMENT}",
        "categorystyle": "movement_category",
        "contents": [
          { "kind": "block", "type": "maze_moveForward" },
          { "kind": "block", "type": "maze_turn" },
          { "kind": "block", "type": "maze_jump" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATACTIONS}",
        "categorystyle": "actions_category",
        "contents": [
          { "kind": "block", "type": "maze_collect" },
          { "kind": "block", "type": "maze_toggle_switch" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATLOOPS}",
        "categorystyle": "loops_category",
        "contents": [
          { "kind": "block", "type": "maze_repeat" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMATH}",
        "categorystyle": "math_category",
        "contents": [
          { "kind": "block", "type": "math_number" },
          {
            "kind": "block",
            "type": "math_arithmetic",
            "inputs": {
              "A": { "shadow": { "type": "math_number", "fields": { "NUM": 1 } } },
              "B": { "shadow": { "type": "math_number", "fields": { "NUM": 1 } } }
            }
          },
          { "kind": "block", "type": "maze_item_count" }
        ]
      },
      { "kind": "sep" },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATVARIABLES}",
        "custom": "VARIABLE",
        "categorystyle": "variable_category"
      },
      { "kind": "sep" },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATPROCEDURES}",
        "custom": "PROCEDURE",
        "categorystyle": "procedure_category"
      }
    ]
  },

  "mixed_basic_patterns": {
    "kind": "categoryToolbox",
    "contents": [
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMOVEMENT}",
        "categorystyle": "movement_category",
        "contents": [
          { "kind": "block", "type": "maze_moveForward" },
          { "kind": "block", "type": "maze_turn" },
          { "kind": "block", "type": "maze_jump" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATACTIONS}",
        "categorystyle": "actions_category",
        "contents": [
          { "kind": "block", "type": "maze_collect" },
          { "kind": "block", "type": "maze_toggle_switch" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATLOOPS}",
        "categorystyle": "loops_category",
        "contents": [
          {
            "kind": "block",
            "type": "maze_repeat",
            "inputs": {
              "TIMES": {
                "shadow": {
                  "type": "math_number",
                  "fields": { "NUM": 5 }
                }
              }
            }
          }
        ]
      },
      { "kind": "sep" },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATPROCEDURES}",
        "custom": "PROCEDURE",
        "categorystyle": "procedure_category"
      }
    ]
  },

  "mixed_basic_full_integration": {
    "kind": "categoryToolbox",
    "contents": [
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMOVEMENT}",
        "categorystyle": "movement_category",
        "contents": [
          { "kind": "block", "type": "maze_moveForward" },
          { "kind": "block", "type": "maze_turn" },
          { "kind": "block", "type": "maze_jump" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATACTIONS}",
        "categorystyle": "actions_category",
        "contents": [
          { "kind": "block", "type": "maze_collect" },
          { "kind": "block", "type": "maze_toggle_switch" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATLOOPS}",
        "categorystyle": "loops_category",
        "contents": [
          {
            "kind": "block",
            "type": "maze_repeat",
            "inputs": {
              "TIMES": {
                "shadow": {
                  "type": "math_number",
                  "fields": { "NUM": 5 }
                }
              }
            }
          }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMATH}",
        "categorystyle": "math_category",
        "contents": [
          { "kind": "block", "type": "math_number" },
          {
            "kind": "block",
            "type": "math_arithmetic",
            "inputs": {
              "A": { "shadow": { "type": "math_number", "fields": { "NUM": 1 } } },
              "B": { "shadow": { "type": "math_number", "fields": { "NUM": 1 } } }
            }
          },
          { "kind": "block", "type": "maze_item_count" }
        ]
      },
      { "kind": "sep" },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATVARIABLES}",
        "custom": "VARIABLE",
        "categorystyle": "variable_category"
      },
      { "kind": "sep" },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATPROCEDURES}",
        "custom": "PROCEDURE",
        "categorystyle": "procedure_category"
      }
    ]
  },

  "conditionals_l1_movement_sensing": {
    "kind": "categoryToolbox",
    "contents": [
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMOVEMENT}",
        "categorystyle": "movement_category",
        "contents": [
          { "kind": "block", "type": "maze_moveForward" },
          { "kind": "block", "type": "maze_turn" },
          { "kind": "block", "type": "maze_jump" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATLOGIC}",
        "categorystyle": "logic_category",
        "contents": [
          { "kind": "block", "type": "controls_if" },
          { "kind": "block", "type": "maze_is_path" },
          { "kind": "block", "type": "maze_at_finish" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATLOOPS}",
        "categorystyle": "loops_category",
        "contents": [
          { "kind": "block", "type": "maze_repeat" }
        ]
      }
    ]
  },

  "conditionals_l2_interaction_sensing": {
    "kind": "categoryToolbox",
    "contents": [
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMOVEMENT}",
        "categorystyle": "movement_category",
        "contents": [
          { "kind": "block", "type": "maze_moveForward" },
          { "kind": "block", "type": "maze_turn" },
          { "kind": "block", "type": "maze_jump" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATACTIONS}",
        "categorystyle": "actions_category",
        "contents": [
          { "kind": "block", "type": "maze_collect" },
          { "kind": "block", "type": "maze_toggle_switch" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATLOGIC}",
        "categorystyle": "logic_category",
        "contents": [
          { "kind": "block", "type": "controls_if" },
          { "kind": "block", "type": "maze_is_path" },
          { "kind": "block", "type": "maze_is_item_present" },
          { "kind": "block", "type": "maze_is_switch_state" },
          { "kind": "block", "type": "maze_at_finish" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATLOOPS}",
        "categorystyle": "loops_category",
        "contents": [
          { "kind": "block", "type": "maze_repeat" }
        ]
      }
    ]
  },

  "conditionals_l3_variable_comparison": {
    "kind": "categoryToolbox",
    "contents": [
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMOVEMENT}",
        "categorystyle": "movement_category",
        "contents": [
          { "kind": "block", "type": "maze_moveForward" },
          { "kind": "block", "type": "maze_turn" },
          { "kind": "block", "type": "maze_jump" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATACTIONS}",
        "categorystyle": "actions_category",
        "contents": [
          { "kind": "block", "type": "maze_collect" },
          { "kind": "block", "type": "maze_toggle_switch" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATLOGIC}",
        "categorystyle": "logic_category",
        "contents": [
          { "kind": "block", "type": "controls_if" },
          { "kind": "block", "type": "logic_compare" },
          { "kind": "block", "type": "logic_boolean" },
          { "kind": "block", "type": "maze_is_path" },
          { "kind": "block", "type": "maze_is_item_present" },
          { "kind": "block", "type": "maze_is_switch_state" },
          { "kind": "block", "type": "maze_at_finish" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMATH}",
        "categorystyle": "math_category",
        "contents": [
          { "kind": "block", "type": "math_number" }
        ]
      },
      { "kind": "sep" },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATVARIABLES}",
        "custom": "VARIABLE",
        "categorystyle": "variable_category"
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATLOOPS}",
        "categorystyle": "loops_category",
        "contents": [
          { "kind": "block", "type": "maze_repeat" }
        ]
      }
    ]
  },
  
  "logic_ops_l1_negation": {
    "kind": "categoryToolbox",
    "contents": [
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMOVEMENT}",
        "categorystyle": "movement_category",
        "contents": [
          { "kind": "block", "type": "maze_moveForward" },
          { "kind": "block", "type": "maze_turn" },
          { "kind": "block", "type": "maze_jump" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATLOGIC}",
        "categorystyle": "logic_category",
        "contents": [
          { "kind": "block", "type": "controls_if" },
          { "kind": "block", "type": "logic_negate" },
          { "kind": "block", "type": "maze_is_path" },
          { "kind": "block", "type": "maze_at_finish" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATLOOPS}",
        "categorystyle": "loops_category",
        "contents": [
          { "kind": "block", "type": "maze_repeat" }
        ]
      }
    ]
  },

  "logic_ops_l2_and_or": {
    "kind": "categoryToolbox",
    "contents": [
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMOVEMENT}",
        "categorystyle": "movement_category",
        "contents": [
          { "kind": "block", "type": "maze_moveForward" },
          { "kind": "block", "type": "maze_turn" },
          { "kind": "block", "type": "maze_jump" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATACTIONS}",
        "categorystyle": "actions_category",
        "contents": [
          { "kind": "block", "type": "maze_collect" },
          { "kind": "block", "type": "maze_toggle_switch" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATLOGIC}",
        "categorystyle": "logic_category",
        "contents": [
          { "kind": "block", "type": "controls_if" },
          { "kind": "block", "type": "logic_operation" },
          { "kind": "block", "type": "logic_negate" },
          { "kind": "block", "type": "maze_is_path" },
          { "kind": "block", "type": "maze_is_item_present" },
          { "kind": "block", "type": "maze_is_switch_state" },
          { "kind": "block", "type": "maze_at_finish" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATLOOPS}",
        "categorystyle": "loops_category",
        "contents": [
          { "kind": "block", "type": "maze_repeat" }
        ]
      }
    ]
  },

  "logic_ops_full_complex": {
    "kind": "categoryToolbox",
    "contents": [
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMOVEMENT}",
        "categorystyle": "movement_category",
        "contents": [
          { "kind": "block", "type": "maze_moveForward" },
          { "kind": "block", "type": "maze_turn" },
          { "kind": "block", "type": "maze_jump" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATACTIONS}",
        "categorystyle": "actions_category",
        "contents": [
          { "kind": "block", "type": "maze_collect" },
          { "kind": "block", "type": "maze_toggle_switch" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATLOGIC}",
        "categorystyle": "logic_category",
        "contents": [
          { "kind": "block", "type": "controls_if" },
          { "kind": "block", "type": "logic_operation" },
          { "kind": "block", "type": "logic_negate" },
          { "kind": "block", "type": "logic_boolean" },
          { "kind": "block", "type": "logic_compare" },
          { "kind": "block", "type": "maze_is_path" },
          { "kind": "block", "type": "maze_is_item_present" },
          { "kind": "block", "type": "maze_is_switch_state" },
          { "kind": "block", "type": "maze_at_finish" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMATH}",
        "categorystyle": "math_category",
        "contents": [
          { "kind": "block", "type": "math_number" }
        ]
      },
      { "kind": "sep" },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATVARIABLES}",
        "custom": "VARIABLE",
        "categorystyle": "variable_category"
      },
      { "kind": "sep" },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATLOOPS}",
        "categorystyle": "loops_category",
        "contents": [
          { "kind": "block", "type": "maze_repeat" }
        ]
      },
      { "kind": "sep" },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATPROCEDURES}",
        "custom": "PROCEDURE",
        "categorystyle": "procedure_category"
      }
    ]
  },

  "while_l1_until_goal": {
    "kind": "categoryToolbox",
    "contents": [
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMOVEMENT}",
        "categorystyle": "movement_category",
        "contents": [
          { "kind": "block", "type": "maze_moveForward" },
          { "kind": "block", "type": "maze_turn" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATLOOPS}",
        "categorystyle": "loops_category",
        "contents": [
          { "kind": "block", "type": "maze_forever" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATLOGIC}",
        "categorystyle": "logic_category",
        "contents": [
          { "kind": "block", "type": "controls_if" },
          { "kind": "block", "type": "maze_is_path" }
        ]
      }
    ]
  },

  "while_l2_conditional_custom": {
    "kind": "categoryToolbox",
    "contents": [
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMOVEMENT}",
        "categorystyle": "movement_category",
        "contents": [
          { "kind": "block", "type": "maze_moveForward" },
          { "kind": "block", "type": "maze_turn" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATLOOPS}",
        "categorystyle": "loops_category",
        "contents": [
          { "kind": "block", "type": "maze_forever" },
          { "kind": "block", "type": "controls_whileUntil" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATLOGIC}",
        "categorystyle": "logic_category",
        "contents": [
          { "kind": "block", "type": "controls_if" },
          { "kind": "block", "type": "maze_is_path" },
          { "kind": "block", "type": "maze_is_item_present" },
          { "kind": "block", "type": "maze_at_finish" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATACTIONS}",
        "categorystyle": "actions_category",
        "contents": [
          { "kind": "block", "type": "maze_collect" },
          { "kind": "block", "type": "maze_toggle_switch" }
        ]
      }
    ]
  },

  "while_l3_full_logic": {
    "kind": "categoryToolbox",
    "contents": [
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMOVEMENT}",
        "categorystyle": "movement_category",
        "contents": [
          { "kind": "block", "type": "maze_moveForward" },
          { "kind": "block", "type": "maze_turn" },
          { "kind": "block", "type": "maze_jump" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATLOOPS}",
        "categorystyle": "loops_category",
        "contents": [
          { "kind": "block", "type": "maze_forever" },
          { "kind": "block", "type": "controls_whileUntil" },
          { "kind": "block", "type": "maze_repeat" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATLOGIC}",
        "categorystyle": "logic_category",
        "contents": [
          { "kind": "block", "type": "controls_if" },
          { "kind": "block", "type": "logic_operation" },
          { "kind": "block", "type": "logic_negate" },
          { "kind": "block", "type": "logic_compare" },
          { "kind": "block", "type": "maze_is_path" },
          { "kind": "block", "type": "maze_is_item_present" },
          { "kind": "block", "type": "maze_at_finish" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATACTIONS}",
        "categorystyle": "actions_category",
        "contents": [
          { "kind": "block", "type": "maze_collect" },
          { "kind": "block", "type": "maze_toggle_switch" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATVARIABLES}",
        "custom": "VARIABLE",
        "categorystyle": "variable_category"
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMATH}",
        "categorystyle": "math_category",
        "contents": [ { "kind": "block", "type": "math_number" } ]
      }
    ]
  },
  
  "algorithms_navigation_rules": {
    "kind": "categoryToolbox",
    "contents": [
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMOVEMENT}",
        "categorystyle": "movement_category",
        "contents": [
          { "kind": "block", "type": "maze_moveForward" },
          { "kind": "block", "type": "maze_turn" },
          { "kind": "block", "type": "maze_jump" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATACTIONS}",
        "categorystyle": "actions_category",
        "contents": [
          { "kind": "block", "type": "maze_collect" },
          { "kind": "block", "type": "maze_toggle_switch" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATLOOPS}",
        "categorystyle": "loops_category",
        "contents": [
          { "kind": "block", "type": "maze_forever" },
          { "kind": "block", "type": "controls_whileUntil" },
          { "kind": "block", "type": "maze_repeat" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATLOGIC}",
        "categorystyle": "logic_category",
        "contents": [
          { "kind": "block", "type": "controls_if" },
          { "kind": "block", "type": "logic_operation" },
          { "kind": "block", "type": "logic_negate" },
          { "kind": "block", "type": "maze_is_path" },
          { "kind": "block", "type": "maze_is_item_present" },
          { "kind": "block", "type": "maze_is_switch_state" },
          { "kind": "block", "type": "maze_at_finish" }
        ]
      },
      { "kind": "sep" },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATPROCEDURES}",
        "custom": "PROCEDURE",
        "categorystyle": "procedure_category"
      }
    ]
  },

  "algorithms_full_solver": {
    "kind": "categoryToolbox",
    "contents": [
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMOVEMENT}",
        "categorystyle": "movement_category",
        "contents": [
          { "kind": "block", "type": "maze_moveForward" },
          { "kind": "block", "type": "maze_turn" },
          { "kind": "block", "type": "maze_jump" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATACTIONS}",
        "categorystyle": "actions_category",
        "contents": [
          { "kind": "block", "type": "maze_collect" },
          { "kind": "block", "type": "maze_toggle_switch" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATLOOPS}",
        "categorystyle": "loops_category",
        "contents": [
          { "kind": "block", "type": "maze_forever" },
          { "kind": "block", "type": "controls_whileUntil" },
          { "kind": "block", "type": "maze_repeat" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATLOGIC}",
        "categorystyle": "logic_category",
        "contents": [
          { "kind": "block", "type": "controls_if" },
          { "kind": "block", "type": "logic_operation" },
          { "kind": "block", "type": "logic_negate" },
          { "kind": "block", "type": "logic_compare" },
          { "kind": "block", "type": "logic_boolean" },
          { "kind": "block", "type": "maze_is_path" },
          { "kind": "block", "type": "maze_is_item_present" },
          { "kind": "block", "type": "maze_is_switch_state" },
          { "kind": "block", "type": "maze_at_finish" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMATH}",
        "categorystyle": "math_category",
        "contents": [
          { "kind": "block", "type": "math_number" },
          { "kind": "block", "type": "math_arithmetic" },
          { "kind": "block", "type": "maze_item_count" }
        ]
      },
      { "kind": "sep" },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATVARIABLES}",
        "custom": "VARIABLE",
        "categorystyle": "variable_category"
      },
      { "kind": "sep" },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATPROCEDURES}",
        "custom": "PROCEDURE",
        "categorystyle": "procedure_category"
      }
    ]
  },

  "parameters_l1_basic_math": {
    "kind": "categoryToolbox",
    "contents": [
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMOVEMENT}",
        "categorystyle": "movement_category",
        "contents": [
          { "kind": "block", "type": "maze_moveForward" },
          { "kind": "block", "type": "maze_turn" },
          { "kind": "block", "type": "maze_jump" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATACTIONS}",
        "categorystyle": "actions_category",
        "contents": [
          { "kind": "block", "type": "maze_collect" },
          { "kind": "block", "type": "maze_toggle_switch" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMATH}",
        "categorystyle": "math_category",
        "contents": [
          { "kind": "block", "type": "math_number" },
          { "kind": "block", "type": "math_arithmetic" }
        ]
      },
      { "kind": "sep" },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATPROCEDURES}",
        "custom": "PROCEDURE",
        "categorystyle": "procedure_category"
      }
    ]
  },

  "parameters_full_generalization": {
    "kind": "categoryToolbox",
    "contents": [
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMOVEMENT}",
        "categorystyle": "movement_category",
        "contents": [
          { "kind": "block", "type": "maze_moveForward" },
          { "kind": "block", "type": "maze_turn" },
          { "kind": "block", "type": "maze_jump" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATACTIONS}",
        "categorystyle": "actions_category",
        "contents": [
          { "kind": "block", "type": "maze_collect" },
          { "kind": "block", "type": "maze_toggle_switch" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATLOOPS}",
        "categorystyle": "loops_category",
        "contents": [
          { "kind": "block", "type": "maze_forever" },
          { "kind": "block", "type": "controls_whileUntil" },
          { "kind": "block", "type": "maze_repeat" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATLOGIC}",
        "categorystyle": "logic_category",
        "contents": [
          { "kind": "block", "type": "controls_if" },
          { "kind": "block", "type": "logic_operation" },
          { "kind": "block", "type": "logic_negate" },
          { "kind": "block", "type": "logic_compare" },
          { "kind": "block", "type": "maze_is_path" },
          { "kind": "block", "type": "maze_is_item_present" },
          { "kind": "block", "type": "maze_at_finish" }
        ]
      },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATMATH}",
        "categorystyle": "math_category",
        "contents": [
          { "kind": "block", "type": "math_number" },
          { "kind": "block", "type": "math_arithmetic" },
          { "kind": "block", "type": "maze_item_count" }
        ]
      },
      { "kind": "sep" },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATVARIABLES}",
        "custom": "VARIABLE",
        "categorystyle": "variable_category"
      },
      { "kind": "sep" },
      {
        "kind": "category",
        "name": "%{BKY_GAMES_CATPROCEDURES}",
        "custom": "PROCEDURE",
        "categorystyle": "procedure_category"
      }
    ]
  },
  
  "full_toolbox_no_jump": {
    "kind": "categoryToolbox",
    "contents": [
        { "kind": "category", "name": "%{BKY_GAMES_CATMOVEMENT}", "categorystyle": "movement_category", "contents": [
            { "kind": "block", "type": "maze_moveForward" },
            { "kind": "block", "type": "maze_turn" }
        ]},
        { "kind": "category", "name": "%{BKY_GAMES_CATLOOPS}", "categorystyle": "loops_category", "contents": [
            { "kind": "block", "type": "maze_forever" },
            { "kind": "block", "type": "controls_whileUntil" },
            { "kind": "block", "type": "maze_repeat", "inputs": { "TIMES": { "shadow": { "type": "math_number", "fields": { "NUM": 5 }}}}}
        ]},
        {
            "kind": "category",
            "name": "%{BKY_GAMES_CATLOGIC}",
            "categorystyle": "logic_category",
            "contents": [
              { "kind": "block", "type": "controls_if" },
              { "kind": "block", "type": "logic_compare" },
              { "kind": "block", "type": "logic_operation" },
              { "kind": "block", "type": "logic_negate" },
              { "kind": "block", "type": "logic_boolean" },
              { "kind": "block", "type": "maze_is_path" },
              { "kind": "block", "type": "maze_is_item_present" },
              { "kind": "block", "type": "maze_is_switch_state" },
              { "kind": "block", "type": "maze_at_finish" }
            ]
        },
        { "kind": "category", "name": "%{BKY_GAMES_CATACTIONS}", "categorystyle": "actions_category", "contents": [
            { "kind": "block", "type": "maze_collect" },
            { "kind": "block", "type": "maze_toggle_switch" }
        ]},
        { "kind": "category", "name": "%{BKY_GAMES_CATMATH}", "categorystyle": "math_category", "contents": [
            { "kind": "block", "type": "maze_item_count" },
            { "kind": "block", "type": "math_number" },
            { "kind": "block", "type": "math_arithmetic", "inputs": { "A": { "shadow": { "type": "math_number", "fields": { "NUM": 1 }}}, "B": { "shadow": { "type": "math_number", "fields": { "NUM": 1 }}} }}
        ]},
        { "kind": "sep" },
        { "kind": "category", "name": "%{BKY_GAMES_CATVARIABLES}", "custom": "VARIABLE", "categorystyle": "variable_category" },
        { "kind": "category", "name": "%{BKY_GAMES_CATPROCEDURES}", "custom": "PROCEDURE", "categorystyle": "procedure_category" }
    ]
  },

  "full_toolbox": {
    "kind": "categoryToolbox",
    "contents": [
        { "kind": "category", "name": "%{BKY_GAMES_CATMOVEMENT}", "categorystyle": "movement_category", "contents": [
            { "kind": "block", "type": "maze_moveForward" },
            { "kind": "block", "type": "maze_jump" },
            { "kind": "block", "type": "maze_turn" }
        ]},
        { "kind": "category", "name": "%{BKY_GAMES_CATLOOPS}", "categorystyle": "loops_category", "contents": [
            { "kind": "block", "type": "maze_forever" },
            { "kind": "block", "type": "controls_whileUntil" },
            { "kind": "block", "type": "maze_repeat", "inputs": { "TIMES": { "shadow": { "type": "math_number", "fields": { "NUM": 5 }}}}}
        ]},
        {
            "kind": "category",
            "name": "%{BKY_GAMES_CATLOGIC}",
            "categorystyle": "logic_category",
            "contents": [
              { "kind": "block", "type": "controls_if" },
              { "kind": "block", "type": "logic_compare" },
              { "kind": "block", "type": "logic_operation" },
              { "kind": "block", "type": "logic_negate" },
              { "kind": "block", "type": "logic_boolean" },
              { "kind": "block", "type": "maze_is_path" },
              { "kind": "block", "type": "maze_is_item_present" },
              { "kind": "block", "type": "maze_is_switch_state" },
              { "kind": "block", "type": "maze_at_finish" }
            ]
        },
        { "kind": "category", "name": "%{BKY_GAMES_CATACTIONS}", "categorystyle": "actions_category", "contents": [
            { "kind": "block", "type": "maze_collect" },
            { "kind": "block", "type": "maze_toggle_switch" }
        ]},
        { "kind": "category", "name": "%{BKY_GAMES_CATMATH}", "categorystyle": "math_category", "contents": [
            { "kind": "block", "type": "maze_item_count" },
            { "kind": "block", "type": "math_number" },
            { "kind": "block", "type": "math_arithmetic", "inputs": { "A": { "shadow": { "type": "math_number", "fields": { "NUM": 1 }}}, "B": { "shadow": { "type": "math_number", "fields": { "NUM": 1 }}} }}
        ]},
        { "kind": "sep" },
        { "kind": "category", "name": "%{BKY_GAMES_CATVARIABLES}", "custom": "VARIABLE", "categorystyle": "variable_category" },
        { "kind": "category", "name": "%{BKY_GAMES_CATPROCEDURES}", "custom": "PROCEDURE", "categorystyle": "procedure_category" }
    ]
  }
};