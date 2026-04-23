//main定義エリア
const workspace = Blockly.inject(
  'blocklyDiv', {
    toolbox: document.getElementById('toolbox_main'),
    trashcan: true,
  },
);
//関数定義エリア
const workspace_function = Blockly.inject(
  'blocklyDiv_function', {
    toolbox: document.getElementById('toolbox_function'),
    trashcan: true,
  },
);

function clearTerminal() {
  const terminalElement = document.getElementById("terminal");
  if (terminalElement) {
    terminalElement.value = "";
  }
  term = TATerm("terminal");
  term.onInput = function(str){
      this.print(str);
      this.print("\n");
      printPrompt();
  };
}

  // Hat言語の出力
function showCode() {
  clearTerminal();
  //event.preventDefault();
  Blockly.Hat.INFINITE_LOOP_TRAP = null;
  const pre = document.getElementById('HatCode');
  
  const checkblocks = Blockly.Hat.workspaceToCode(workspace);
  console.log(checkblocks);
  pre.innerHTML = ""; //hatコードエリア初期化
  // main関数エリア
  pre.innerHTML = "(include \"util.sch\")";
  pre.innerHTML += "\n";
  pre.innerHTML += "(defineCPS main ^()";
  pre.innerHTML += "\n";
  pre.innerHTML += Blockly.Hat.workspaceToCode(workspace);
  pre.innerHTML += "\n";
  pre.innerHTML += "exit 0)";

  // 追加で定義された関数エリア
  pre.innerHTML += "\n\n";
  pre.innerHTML += Blockly.Hat.workspaceToCode(workspace_function);
  console.log(pre.innerHTML);

  // （追加）もしラムダ計算用のブロックがあれば、β簡約を試みて Hat出力エリア(terminal)に表示する
  if (typeof startBetaReduction === 'function') {
    startBetaReduction();
  }
}

function runCode() {
  clearTerminal();
  // Hat言語の出力
  Blockly.Hat.INFINITE_LOOP_TRAP = null;
  const pre = document.getElementById("HatCode");
  const checkblocks = Blockly.Hat.workspaceToCode(workspace);
  console.log(checkblocks);
  //pre = ""; //hatコード初期化
  pre.value = "(include \"util.sch\")";
  pre.value += "\n";
  pre.value += "(defineCPS main ^()";
  pre.value += "\n";
  pre.value += Blockly.Hat.workspaceToCode(workspace);
  pre.value += "\n";
  pre.value += "exit 0)";

  // 追加で定義された関数エリア
  pre.value += "\n\n";
  pre.value += Blockly.Hat.workspaceToCode(workspace_function);
  console.log(pre.value);

  // （追加）もしラムダ計算用のブロックがあれば、β簡約を試みて Hat出力エリア(terminal)に表示する
  if (typeof startBetaReduction === 'function') {
    startBetaReduction();
  }

  // Hat言語の実行
  HatInterpreter.startCode("Run", pre.value, "main");

}
//ボタン処理
// document.getElementById('showCode').addEventListener('click', showCode, false);
// document.getElementById('runCode').addEventListener('click', runCode, false);


var term=TATerm("terminal");
  function printPrompt( ){
      term.print("OK> ");
  }
  term.onInput=function(str){
      this.print(str);
      this.print("\n");
      printPrompt( )
  };
  
function hatPrint(arg){
  if(arg==null) return;
  var first=arg.getFirst( );
  console.log(first);
  term.print(HatInterpreter.valueString(first));
  hatPrint(arg.getRest( ));
}

function hatExit(status){
  exit_status=status;
  HatInterpreter.stop();
}

