
// --- β簡約機能の実装 (Hatコードテキスト解析版) ---------------------

// 1. HatコードのトークナイズとS式パース
function parseHatToSExp(codeStr) {
    // 継続渡し関数の引数 ^(x) や ^() などをひとつの塊とみなし、カッコやそれ以外で区切る
    let tokens = codeStr.match(/\^\([^)]*\)|\(|\)|[^\s()]+/g) || [];
    function parseTokens(tokens) {
        if (tokens.length === 0) return null;
        let token = tokens.shift();
        if (token === '(') {
            let list = [];
            while (tokens.length > 0 && tokens[0] !== ')') {
                let parsed = parseTokens(tokens);
                if (parsed !== null) list.push(parsed);
            }
            if (tokens.length > 0) tokens.shift(); // ')' をポップ
            return list;
        } else {
            return token; // 変数名やシンボル群
        }
    }
    
    let sexps = [];
    while (tokens.length > 0) {
        let parsed = parseTokens(tokens);
        if (parsed !== null) sexps.push(parsed);
    }
    return sexps;
}

// 2. S式からラムダ計算用ASTの構築
function buildLambdaAST(sexp) {
    if (!sexp) return null;
    if (typeof sexp === 'string') {
        return { type: 'var', name: sexp };
    }
    if (Array.isArray(sexp)) {
        if (sexp[0] === 'APPLY') {
            return { type: 'app', func: buildLambdaAST(sexp[1]), arg: buildLambdaAST(sexp[2]) };
        }
        if (sexp[0] === 'LAMBDA') {
            // sexp[1] is expected to be "^(param)"
            let match = (typeof sexp[1] === 'string' ? sexp[1] : "").match(/\^\(([^)]*)\)/);
            let param = (match && match[1]) ? match[1] : '?';
            return { type: 'abs', param: param, body: buildLambdaAST(sexp[2]) };
        }
        // LAMBDA, APPLY以外は今のところ無視（解釈不能な式）
        return { type: 'unknown', raw: sexp };
    }
    return null;
}

// ASTを文字列にフォーマット（λ表示）
function formatLambdaAST(ast) {
    if (!ast) return "?";
    if (ast.type === 'var') return ast.name;
    if (ast.type === 'abs') return `(λ${ast.param}.${formatLambdaAST(ast.body)})`;
    if (ast.type === 'app') return `(${formatLambdaAST(ast.func)} ${formatLambdaAST(ast.arg)})`;
    if (ast.type === 'unknown') return "<unknown>";
    return "?";
}

// オブジェクトのクローン
function cloneAST(ast) {
    return JSON.parse(JSON.stringify(ast));
}

// AST内の自由変数を取得（Setを返す）
function getFreeVars(node) {
    if (!node) return new Set();
    if (node.type === 'var') return new Set([node.name]);
    if (node.type === 'abs') {
        let fv = getFreeVars(node.body);
        fv.delete(node.param);
        return fv;
    }
    if (node.type === 'app') {
        let fv = getFreeVars(node.func);
        getFreeVars(node.arg).forEach(v => fv.add(v));
        return fv;
    }
    return new Set();
}

// アルファ変換用の新しい変数名をつくる（名前衝突回避）
function getFreshVar(name, avoidSet) {
    let fresh = name + "'";
    while (avoidSet.has(fresh)) {
        fresh += "'";
    }
    return fresh;
}

// 代入操作 ast [varName := replacement]
function substitute(ast, varName, replacement) {
    if (!ast) return ast;
    if (ast.type === 'var') {
        return ast.name === varName ? cloneAST(replacement) : cloneAST(ast);
    }
    if (ast.type === 'app') {
        return {
            type: 'app',
            func: substitute(ast.func, varName, replacement),
            arg: substitute(ast.arg, varName, replacement)
        };
    }
    if (ast.type === 'abs') {
        if (ast.param === varName) {
            return cloneAST(ast);
        }
        let replFreeVars = getFreeVars(replacement);
        if (replFreeVars.has(ast.param)) {
            // 変数捕獲（キャプチャ）を防ぐアルファ変換
            let allAvoid = new Set([...replFreeVars, ...getFreeVars(ast.body)]);
            let fresh = getFreshVar(ast.param, allAvoid);
            let alphaConvertedBody = substitute(ast.body, ast.param, { type: 'var', name: fresh });
            return {
                type: 'abs',
                param: fresh,
                body: substitute(alphaConvertedBody, varName, replacement)
            };
        } else {
            return {
                type: 'abs',
                param: ast.param,
                body: substitute(ast.body, varName, replacement)
            };
        }
    }
    return ast;
}

// β簡約を正常順序（外側・左側優先）で1ステップ実行する
function betaReduceStep(ast) {
    if (!ast) return { reduced: false, ast: ast };
    
    if (ast.type === 'app') {
        // (λx.M) N かどうか
        if (ast.func && ast.func.type === 'abs') {
            return {
                reduced: true,
                ast: substitute(ast.func.body, ast.func.param, ast.arg)
            };
        }
        let resFunc = betaReduceStep(ast.func);
        if (resFunc.reduced) {
            return {
                reduced: true,
                ast: { type: 'app', func: resFunc.ast, arg: ast.arg }
            };
        }
        let resArg = betaReduceStep(ast.arg);
        if (resArg.reduced) {
            return {
                reduced: true,
                ast: { type: 'app', func: ast.func, arg: resArg.ast }
            };
        }
    }
    if (ast.type === 'abs') {
        let resBody = betaReduceStep(ast.body);
        if (resBody.reduced) {
            return {
                reduced: true,
                ast: { type: 'abs', param: ast.param, body: resBody.ast }
            };
        }
    }
    return { reduced: false, ast: ast };
}

// ターミナルへ表示するメイン処理
function startBetaReduction() {
    const textElement = document.getElementById('HatCode');
    if (!textElement) return;
    
    // textareaの値を優先しつつ、もし無ければinnerHTML等から取得する
    const codeStr = textElement.value || textElement.textContent || textElement.innerHTML;
    
    const sexps = parseHatToSExp(codeStr);
    // (defineCPS main ^() ... を探す
    const mainExp = sexps.find(s => Array.isArray(s) && s[0] === 'defineCPS' && s[1] === 'main');
    
    // HatCodeの記述によっては mainExp が見つからなくても、最上位の APPLY などのラムダ式があるか探す
    let validLambdas = [];
    if (mainExp) {
        let bodyExps = mainExp.slice(3); // "(defineCPS main ^() ..." の後からスタート
        for (let ex of bodyExps) {
            if (ex === 'exit') break; // exit 0 まで来たら終了
            let ast = buildLambdaAST(ex);
            if (ast && ast.type !== 'unknown' && ast.type !== 'var') {
                validLambdas.push(ast);
            }
        }
    } else {
        // もし mainExp がなければ直のS式として検索
        for (let ex of sexps) {
            let ast = buildLambdaAST(ex);
            if (ast && ast.type !== 'unknown' && ast.type !== 'var') {
                validLambdas.push(ast);
            }
        }
    }
    
    if (validLambdas.length === 0) return;
    
    // ターミナルへ出力
    const terminalEl = document.getElementById("terminal");
    function printToTerm(msg) {
        if (typeof term !== 'undefined' && term && term.print) {
            term.print(msg);
        } else if (terminalEl) {
            terminalEl.value += msg;
        } else {
            console.log(msg);
        }
    }

    /*printToTerm("\n===============================\n");
    printToTerm("       β簡約ステップ表示       \n");
    printToTerm("===============================\n");*/
    
    for (let ast of validLambdas) {
        printToTerm("  " + formatLambdaAST(ast) + "\n");
        
        let stepsCount = 0;
        const MAX_STEPS = 100;
        while(stepsCount < MAX_STEPS) {
            let res = betaReduceStep(ast);
            if (!res.reduced) break;
            ast = res.ast;
            printToTerm("=> " + formatLambdaAST(ast) + "\n");
            stepsCount++;
        }
        if (stepsCount >= MAX_STEPS) {
            printToTerm("... (簡約処理の上限100回に到達しました)\n");
        }
        printToTerm("-------------------------------\n");
    }
    if (typeof printPrompt === 'function') printPrompt();
}
