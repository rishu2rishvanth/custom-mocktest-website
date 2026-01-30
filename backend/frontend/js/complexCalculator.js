//Author: Geetansh Agrawal (2481475)
/**
 * Error and special value strings
 */
var strNaN = "NaN"; // Not-a-Number indicator
var strInf = "Infinity"; // Infinity indicator
var oscError = "ERROR"; // General error message
var strMathError = "Math Error"; // Math-specific error message
var strEmpty = 0; // Default empty value

/**
 * Input constraints
 */
var maxLength = 8; // Maximum allowed input length to prevent overflow

/**
 * Arrays for managing operations and parentheses
 */
var opCodeArray = []; // Stores the sequence of operations (e.g., +, -, *, /)
var stackArray = []; // Stores numbers for calculations (operand stack)
var openArray = []; // Tracks open parentheses '(' for handling nested operations

/**
 * Operation tracking variables
 */
var opCode = 0; // Stores the current operation being performed (e.g., 1 for addition, 2 for subtraction)
var newOpCode = 0; // Stores the next operation to be executed

/**
 * Stack values for computations
 */
var stackVal = 0; // Stores the currently processed value in calculations
var stackVal1 = 1; // Indicates first operand status
var stackVal2 = 0; // Indicates second operand status

/**
 * Memory registers
 */
var memVal = 0; // Stores user memory value (for M+ and MR functionality)
var memory = 0; // Stores calculator memory value

/**
 * Display and input handling
 */
var displayString = ""; // Stores the current expression being displayed
var trigDisplay = ""; // Stores trigonometric function display text
var boolClear = true; // Determines if input should be cleared before new entry
var modeSelected = "deg"; // Stores angle mode (degrees or radians)
var display = ""; // Used for formatting display
var afterdec = ""; // Stores decimal portion of input for precision management
var dS = ""; // Temporary variable for display handling
var index;
var trig = 0;
var normalScientific = false;

//---------------------
var operationArray = [];
var currentVal = "0";
var currentOperator = 0;
var prevOperator = 0;
var previewVal = "0";
var finalVal = 0;
var bracketsCount = 0;
var memoryVal = "0";
/**
 * -----NEW OP Codes values description---------
 | Key   |    Value      |
 |-------|---------------|
 -------Number------------
 | -2    | Result        |
 | -1    | Number        |
 -------Binary------------
 | 1     |       +       |
 | 2     |       -       |
 | 3     |       *       |
 | 4     |       /       |
 | 5     |      mod      |
 | 6     |    YpowX (^)  |
 | 7     |      yroot    |
 | 8     |    logxBasey  |
 | 9     |       %       |
 | 10     |      e+0      |
 --------Misc-------------
 | 21    | Open Brac "(" |
 | 22    | Brac Close ")"|
 | 23     |   e           |
 | 24    |   pi          |
 ---------Unary-----------
 | 31    | sqr           |
 | 32    | sqrt          |
 | 33    | ln            |
 | 34    | log           |
 | 35    | logXbase2     |
 | 36    | powe          |
 | 37    | powten        |
 | 38    | cube          |
 | 39    | cuberoot      |
 | 40    | abs           |
 | 41    | reciproc      |
 | 42    | fact          |
------Trigno-----------
| 51   | sind          |
| 52   | sinr          |
| 53   | asind         |
| 54   | asinr         |
| 55   | cosd          |
| 56   | cosr          |
| 57   | acosd         |
| 58   | acosr         |
| 59   | tand          |
| 60   | tanr          |
| 61   | atand         |
| 62   | atanr         |
| 63   | sinhd         |
| 64   | sinhr         |
| 65   | sinh-1d       |
| 66   | sinh-1r       |
| 67   | coshd         |
| 68   | coshr         |
| 69   | cosh-1d       |
| 70   | cosh-1r       |
| 71   | tanhd         |
| 72   | tanhr         |
| 73   | tanh-1d       |
| 74   | tanh-1r       |
---------Memory---------
| 91   | MS       |
| 92   | MR       |
| 93   | MC       |
| 94   | M+       |
| 95   | M-       |
 */
function getOperatorVal(operator) {
  switch (operator) {
    // -------Binary------------
    case "+":
      return 1;
    case "-":
      return 2;
    case "*":
      return 3;
    case "/":
      return 4;
    case "mod":
      return 5;
    case "^":
      return 6;
    case "yroot":
      return 7;
    case "logxBasey":
      return 8;
    case "%":
      return 9;
    case "e+0":
      return 10;

    // --------Misc-------------
    case "(":
      return 21;
    case ")":
      return 22;
    case "e":
      return 23;
    case "pi":
      return 24;

    // --------Unary-----------
    case "sqr":
      return 31;
    case "sqrt":
      return 32;
    case "ln":
      return 33;
    case "log":
      return 34;
    case "logXbase2":
      return 35;
    case "powe":
      return 36;
    case "powten":
      return 37;
    case "cube":
      return 38;
    case "cuberoot":
      return 39;
    case "abs":
      return 40;
    case "reciproc":
      return 41;
    case "fact":
      return 42;

    // --------Trigonometric (Degrees and Radians)---------
    case "sind": // sin in degrees
      return 51;
    case "sinr": // sin in radians
      return 52;
    case "asind": // arcsin in degrees
      return 53;
    case "asinr": // arcsin in radians
      return 54;

    case "cosd": // cos in degrees
      return 55;
    case "cosr": // cos in radians
      return 56;
    case "acosd": // arccos in degrees
      return 57;
    case "acosr": // arccos in radians
      return 58;

    case "tand": // tan in degrees
      return 59;
    case "tanr": // tan in radians
      return 60;
    case "atand": // arctan in degrees
      return 61;
    case "atanr": // arctan in radians
      return 62;

    // --------Hyperbolic (Degrees and Radians)---------
    case "sinhd": // sinh in degrees
      return 63;
    case "sinhr": // sinh in radians
      return 64;
    case "sinh-1d": // inverse sinh in degrees
      return 65;
    case "sinh-1r": // inverse sinh in radians
      return 66;

    case "coshd": // cosh in degrees
      return 67;
    case "coshr": // cosh in radians
      return 68;
    case "cosh-1d": // inverse cosh in degrees
      return 69;
    case "cosh-1r": // inverse cosh in radians
      return 70;

    case "tanhd": // tanh in degrees
      return 71;
    case "tanhr": // tanh in radians
      return 72;
    case "tanh-1d": // inverse tanh in degrees
      return 73;
    case "tanh-1r": // inverse tanh in radians
      return 74;

    //Memory Operators
    case "MS":
      return 91;
    case "MR":
      return 92;
    case "MC":
      return 93;
    case "M+":
      return 94;
    case "M-":
      return 95;

    default:
      return -2;
  }
}

//Change the angle value according to mode selected
function changeXBasedOnMode(mode, inputValue) {
  if (mode == "deg") {
    const evalStr = `${inputValue} * (pi / 180)`;
    const evalVal = math.evaluate(evalStr);
    return evalVal.toString();
  } else if (mode == "rad") {
    return inputValue;
  }
}

function changeValOfInvBasedOnMode(mode, ipVal) {
  if (mode == "deg") {
    return math.evaluate(`(180 / pi ) *${ipVal}`).toString();
  } else {
    return ipVal;
  }
}

function nthroot(x, n) {
  try {
    return math.evaluate(`nthRoot(${x},${n})`).toString();
  } catch (e) {
    return strMathError;
  }
}

const EPSILON = 1e-10;

// Helper to clean small real values
function clean(value) {
  if (math.isNumeric(value) && Math.abs(value) < EPSILON) return "0";
  return value.toString();
}

function sinCalc(mode, inputVal) {
  var ipVal = changeXBasedOnMode(mode, inputVal);
  try {
    const result = math.evaluate(`sin(${ipVal})`);
    return clean(result);
  } catch {
    return "Math Error";
  }
}

function cosCalc(mode, inputVal) {
  let ipVal = changeXBasedOnMode(mode, inputVal);
  try {
    const result = math.evaluate(`cos(${ipVal})`);
    return clean(result);
  } catch {
    return "Math Error";
  }
}

function tanCalc(mode, inputVal) {
  var ipVal = changeXBasedOnMode(mode, inputVal);
  try {
    // Check if cos(angle) is near zero
    let cosVal = math.evaluate(`cos(${ipVal})`);
    if (math.isNumeric(cosVal) && Math.abs(cosVal) < EPSILON) {
      return "Math Error"; // tan undefined here
    }

    let sinVal = math.evaluate(`sin(${ipVal})`);

    //fixing to 8 decimal digits to handle out of scope floating values
    sinVal = math.fix(sinVal, 8);
    cosVal = math.fix(cosVal, 8);

    const result = math.evaluate(`${sinVal} / ${cosVal}`);
    return clean(result);
  } catch {
    return "Math Error";
  }
}

//Inverse
function sinInvCalc(mode, inputVal) {
  var opVal;
  var ipVal = math.evaluate(`asin(${inputVal})`);
  if (strNaN.indexOf(math.round(ipVal, 8)) > -1) {
    opVal = strMathError;
  } else {
    opVal = changeValOfInvBasedOnMode(mode, ipVal);
  }
  return opVal;
}

function cosInvCalc(mode, inputVal) {
  var opVal;
  var ipVal = math.evaluate(`acos(${inputVal})`);
  if (strNaN.indexOf(math.round(ipVal, 8)) > -1) {
    opVal = strMathError;
  } else {
    opVal = changeValOfInvBasedOnMode(mode, ipVal);
  }
  return opVal;
}

function tanInvCalc(mode, inputVal) {
  var opVal;
  var ipVal = math.evaluate(`atan(${inputVal})`);
  if (strNaN.indexOf(math.round(ipVal, 8)) > -1) {
    opVal = strMathError;
  } else {
    opVal = changeValOfInvBasedOnMode(mode, ipVal);
  }
  return opVal;
}

function pushToStack(value) {
  const top = getTopStack(operationArray);
  top.push(value);
}

function getTopStack(stack) {
  let top = stack;
  while (Array.isArray(top[top.length - 1])) {
    top = top[top.length - 1];
  }
  return top;
}

function getTrignometricString(text) {
  var mode = "d";
  if (modeSelected != "deg") {
    mode = "r";
  }
  return text + mode;
}

function nestedArrayToString(expr, isRoot = true) {
  if (Array.isArray(expr)) {
    const inner = expr.map((e) => nestedArrayToString(e, false)).join(" ");
    return isRoot ? inner : `(${inner})`;
  } else {
    return String(expr);
  }
}

function updateDisplay() {
  // keyPad_OutputArea;
  // keyPad_InputArea;
  $("#keyPad_InputArea").val(nestedArrayToString(operationArray));
  $("#keyPad_OutputArea").val(previewVal);
  //   $("#keyPad_UserInput").val(previewVal);
}

function evaluateNested(stack) {
  handleInfinity();
  try {
    const expr = stackToString(stack);
    return math.evaluate(expr);
  } catch (e) {
    return "Math Error";
  }
}

function transformYLogXExpression(arr) {
  const transformed = [];
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === "logxBasey" && i > 0 && i < arr.length - 1) {
      const x = arr[i - 1];
      const y = arr[i + 1];
      // Remove the operands that will now be inside the transformed structure
      transformed.pop(); // remove x
      // Inject transformed version: log(x) / log(y)
      transformed.push(["log", [x], "/", "log", [y]]);
      i++; // Skip y
    } else {
      transformed.push(arr[i]);
    }
  }
  return transformed;
}

function transformYRootExpression(arr) {
  const transformed = [];
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === "yroot" && i > 0 && i < arr.length - 1) {
      const base = arr[i - 1];
      const root = arr[i + 1];
      // Remove the base operand that comes before "yroot"
      transformed.pop();
      // Push transformed form: [ [base], "^", [1, "/", [root]] ]
      transformed.push([[base], "^", [1, "/", [root]]]);
      i++; // skip the next operand (root)
    } else {
      transformed.push(arr[i]);
    }
  }
  return transformed;
}

function transformLogXBaseYArray(arr) {
  const result = [];
  let i = 0;

  while (i < arr.length) {
    if (
      arr[i] === "log" &&
      i + 4 < arr.length &&
      arr[i + 2] === "/" &&
      arr[i + 3] === "log"
    ) {
      // Found logXBaseY pattern
      const logGroup = ["log", [arr[i + 1]], "/", "log", [arr[i + 4]]];
      result.push(logGroup);
      i += 5;
    } else {
      result.push(arr[i]);
      i++;
    }
  }

  return result;
}

function transformYRootXArray(arr) {
  const result = [];
  let i = 0;

  while (i < arr.length) {
    if (arr[i] === "^^") {
      result.push("^");

      // Group the next 3 elements into a sub-array
      if (i + 3 <= arr.length) {
        const group = [arr[i + 1], arr[i + 2], arr[i + 3]];
        result.push(group);
        i += 4;
      } else {
        // If not enough elements, just push what's available
        result.push(arr.slice(i + 1));
        break;
      }
    } else {
      result.push(arr[i]);
      i++;
    }
  }

  return result;
}

function stackToString(stack) {
  return stack
    .map((item) => {
      if (Array.isArray(item)) {
        return `(${stackToString(item)})`;
      }
      return item;
    })
    .join(" ");
}

function handleInfinity() {
  if (previewVal.includes("Infinity") || currentVal.includes("Infinity")) {
    clearAllValues();
  }
}

function handleInverse() {
  handleInfinity();
  currentOperator = -1;

  //Handle display string if nothing is available in the operation array then clear the display
  if (operationArray.length === 0) {
    displayString = "";
    var inBox1 = $("#keyPad_UserInput1");
    inBox1.val("");
  }

  let inverseResult = math
    .evaluate(`-1 * (${currentVal || previewVal || "0"})`)
    .toString();

  if (inverseResult.includes("-")) inverseResult = "(" + inverseResult + ")";
  currentVal = inverseResult;
  previewVal = currentVal;

  prevOperator = currentOperator;
  updateDisplay();
}

function handleBackspace() {
  handleInfinity();
  if (previewVal.length > 1 && !previewVal.includes(")")) {
    previewVal = previewVal.substring(0, previewVal.length - 1);
    currentVal = previewVal;
  } else {
    previewVal = "0";
    currentVal = "0";
    //Handle imaginary result
    if (operationArray.length === 0) {
      clearAllValues();
      var inBox = $("#keyPad_UserInput");
      inBox.val("0");
    }
  }
  updateDisplay();
}

function handleNumber(num) {
  handleInfinity();
  num = num.toString();
  if (
    (currentVal.charAt(currentVal.length - 1) === "i" ||
      previewVal.charAt(previewVal.length - 1) === "i") &&
    num === "i"
  ) {
    return;
  } else if (
    currentVal.charAt(currentVal.length - 1) === "i" ||
    previewVal.charAt(previewVal.length - 1) === "i"
  ) {
    currentVal = "";
    previewVal = "";
    var inBox = $("#keyPad_UserInput");
    inBox.val(previewVal);
  }
  currentOperator = -1;
  if (prevOperator === -1) {
    if (currentVal === "0") {
      currentVal = num;
    } else {
      currentVal += num;
    }
  } else if (prevOperator === 22) {
    let top = getTopStack(operationArray);
    top.pop();
    currentVal = num;
  } else {
    currentVal = num;
  }
  previewVal = currentVal.toString();
  prevOperator = currentOperator;
  updateDisplay();
}

function handleOpenBracket() {
  handleInfinity();
  currentOperator = 21;
  if (prevOperator === -1) {
    currentVal = "";
  } else if (prevOperator === 22 || (prevOperator > 30 && prevOperator < 90)) {
    pushToStack(previewVal || currentVal || "0");
    pushToStack("*");
  }
  const top = getTopStack(operationArray);
  const newGroup = [];
  top.push(newGroup);
  bracketsCount++;
  prevOperator = currentOperator;
  previewVal = "0";
  currentVal = "0";
  updateDisplay();
}

function handleCloseBracket() {
  handleInfinity();
  if (bracketsCount > 0) {
    currentOperator = 22;
    if (currentVal !== "") {
      pushToStack(currentVal);
      currentVal = "";
    } else if (prevOperator > 0) {
      pushToStack(previewVal);
    } else {
      pushToStack(currentVal);
    }
  }

  if (bracketsCount > 0) {
    bracketsCount--;
    // Traverse and find the deepest sub-array to evaluate
    let path = [];
    let stack = operationArray;
    while (Array.isArray(stack[stack.length - 1])) {
      path.push(stack);
      stack = stack[stack.length - 1];
    }

    try {
      if (stack.includes("yroot")) stack = transformYRootExpression(stack);
      if (stack.includes("logxBasey")) stack = transformYLogXExpression(stack);

      let val = evaluateNested(stack).toString();

      if (val.includes("i")) val = "(" + val + ")";

      if (val.substring(0, 1) === "-") {
        val = "(" + val + ")";
      }

      previewVal = val;
      // Replace the evaluated sub-array with its value in parent
      if (path.length > 0) {
        const parent = path[path.length - 1];
        // parent[parent.length - 1] = val;
        parent.pop();
      } else {
        // Only one array in root
        // operationArray = [val];
        operationArray = [];
      }
    } catch (e) {
      previewValue = "Math Error";
    }
  }
  updateDisplay();
  prevOperator = currentOperator;
}

async function handleBinaryOperator(operator) {
  handleInfinity();
  currentOperator = getOperatorVal(operator);

  if (prevOperator > 0 && prevOperator < 21) {
    // override last operator
    const top = getTopStack(operationArray);
    if (prevOperator == 9 || prevOperator == 10) {
      top.pop();
      top.pop();
    }
    top.pop();
  } else {
    pushToStack(currentVal || previewVal || "0");
  }

  const lastEval = await evaluateLastexpression();
  if (lastEval) {
    previewVal = lastEval.toString();
    currentVal = lastEval.toString();
  }

  if (currentOperator == 7) {
    pushToStack("yroot");
  } else if (currentOperator == 8) {
    pushToStack("logxBasey");
  } else if (currentOperator == 9) {
    pushToStack("*");
    pushToStack("0.01");
    pushToStack("*");
  } else if (currentOperator == 5) {
    pushToStack("%");
  } else if (currentOperator == 10) {
    pushToStack("*");
    pushToStack("10");
    pushToStack("^");
  } else {
    pushToStack(operator);
  }

  prevOperator = currentOperator;
  var inBox = $("#keyPad_UserInput");
  inBox.val(previewVal);
  updateDisplay();
}

function handleUnaryOperator(operator) {
  handleInfinity();
  const currentOperator = getOperatorVal(operator); // maps string to internal operator code
  let evaluatedValueOfUnary = 0;
  const x = "(" + (previewVal || currentVal || "0") + ")";

  try {
    switch (currentOperator) {
      case 31: // square (x^2)
        evaluatedValueOfUnary = math.evaluate(`${x} * ${x}`).toString();
        break;
      case 32: // sqrt
        evaluatedValueOfUnary = math.evaluate(`sqrt(${x})`).toString();
        break;
      case 33: // ln
        evaluatedValueOfUnary = math.evaluate(`log(${x})`).toString();
        break;
      case 34: // log (base 10)
        evaluatedValueOfUnary = math.evaluate(`log10(${x})`).toString();
        break;
      case 35: // logXbase2
        evaluatedValueOfUnary = math.evaluate(`log(${x}) / log(2)`).toString();
        break;
      case 36: // powe (e^x)
        evaluatedValueOfUnary = math.evaluate(`exp(${x})`).toString();
        break;
      case 37: // powten (10^x)
        evaluatedValueOfUnary = math.evaluate(`10 ^ ${x}`).toString();
        break;
      case 38: // cube (x^3)
        evaluatedValueOfUnary = math.evaluate(`${x} * ${x} * ${x}`).toString();
        break;
      case 39: // cuberoot
        evaluatedValueOfUnary = nthroot(x, 3);
        break;
      case 40: // abs
        evaluatedValueOfUnary = math.evaluate(`abs(${x})`).toString();
        break;
      case 41: // reciproc (1/x)
        evaluatedValueOfUnary = math.evaluate(`1/(${x})`).toString();
        break;
      case 42: // fact
        evaluatedValueOfUnary = math.evaluate(`(${x})!`).toString();
        break;

      // Trigonometric Functions
      case 51: // sind
        evaluatedValueOfUnary = sinCalc("deg", x);
        break;
      case 52: // sinr
        evaluatedValueOfUnary = sinCalc("rad", x);
        break;
      case 53: // asind
        evaluatedValueOfUnary = sinInvCalc("deg", x);
        break;
      case 54: // asinr
        evaluatedValueOfUnary = sinInvCalc("rad", x);
        break;
      case 55: // cosd
        evaluatedValueOfUnary = cosCalc("deg", x);
        break;
      case 56: // cosr
        evaluatedValueOfUnary = cosCalc("rad", x);
        break;
      case 57: // acosd
        evaluatedValueOfUnary = cosInvCalc("deg", x);
        break;
      case 58: // acosr
        evaluatedValueOfUnary = cosInvCalc("rad", x);
        break;
      case 59: // tand
        evaluatedValueOfUnary = tanCalc("deg", x);
        break;
      case 60: // tanr
        evaluatedValueOfUnary = tanCalc("rad", x);
        break;
      case 61: // atand
        evaluatedValueOfUnary = tanInvCalc("deg", x);
        break;
      case 62: // atanr
        evaluatedValueOfUnary = tanInvCalc("rad", x);
        break;

      // Hyperbolic Functions
      case 63: // sinhd
        evaluatedValueOfUnary = math.evaluate(`sinh(${x})`);
        break;
      case 64: // sinhr
        evaluatedValueOfUnary = math.evaluate(`sinh(${x})`);
        break;
      case 65: // sinh-1d
        evaluatedValueOfUnary = math.evaluate(`asinh(${x})`);
        break;
      case 66: // sinh-1r
        evaluatedValueOfUnary = math.evaluate(`asinh(${x})`);
        break;
      case 67: // coshd
        evaluatedValueOfUnary = math.evaluate(`cosh(${x})`);
        break;
      case 68: // coshr
        evaluatedValueOfUnary = math.evaluate(`cosh(${x})`);
        break;
      case 69: // cosh-1d
        evaluatedValueOfUnary = math.evaluate(`acosh(${x})`);
        break;
      case 70: // cosh-1r
        evaluatedValueOfUnary = math.evaluate(`acosh(${x})`);
        break;
      case 71: // tanhd
        evaluatedValueOfUnary = math.evaluate(`tanh(${x})`);
        break;
      case 72: // tanhr
        evaluatedValueOfUnary = math.evaluate(`tanh(${x})`);
        break;
      case 73: // tanh-1d
        evaluatedValueOfUnary = math.evaluate(`atanh(${x})`);
        break;
      case 74: // tanh-1r
        evaluatedValueOfUnary = math.evaluate(`atanh(${x})`);
        break;

      default:
        evaluatedValueOfUnary = x;
        break;
    }
  } catch {
    evaluatedValueOfUnary = "0";
  }

  evaluatedValueOfUnary = evaluatedValueOfUnary.toString();
  if (evaluatedValueOfUnary.includes("i"))
    evaluatedValueOfUnary = "(" + evaluatedValueOfUnary + ")";

  previewVal = evaluatedValueOfUnary;
  currentVal = "";
  updateDisplay();
  prevOperator = currentOperator;
}

function evaluateLastexpression() {
  handleInfinity();
  let top = getTopStack(operationArray);

  if (top.includes("yroot")) top = transformYRootExpression(top);
  if (top.includes("logxBasey")) top = transformYLogXExpression(top);

  const expr = stackToString(top);
  try {
    let result = math.evaluate(expr).toString();
    if (result.includes("i")) result = "(" + result + ")";

    return result;
  } catch {
    return "Math Error";
  }
}

function evaluateWholeexpression() {
  handleInfinity();

  pushToStack(previewVal || "0");
  //   if (prevOperator < 0) {
  //     if (currentVal !== "") pushToStack(currentVal);
  //     else if (previewVal !== 0) pushToStack(previewVal);
  //     else pushToStack("0");
  //   } else if (prevOperator > 0 && prevOperator < 21) {
  //     if (previewVal !== "") pushToStack(previewVal);
  //     else pushToStack("0");
  //   }

  try {
    if (operationArray.includes("yroot"))
      operationArray = transformYRootExpression(operationArray);

    if (operationArray.includes("logxBasey"))
      operationArray = transformYLogXExpression(operationArray);

    const expr = stackToString(operationArray);

    let result = math.evaluate(expr).toString();

    if (result.includes("i")) result = "(" + result + ")";

    if (result.substring(0, 1) === "-") {
      result = "(" + result + ")";
    }

    previewVal = result;
    operationArray = [];
  } catch (e) {
    let outputArea = $("#keyPad_OutputArea");
    outputArea.val(strMathError);
    calcAuditLog("Calculator ERROR", e.name, e.message);
    // inputEl.value = "Math Error";
  }
  currentVal = "";
  currentOperator = -2;
  prevOperator = -2;
  updateDisplay();
}

function handleMemoryOperator(operator) {
  handleInfinity();
  const memoryOperator = getOperatorVal(operator);
  //Memory Store
  if (memoryOperator === 91) {
    memoryVal = previewVal || currentVal || "0";
    $("#memory").addClass("memoryshow");
    $("#memory").removeClass("memoryhide");
    //    $("#keyPad_MS").addClass("btn-bg");
  }
  //Memory Recall
  else if (memoryOperator === 92) {
    previewVal = memoryVal;
    currentVal = memoryVal;
    prevOperator = -1;
    currentOperator = -1;

    //To update display string
    stackVal1 = 1;
    stackVal2 = 0;

    var inBox = $("#keyPad_UserInput");
    inBox.val(previewVal);
    updateDisplay();
  }
  //Memory Clear
  else if (memoryOperator === 93) {
    memoryVal = "0";
    $("#memory").removeClass("memoryshow");
    $("#memory").addClass("memoryhide");
    //    $("#keyPad_MS").removeClass("btn-bg");
  }
  //Memory Plus
  else if (memoryOperator === 94) {
    memoryVal = math
      .evaluate(`${memoryVal} + ${previewVal || currentVal || "0"}`)
      .toString();
    if (memoryVal.includes("i")) memoryVal = "(" + memoryVal + ")";
  }
  //Memory Minus
  else if (memoryOperator === 95) {
    memoryVal = math
      .evaluate(`${memoryVal} - ${previewVal || currentVal || "0"}`)
      .toString();
    if (memoryVal.includes("i")) memoryVal = "(" + memoryVal + ")";
  }
}

function clearAllValues() {
  operationArray = [];
  currentVal = "";
  currentOperator = -2;
  prevOperator = -2;
  previewVal = "0";
  finalVal = 0;
  bracketsCount = 0;

  //Old Values reset
  var inBox = $("#keyPad_UserInput");
  var inBox1 = $("#keyPad_UserInput1");
  inBox.val(strEmpty);
  displayString = "";
  trigDisplay = "";
  stackArray = [];
  opCodeArray = [];
  openArray = [];
  inBox1.val("");
  stackVal = strEmpty;
  stackVal1 = 1;
  stackVal2 = 0;
  newOpCode = 0;
  opCode = 0;

  updateDisplay();
}

//Round off variable for future reference
//var roundOffToDecimals = 3;
// ***********************************************************************************

/**
 * -----OLD OP Codes values description---------
 | Key   |    Value      |
 |-------|---------------|
 | 0     | Open Brac "(" |
 | 1     | Plus (+)      |
 | 2     | Minus (-)     |
 | 3     | Multi (*)     |
 | 4     | Division (/)  |
 | 5     | Mod ()        |
 | 6     | YpowX ()      |
 | 7     | YrootX ()     |
 | 8     | YlogX ()      |
 | 9     | Exp (e)       |
 | 10    | Bracket Close |
 | 11    | Percent (%)   |
 */

//Rounding of the value for future reference
// function roundoff(operationValue, roundOffToDecimals) {
//   //Converting string to Number/Imaginary
//   const constantOperationValue = math.evaluate(operationValue.toString());
//   const num = math.round(constantOperationValue, roundOffToDecimals);
//   return num.toString();
// }

function calcAuditLog(a, b, c) {
  console.log("AUDIT LOG --> ", " a=", a, " b=", b, " c=", c);
}

function toggleComplex(flag) {
  if (flag) {
    calcAuditLog("Calculator Opened", "Type", "Scientific");
    // $("#keyPad_btnIota").css("display", "none");
    // $("#dummyBtn").css("display", "block");
    // $("#calculatorHead font").text("Scientific Calculator");
  } else {
    calcAuditLog(
      "Calculator Opened",
      "Type",
      "Scientific with Complex Numbers"
    );
    // $("#keyPad_btnIota").css("display", "block");
    // $("#dummyBtn").css("display", "none");
    // $("#calculatorHead font").text("Scientific with Complex Numbers");
  }
}

// ******* MAIN **************************************************************
$(document).ready(function () {
	
	  // for shifting equals button down when MS/ MC is clicked.
	// $('#keyPad_MS').on('click', function () {
	//    $('#keyPad_btnEnter').css('bottom', '3px');
	// });
	  
	 //$('#keyPad_MC').on('click', function () {
		//    $('#keyPad_btnEnter').css('bottom', '13px');
	//  });
	
  math.config({
    predictable: normalScientific,
  });
  toggleComplex(normalScientific);

  updateDisplay();

  $(".keyPad_TextBox1").focus(function () {
    this.blur();
  });
  $(".keyPad_TextBox").focus(function () {
    this.blur();
  });

  $.fn.setCursorPosition = function (pos) {
    this.each(function (index, elem) {
      if (elem.setSelectionRange) {
        elem.setSelectionRange(pos, pos);
      } else if (elem.createTextRange) {
        var range = elem.createTextRange();
        range.collapse(true);
        range.moveEnd("character", pos);
        range.moveStart("character", pos);
        range.select();
      }
    });
    return this;
  };

  $("[class^=keyPad_]").each(function () {
    $(this).click(function () {
      $("#keyPad_UserInput1").setCursorPosition(
        $("#keyPad_UserInput1").val().length
      );
    });
  });

  var inBox = $("#keyPad_UserInput");
  var inBox1 = $("#keyPad_UserInput1");
  $("#keyPad_UserInput").val(strEmpty);

  $("#dr").on("change", "input[name='degree_or_radian']", function () {
    //code snippets
    modeSelected = $("input[name=degree_or_radian]:radio:checked").val();
    calcAuditLog("dr" + "_" + modeSelected, inBox1.val(), inBox.val());
  });

  // ON LOAD ********************************************

  //====================Numeric Keys Input [START]===================================
  $("div#keyPad .keyPad_btnNumeric").click(function () {
    var btnVal = $(this).html();

    var inBox = $("#keyPad_UserInput");
    var inBox1 = $("#keyPad_UserInput1");

    if (
      inBox.val().indexOf("Infinity") > -1 ||
      inBox.val().indexOf(strMathError) > -1
    ) {
      let outputArea = $("#keyPad_OutputArea");
      calcAuditLog(this.id, inBox1.val(), outputArea.val());
      return;
    }

    // clear input box if flag set
    if (boolClear) {
      inBox.val(strEmpty);
      boolClear = false;
    }

    var str = inBox.val();

    // limit the input length
    if (str.length > maxLength) return;

    // prevent duplicate dot entry
    if (
      this.id == "keyPad_btnDot" &&
      str.indexOf(".") >= 0 &&
      inBox1.val() != ""
    ) {
      inBox.val(strEmpty + ".");
      inBox1.val("");
      let outputArea = $("#keyPad_OutputArea");
      calcAuditLog(this.id, inBox1.val(), outputArea.val());
      return;
    } else if (this.id == "keyPad_btnDot" && str.indexOf(".") >= 0) {
      let outputArea = $("#keyPad_OutputArea");
      calcAuditLog(this.id, inBox1.val(), outputArea.val());
      return;
    }
    //preventd duplicate iota
    if (
      (currentVal.charAt(currentVal.length - 1) === "i" ||
        previewVal.charAt(previewVal.length - 1) === "i") &&
      this.id == "keyPad_btnIota"
    ) {
      return;
    }
    // if (
    //   this.id == "keyPad_btnIota" &&
    //   str.indexOf("i") >= 0 &&
    //   inBox1.val() != ""
    // ) {
    //   console.log("sdjhfhwa");

    //   let outputArea = $("#keyPad_OutputArea");
    //   calcAuditLog(this.id, inBox1.val(), outputArea.val());

    //   return;
    // } else if (this.id == "keyPad_btnIota" && str.indexOf("i") >= 0) {
    //   let outputArea = $("#keyPad_OutputArea");
    //   calcAuditLog(this.id, inBox1.val(), outputArea.val());

    //   return;
    // }

    //To prevent numeric entry after iota------------IMP
    if (inBox.val()[inBox.val().length - 1] === "i") return;

    displayCheck();

    handleNumber(btnVal);

    if (str != strEmpty || str.length > 1 || this.id == "keyPad_btnDot") {
      inBox.val(str + btnVal);
      stackVal1 = 1;
    } else {
      inBox.val(btnVal);
      stackVal1 = 1;
    }
    inBox.focus();
    let outputArea = $("#keyPad_OutputArea");
    calcAuditLog(this.id, inBox1.val(), outputArea.val());
  });
  //====================Numeric Keys Input [END]===================================

  // CONST DATA ENTRY *******************************************************
  $(".keyPad_btnConst").click(function () {
    var retVal = strEmpty;
    var inputBox = $("#keyPad_UserInput");
    var inBox1 = $("#keyPad_UserInput1");
    if (
      inBox.val().indexOf("Infinity") > -1 ||
      inBox.val().indexOf(strMathError) > -1
    ) {
      let outputArea = $("#keyPad_OutputArea");
      calcAuditLog(this.id, inBox1.val(), outputArea.val());

      return;
    }
    switch (this.id) {
      // PI
      case "keyPad_btnPi":
        previewVal = "0";
        currentVal = "0";
        handleNumber(math.PI);
        break;
      // e
      case "keyPad_btnE":
        previewVal = "0";
        currentVal = "0";
        handleNumber(math.E);
        break;
      default:
        break;
    }

    retVal = previewVal;

    displayCheck();
    stackVal1 = 1;
    boolClear = true;

    if (retVal != strEmpty) {
      $("#keyPad_UserInput").val(retVal);
      //inBox1.val(inBox1Read + " " + retVal);
    } else {
      $("#keyPad_UserInput").val(retVal);
      //inBox1.val(inBox1Read + " " + retVal);
    }
    inputBox.focus();
    let outputArea = $("#keyPad_OutputArea");
    calcAuditLog(this.id, inBox1.val(), outputArea.val());
  });
  // BINARY OPERATION KEY ***************************************************
  $("div#keyPad .keyPad_btnBinaryOp").click(async function () {
    if (
      inBox.val().indexOf("Infinity") > -1 ||
      inBox.val().indexOf(strMathError) > -1
    ) {
      let outputArea = $("#keyPad_OutputArea");
      calcAuditLog(this.id, inBox1.val(), outputArea.val());

      clearAllValues();
      return;
    }
    switch (this.id) {
      case "keyPad_btnPlus":
        stackCheck($("#" + this.id).text());
        await handleBinaryOperator("+");
        newOpCode = 1;
        if (
          opCode == 10 &&
          stackArray.length > 0 &&
          stackArray[stackArray.length - 1] == "{"
        )
          opcodeChange();
        operation();
        stackVal1 = 0;
        break;
      case "keyPad_btnMinus":
        stackCheck($("#" + this.id).text());
        await handleBinaryOperator("-");
        newOpCode = 2;

        if (
          opCode == 10 &&
          stackArray.length > 0 &&
          stackArray[stackArray.length - 1] == "{"
        )
          opcodeChange();
        operation();
        stackVal1 = 0;
        break;
      case "keyPad_btnMult":
        stackCheck($("#" + this.id).text());
        await handleBinaryOperator("*");
        newOpCode = 3;
        if (opCode == 1 || opCode == 2) {
          opcodeChange();
        }
        if (opCode == 10) {
          if (
            opCodeArray[opCodeArray.length - 1] < 3 ||
            (stackArray.length > 0 && stackArray[stackArray.length - 1] == "{")
          ) {
            opcodeChange();
          } else {
            operation();
          }
        }
        stackVal1 = 0;
        break;
      case "keyPad_btnDiv":
        stackCheck($("#" + this.id).text());
        await handleBinaryOperator("/");
        newOpCode = 4;
        //new change
        // if (opCode < 4 && opCode) {
        //   opcodeChange();
        // }
        if (opCode == 10) {
          if (
            opCodeArray[opCodeArray.length - 1] < 4 ||
            stackVal1 == 5 ||
            (stackArray.length > 0 && stackArray[stackArray.length - 1] == "{")
          ) {
            opcodeChange();
          } else {
            operation();
          }
        }
        stackVal1 = 0;
        break;
      case "keyPad_perc":
        stackCheck("%");
        await handleBinaryOperator("%");
        newOpCode = 11;
        if (opCode < 6 && opCode) {
          opcodeChange();
        }
        if (opCode == 10) {
          if (
            opCodeArray[opCodeArray.length - 1] < 6 ||
            (stackArray.length > 0 && stackArray[stackArray.length - 1] == "{")
          ) {
            opcodeChange();
          } else {
            operation();
          }
        }
        stackVal1 = 0;
        break;
      case "keyPad_EXP":
        stackCheck("e+0");
        await handleBinaryOperator("e+0");
        newOpCode = 9;
        if (opCode < 6 && opCode) {
          opcodeChange();
        }
        if (opCode == 10) {
          if (
            opCodeArray[opCodeArray.length - 1] < 6 ||
            (stackArray.length > 0 && stackArray[stackArray.length - 1] == "{")
          ) {
            opcodeChange();
          } else {
            operation();
          }
        }
        stackVal1 = 1;
        stackVal2 = 7;
        break;
      case "keyPad_btnYpowX":
        stackCheck("^");
        await handleBinaryOperator("^");
        newOpCode = 6;
        if (opCode < 6 && opCode) {
          opcodeChange();
        }
        if (opCode == 10) {
          if (
            opCodeArray[opCodeArray.length - 1] < 6 ||
            (stackArray.length > 0 && stackArray[stackArray.length - 1] == "{")
          ) {
            opcodeChange();
          } else {
            operation();
          }
        }
        stackVal1 = 0;
        break;
      case "keyPad_btnMod":
        stackCheck($("#" + this.id).text());
        await handleBinaryOperator("mod");
        newOpCode = 5;
        if (opCode == 1 || opCode == 2) {
          opcodeChange();
        }
        if (opCode == 10) {
          if (
            opCodeArray[opCodeArray.length - 1] == 1 ||
            2 ||
            (stackArray.length > 0 && stackArray[stackArray.length - 1] == "{")
          ) {
            opcodeChange();
          } else {
            operation();
          }
        }
        stackVal1 = 0;
        break;
      case "keyPad_btnYrootX":
        stackCheck("yroot");
        await handleBinaryOperator("yroot");
        newOpCode = 7;
        if (opCode < 6 && opCode) {
          opcodeChange();
        }
        if (opCode == 10) {
          if (
            opCodeArray[opCodeArray.length - 1] < 6 ||
            (stackArray.length > 0 && stackArray[stackArray.length - 1] == "{")
          ) {
            opcodeChange();
          } else {
            operation();
          }
        }
        stackVal1 = 0;
        break;
      case "keyPad_btnYlogX":
        stackCheck("logxBasey");
        await handleBinaryOperator("logxBasey");
        newOpCode = 8;
        if (opCode == 1 || opCode == 2) {
          opcodeChange();
        }
        if (opCode == 10) {
          if (
            opCodeArray[opCodeArray.length - 1] < 3 ||
            (stackArray.length > 0 && stackArray[stackArray.length - 1] == "{")
          ) {
            opcodeChange();
          } else {
            operation();
          }
        }
        stackVal1 = 0;
        break;
      case "keyPad_btnOpen":
        if (prevOperator === -2) {
          displayString = $("#" + this.id).text();
        } else {
          displayString = inBox1.val() + $("#" + this.id).text();
        }
        handleOpenBracket();
        newOpCode = 0;
        inBox.val(0); // setting the inbox value with 0 after inserting paranthesis)
        if (opCode != 0) {
          opcodeChange();
        }
        openArray.push("{");
        stackArray.push("{");
        stackVal1 = 1;
        //New code
        stackVal2 = 0;
        break;
      case "keyPad_btnClose":
        if (stackVal2 == 6) {
          stackVal = inBox.val();
          displayString = inBox1.val() + inBox.val() + $("#" + this.id).text();
        } else if (newOpCode != 10) {
          if (stackVal1 != 3) {
            if (
              inBox1.val().indexOf("e+0") > -1 &&
              inBox.val().indexOf("-") > -1
            )
              inBox1.val(inBox1.val().replace("e+0", "e"));
            else if (inBox1.val().indexOf("e+0") > -1)
              inBox1.val(inBox1.val().replace("e+0", "e+"));
            displayString =
              inBox1.val() + inBox.val() + $("#" + this.id).text();
          } else {
            if (prevOperator === -1) {
              displayString =
                inBox1.val() + inBox.val() + $("#" + this.id).text();
            } else {
              displayString = inBox1.val() + $("#" + this.id).text();
            }
          }
        } else {
          displayString = inBox1.val() + $("#" + this.id).text();
        }
        handleCloseBracket();

        if (openArray[0]) {
          openArray.pop();
          newOpCode = 10;

          while (opCodeArray[0] || openArray[0]) {
            if (stackArray[stackArray.length - 1] == "{") {
              stackArray.pop();
              break;
            } else {
              oscBinaryOperation();
              stackVal = stackArray[stackArray.length - 1];
              if (stackVal == "{") {
                stackArray.pop();
                opCode = 0;
                break;
              }
              stackArray.pop();
              opCode = opCodeArray[opCodeArray.length - 1];
              opCodeArray.pop();
              if (
                !opCodeArray[0] &&
                stackArray.length > 0 &&
                stackArray[stackArray.length - 1] != "{"
              ) {
                //if length is 0 then below statement gives error...
                stackVal = stackArray[stackArray.length - 1];
              }
            }
          }
        } else {
          return;
        }
        stackVal2 = 1;
        stackVal1 = 5;
        break;
      case "keyPad_btnPercent":
        if (opCode == 1 || opCode == 2) {
          inBox.val((stackVal * inBox.val()) / 100);
        } else if (opCode == 3 || opCode == 4) {
          inBox.val(inBox.val() / 100);
        } else return;
        await handleBinaryOperator("%");
        break;
      default:
        break;
    }
    if (opCode) {
      oscBinaryOperation();
    } else {
      stackVal = inBox.val();
      boolClear = true;
    }
    opCode = newOpCode;
    inBox.focus();
    inBox1.val(displayString.trim());

    let outputArea = $("#keyPad_OutputArea");
    calcAuditLog(this.id, inBox1.val(), outputArea.val());
  });

  // MEMORY OPERATIONS *******************************************************
  $(".keyPad_btnMemoryOp").click(function () {
    var inputBox = $("#keyPad_UserInput");
    //var x = parseFloat(inputBox.val());
    var x = inputBox.val();
    if (inputBox.val() == "") {
      x = 0;
    }
    var retVal = 0;
    if (
      inBox.val().indexOf("Infinity") > -1 ||
      inBox.val().indexOf(strMathError) > -1
    ) {
      let outputArea = $("#keyPad_OutputArea");
      calcAuditLog(this.id, inBox1.val(), outputArea.val());

      return;
    }
    switch (this.id) {
      case "keyPad_MS":
        handleMemoryOperator("MS");
        break;
      case "keyPad_M+":
        handleMemoryOperator("M+");
        break;
      case "keyPad_MR":
        handleMemoryOperator("MR");
        break;
      case "keyPad_MC":
        handleMemoryOperator("MC");
        break;
      case "keyPad_M-":
        handleMemoryOperator("M-");
        break;
      default:
        break;
    }

    boolClear = true;
    inputBox.focus();
    let outputArea = $("#keyPad_OutputArea");
    calcAuditLog(this.id, inBox1.val(), outputArea.val());
  });

  //Used to update the display string
  function stackCheck(text) {
    text = text.trim();
    if (stackVal1 == 2) {
      inBox1.val("");
    }
    if (stackVal1 == 0) {
      opCode = 0;
      var x = 1;
      switch (newOpCode) {
        case 5:
          x = 3;
          break;
        case 7:
          x = 5;
          break;
        case 8:
          x = 9;
          break;
        default:
          break;
      }
      if (!(inBox1.val().indexOf("e+") > -1))
        inBox1.val(inBox1.val().substring(0, inBox1.val().length - x));
      stackVal2 = 2;
    }

    if (stackVal1 == 5 || stackVal2 == 2) {
      stackVal2 = 0;
      displayString = inBox1.val() + text;
    } else {
      if (inBox1.val().indexOf("e+0") > -1 && inBox.val().indexOf("-") > -1)
        inBox1.val(inBox1.val().replace("e+0", "e"));
      else if (inBox1.val().indexOf("e+0") > -1)
        inBox1.val(inBox1.val().replace("e+0", "e+"));
      displayString = inBox1.val() + inBox.val() + text;
    }
  }

  function operation() {
    while (opCodeArray[0] && opCode) {
      if (opCode == 10) {
        opCode = opCodeArray[opCodeArray.length - 1];
        stackVal = stackArray[stackArray.length - 1];
        if (newOpCode == 1 || newOpCode == 2 || newOpCode <= opCode) {
          opCodeArray.pop();
          stackArray.pop();
        } else {
          opCode = 0;
          break;
        }
      } else if (stackArray[stackArray.length - 1] == "{") {
        break;
      } else {
        oscBinaryOperation();
        stackVal = stackArray[stackArray.length - 1];
        if (stackVal == "{") {
          opCode = 0;
          break;
        }
        opCode = opCodeArray[opCodeArray.length - 1];
        if (newOpCode == 1 || newOpCode == 2 || newOpCode <= opCode) {
          opCodeArray.pop();
          stackArray.pop();
        } else {
          opCode = 0;
          break;
        }
        if (
          !opCodeArray[0] &&
          stackArray.length > 0 &&
          stackArray[stackArray.length - 1] != "{"
        ) {
          //if length is 0 then below statement gives error...
          stackVal = stackArray[stackArray.length - 1];
        }
      }
    }
  }
  function opcodeChange() {
    if (opCode != 10 && opCode != 0) {
      opCodeArray.push(opCode);
      stackArray.push(stackVal);
    }
    if (opCode == 0) {
      stackArray.push(stackVal);
    }
    opCode = 0;
  }

  function displayCheck() {
    switch (stackVal1) {
      case 2:
        inBox1.val("");
        break;
      case 3:
        inBox1.val(
          inBox1.val().substring(0, inBox1.val().length - trigDisplay.length)
        );
        stackVal2 = 4;
        break;
      case 5:
        var string = "";
        for (var i = openArray.length; i >= 0; i--) {
          string =
            string + displayString.substring(0, displayString.indexOf("(") + 1);
          displayString = displayString.replace(string, "");
        }
        displayString = string.substring(0, string.lastIndexOf("("));
        inBox1.val(displayString);
        stackVal2 = 6;
        break;
      default:
        break;
    }
    updateDisplay();
  }

  // BINARY COMPUTATION *****************************************************

  function oscBinaryOperation() {
    var inBox = $("#keyPad_UserInput");
    var x2 = inBox.val();

    // retVal = stackVal;
    retVal = previewVal;

    //Round off for future reference
    // stackVal = roundoff(stackVal, roundOffToDecimals);
    // stackVal = "(" + previewVal + ")";
    stackVal = previewVal;
    //inBox.val(retVal);

    //Using stackval instead of retval so that there can be paranthesis to group the answer--------
    inBox.val(stackVal);
    boolClear = true;
    trig = 0;
    inBox.focus();
  }
  // UNARY OPERATIONS *******************************************************
  $(".keyPad_btnUnaryOp").click(function () {
    var inputBox = $("#keyPad_UserInput");

    var retVal = oscError;
    if (
      inBox.val().indexOf("Infinity") > -1 ||
      inBox.val().indexOf(strMathError) > -1
    ) {
      let outputArea = $("#keyPad_OutputArea");
      calcAuditLog(this.id, inBox1.val(), outputArea.val());
      clearAllValues();
      return;
    }
    var x = inputBox.val();
    switch (this.id) {
      // +/-
      case "keyPad_btnInverseSign":
        handleInverse();
        trig = 1;
        stackVal2 = 3;
        break;
      // 1/X
      case "keyPad_btnInverse":
        displayTrignometric("reciproc", x);
        handleUnaryOperator("reciproc");
        break;
      // X^2
      case "keyPad_btnSquare":
        displayTrignometric("sqr", x);
        handleUnaryOperator("sqr");
        break;
      // SQRT(X)
      case "keyPad_btnSquareRoot":
        displayTrignometric("sqrt", x);
        handleUnaryOperator("sqrt");
        break;
      // X^3
      case "keyPad_btnCube":
        displayTrignometric("cube", x);
        handleUnaryOperator("cube");
        break;
      // POW (X, 1/3)
      case "keyPad_btnCubeRoot":
        displayTrignometric("cuberoot", x);
        handleUnaryOperator("cuberoot");
        break;
      // NATURAL LOG
      case "keyPad_btnLn":
        displayTrignometric($("#" + this.id).text(), x);
        handleUnaryOperator("ln");
        break;
      // LOG BASE 10
      case "keyPad_btnLg":
        displayTrignometric($("#" + this.id).text(), x);
        handleUnaryOperator("log");
        break;
      // E^(X)
      case "keyPad_btnExp":
        displayTrignometric("powe", x);
        handleUnaryOperator("powe");
        break;
      // SIN
      case "keyPad_btnSin":
        modeText($("#" + this.id).text(), x);
        handleUnaryOperator(getTrignometricString("sin"));
        trig = 1;
        break;
      // COS
      case "keyPad_btnCosin":
        modeText($("#" + this.id).text(), x);
        handleUnaryOperator(getTrignometricString("cos"));
        trig = 1;
        break;
      // TAN
      case "keyPad_btnTg":
        modeText($("#" + this.id).text(), x);
        handleUnaryOperator(getTrignometricString("tan"));
        trig = 1;
        break;

      //Factorial
      case "keyPad_btnFact":
        displayTrignometric("fact", x);
        handleUnaryOperator("fact");
        break;

      //10^x
      case "keyPad_btn10X":
        displayTrignometric("powten", x);
        handleUnaryOperator("powten");
        break;

      //AsinH
      case "keyPad_btnAsinH":
        modeText($("#" + this.id).text(), x);
        handleUnaryOperator(getTrignometricString("sinh-1"));
        break;

      //AcosH
      case "keyPad_btnAcosH":
        modeText($("#" + this.id).text(), x);
        handleUnaryOperator(getTrignometricString("cosh-1"));
        break;

      //AtanH
      case "keyPad_btnAtanH":
        modeText($("#" + this.id).text(), x);
        handleUnaryOperator(getTrignometricString("tanh-1"));
        break;

      //Absolute |x|
      case "keyPad_btnAbs":
        displayTrignometric("abs", x);
        handleUnaryOperator("abs");
        break;

      //Log Base 2
      case "keyPad_btnLogBase2":
        displayTrignometric("logXbase2", x);
        handleUnaryOperator("logXbase2");
        break;

      // Arcsin
      case "keyPad_btnAsin":
        modeText("asin", x);
        handleUnaryOperator(getTrignometricString("asin"));
        trig = 1;
        break;
      // Arccos
      case "keyPad_btnAcos":
        modeText("acos", x);
        handleUnaryOperator(getTrignometricString("acos"));
        trig = 1;
        break;
      // Arctag
      case "keyPad_btnAtan":
        modeText("atan", x);
        handleUnaryOperator(getTrignometricString("atan"));
        trig = 1;
        break;
      // sinh
      case "keyPad_btnSinH":
        modeText($("#" + this.id).text(), x);
        handleUnaryOperator(getTrignometricString("sinh"));
        break;
      // cosh
      case "keyPad_btnCosinH":
        modeText($("#" + this.id).text(), x);
        handleUnaryOperator(getTrignometricString("cosh"));
        break;
      // coth
      case "keyPad_btnTgH":
        modeText($("#" + this.id).text(), x);
        handleUnaryOperator(getTrignometricString("tanh"));
        break;
      default:
        break;
    }

    //New code
    retVal = previewVal || currentVal || "0";

    if (stackVal2 == 1) {
      stackVal = retVal;
    }
    if (stackVal2 != 3) {
      stackVal2 = 2;
    }
    stackVal1 = 3;
    boolClear = true;

    //Round off for future reference
    // retVal = roundoff(retVal, roundOffToDecimals);

    if (retVal == -0) retVal = 0;
    inputBox.val(retVal);
    trig = 0;
    inBox1.val(displayString);
    inputBox.focus();
    let outputArea = $("#keyPad_OutputArea");
    calcAuditLog(this.id, inBox1.val(), outputArea.val());
  });

  function modeText(text, x) {
    var mode = "d";
    if (modeSelected != "deg") {
      mode = "r";
    }
    displayTrignometric(text + mode, x);
  }

  function indexOfLastOpeningBracket(expression) {
    const stack = [];
    let lastOpeningIndex = -1;

    for (let index = 0; index < expression.length; index++) {
      const char = expression[index];
      if (char === "(") {
        stack.push(index);
      } else if (char === ")") {
        if (stack.length > 0) {
          lastOpeningIndex = stack.pop();
        }
      }
    }

    return lastOpeningIndex;
  }

  function displayTrignometric(text, x) {
    if (stackVal2 == 1) {
      var string = "";

      const lastIndex = indexOfLastOpeningBracket(displayString);
      string = string + displayString.substring(lastIndex);
      displayString = displayString.replace(string, "");

      // for (var i = openArray.length; i >= 0; i--) {
      //   string =
      //     string +
      //     displayString.substring(0, displayString.lastIndexOf("(") + 1);
      //   displayString = displayString.replace(string, "");
      // }
      // displayString = string.substring(0, string.lastIndexOf("("));
      trigDisplay = text + "(" + x + ")";
    }
    if (stackVal2 == 2 || stackVal1 == 3) {
      if (stackVal2 == 3) {
        trigDisplay = text + "(" + x + ")";
        stackVal2 = 2;
      } else {
        displayString = displayString.replace(trigDisplay, "");
        trigDisplay = text + "(" + trigDisplay + ")";
      }
    } else {
      if (stackVal2 == 4) {
        displayString = "";
      }
      trigDisplay = text + "(" + x + ")";
    }
    displayString = displayString + trigDisplay;
  }

  //Function to add closing brackets for incomplete opening brackets
  function completeBrackets(s) {
    // Initialize a counter for open brackets
    let openCount = 0;

    // Iterate through each character in the string
    for (let char of s) {
      // Increment the counter for each opening bracket
      if (char === "(") {
        openCount++;
      }
      // Decrement the counter for each closing bracket
      else if (char === ")") {
        openCount--;
      }
    }

    // If there are unmatched opening brackets, add the necessary closing brackets
    if (openCount > 0) {
      s += ")".repeat(openCount);
    }

    return s;
  }

  // ************************************************************************
  // COMMAND aS: BACKSPACE, CLEAR AND ALL CLEAR
  $("div#keyPad .keyPad_btnCommand").click(function () {
    var inBox = $("#keyPad_UserInput");
    var inBox1 = $("#keyPad_UserInput1");
    var outputBox = $("#keyPad_OutputArea");
    var i = 0;
    var j = 0;
    // var strInput = inBox.val();
    var strInput = outputBox.val();
    switch (this.id) {
      // on enter calculate the result, clear opCode
      case "keyPad_btnEnter":
        evaluateWholeexpression();

        if (
          inBox.val().indexOf("Infinity") > -1 ||
          inBox.val().indexOf(strMathError) > -1
        ) {
          let outputArea = $("#keyPad_OutputArea");
          calcAuditLog(this.id, inBox1.val(), outputArea.val());
          return;
        }
        while (opCode || opCodeArray[0]) {
          if (stackArray[stackArray.length - 1] == "{") {
            stackArray.pop();
          }
          oscBinaryOperation();
          stackVal = stackArray[stackArray.length - 1];
          opCode = opCodeArray[opCodeArray.length - 1];
          stackArray.pop();
          opCodeArray.pop();
        }
        opCode = 0;
        inBox.focus();
        displayString = "";
        trigDisplay = "";
        stackVal = strEmpty;
        openArray = [];
        if (stackVal1 != 2) {
          if (stackVal1 == 3 || stackVal2 == 1) {
            if (stackVal2 != 3) strInput = "";
          }
          if (newOpCode == 9) {
            if (strInput.indexOf("-") > -1) {
              inBox1.val(
                inBox1.val().substring(0, inBox1.val().lastIndexOf("+"))
              );
            } else {
              inBox1.val(inBox1.val().replace("e+0", "e+"));
            }
          }

          //Completes the incomplete brackets
          let finalStr = inBox1.val() + strInput;
          finalStr = completeBrackets(finalStr);
          inBox1.val(finalStr);
        }
        stackVal1 = 2;
        newOpCode = 0;
        stackVal2 = 0;
        stackArray = [];
        opCodeArray = [];
        updateDisplay();
        let outputArea = $("#keyPad_OutputArea");
        calcAuditLog(this.id, inBox1.val(), outputArea.val());
        return;
      // clear the last char if input box is not empty
      case "keyPad_btnBack":
        if (stackVal1 == 1 || stackVal2 == 3) {
          if (strInput.length > 1) {
            if (
              inBox.val().indexOf("Infinity") > -1 ||
              inBox.val().indexOf(strMathError) > -1
            ) {
              let outputArea = $("#keyPad_OutputArea");
              calcAuditLog(this.id, inBox1.val(), outputArea.val());

              return;
            }
            inBox.val(strInput.substring(0, strInput.length - 1));
            if (inBox.val() == "-") inBox.val("0");
          } else {
            inBox.val("0");
          }
        }
        handleBackspace();
        break;
      // clear all
      case "keyPad_btnAllClr":
        clearAllValues();
        break;
      default:
        break;
    }
    let outputArea = $("#keyPad_OutputArea");
    calcAuditLog(this.id, inBox1.val(), outputArea.val());
  });

});
// ***********************************************************************************
