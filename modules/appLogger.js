const fs = require("fs");
const path = require("path");

// === Interface ===
module.exports = appLoggerInit;
function appLoggerInit() {
  function _createLogFile() {
    const timestamp = _getFormattedTimestamp();
    const logDir = path.join(process.cwd(), "data", "logs");

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    return path.join(logDir, `${timestamp}.txt`);
  }
  function _writeInitialContent() {
    const timestamp = _getFormattedTimestamp();
    fs.writeFileSync(this.state.logFilePath, `${timestamp}\n    Task-1: ${this.task.taskName}\n`);
    this.appLogger.logTask();
  }
  this.appLogger.logMSG = logMSG.bind(this);
  this.appLogger.logLineBreak = logLineBreak.bind(this);
  this.appLogger.logError = logError.bind(this);
  this.appLogger.logTask = logTask.bind(this);
  this.appLogger.logAction = logAction.bind(this);
  this.appLogger.logState = logState.bind(this);
  this.appLogger.logTaskResult = logTaskResult.bind(this);

  this.state.startTime = Date.now();
  this.state.logFilePath = _createLogFile();
  _writeInitialContent.call(this);
}

function _getFormattedTimestamp(timestampDateObject) {
  timestampDateObject ||= new Date();
  const dd = String(timestampDateObject.getDate()).padStart(2, "0");
  const mm = String(timestampDateObject.getMonth() + 1).padStart(2, "0");
  const yy = String(timestampDateObject.getFullYear()).slice(-2);
  const HH = String(timestampDateObject.getHours()).padStart(2, "0");
  const MM = String(timestampDateObject.getMinutes()).padStart(2, "0");
  const SS = String(timestampDateObject.getSeconds()).padStart(2, "0");

  return `${dd}-${mm}-${yy} ${HH}-${MM}-${SS}`;
}

function _getExecutionTime() {
  const totalSeconds = Math.floor((Date.now() - this.state.startTime) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")} minutes & ${String(seconds).padStart(2, "0")} seconds`;
}

function logMSG(message) {
  if (!this.state.logFilePath) return;
  fs.appendFileSync(this.state.logFilePath, `${message}\n`);
}
function logLineBreak() {
  let lineBreak = `===================================================================================`;
  this.appLogger.logMSG(lineBreak);
}
function logError(message, error) {
  if (!this.state.logFilePath) return;
  const errorMessage = `${message}\nError: ${error?.message}\n`;
  fs.appendFileSync(this.state.logFilePath, errorMessage);
}

function logTask() {
  if (!this.state.logFilePath) return;
  fs.appendFileSync(this.state.logFilePath, JSON.stringify(this.task, null, 2) + "\n\n");
  this.appLogger.logLineBreak();
}

function logAction() {
  if (!this.state.logFilePath) return;
  fs.appendFileSync(this.state.logFilePath, JSON.stringify(this.currentAction, null, 2) + "\n\n");
  this.appLogger.logLineBreak();
}

function logState() {
  fs.appendFileSync(this.state.logFilePath, JSON.stringify(this.state, null, 2) + "\n\n");
  this.appLogger.logLineBreak();
}

function logTaskResult(status = "success") {
  if (!this.state.logFilePath) return;
  const executionTime = _getExecutionTime();
  let resultMessage = "";

  switch (status.toLowerCase()) {
    case "error":
      resultMessage = "--------- Failed Execution ---------";
      break;
    case "terminated":
      resultMessage = "--------- Terminated Execution ---------";
      break;
    default:
      resultMessage = "--------- Successful Execution ---------";
  }

  fs.appendFileSync(this.state.logFilePath, `\n${executionTime}\n${resultMessage}\n`);
}
