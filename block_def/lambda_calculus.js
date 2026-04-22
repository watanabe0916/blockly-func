const lambdaBlocks = [
    {
        "type": "lambda_variable",
        "message0": "%1",
        "args0": [
            {
                "type": "field_input",
                "name": "VAR_NAME",
                "text": "x"
            }
        ],
        "output": null,
        "colour": 160,
        "tooltip": "ラムダ計算の変数",
        "helpUrl": ""
    },
    {
        "type": "lambda_abstraction",
        "message0": "λ %1 . %2",
        "args0": [
            {
                "type": "field_input",
                "name": "PARAM_NAME",
                "text": "x"
            },
            {
                "type": "input_value",
                "name": "BODY"
            }
        ],
        "output": null,
        "colour": 210,
        "tooltip": "関数抽象（無名関数の定義）",
        "helpUrl": ""
    },
    {
        "type": "lambda_application",
        "message0": "%1 に %2 を適用",
        "args0": [
            {
                "type": "input_value",
                "name": "FUNC"
            },
            {
                "type": "input_value",
                "name": "ARG"
            }
        ],
        "inputsInline": true,
        "output": null,
        "colour": 260,
        "tooltip": "関数適用",
        "helpUrl": ""
    }
];

Blockly.defineBlocksWithJsonArray(lambdaBlocks);

Blockly.Hat['lambda_variable'] = function (block) {
    const varName = block.getFieldValue('VAR_NAME');
    return [varName, Blockly.Hat.ORDER_ATOMIC];
};

Blockly.Hat['lambda_abstraction'] = function (block) {
    const paramName = block.getFieldValue('PARAM_NAME');
    const body = Blockly.Hat.valueToCode(block, 'BODY', Blockly.Hat.ORDER_NONE) || 'null';
    // Hat言語における無名関数（ラムダ式）のジェネレータ。
    // そのまま ^(x) body を返すと、CPSの文脈で自身に継続を適用してしまうため
    // 補助関数 LAMBDA を使って関数オブジェクトとして返却させる
    const code = "(LAMBDA ^(" + paramName + ") " + body + ")";
    return [code, Blockly.Hat.ORDER_ATOMIC];
};

Blockly.Hat['lambda_application'] = function (block) {
    const func = Blockly.Hat.valueToCode(block, 'FUNC', Blockly.Hat.ORDER_NONE) || 'null';
    const arg = Blockly.Hat.valueToCode(block, 'ARG', Blockly.Hat.ORDER_NONE) || 'null';
    // Hat言語における関数適用。
    // 中間言語の挙動を揃えるため、補助関数 APPLY を通して評価させる
    const code = "(APPLY " + func + " " + arg + ")";
    return [code, Blockly.Hat.ORDER_FUNCTION_CALL];
};
