// Simple Function to be added to the end of task by appModule.js so that each time task can be updated while runing execution
const consoleLog = async function (arguments) {
  console.log(`------------------`);
  console.log(`the arguments are :`);
  console.log(arguments);
  console.log(`------------------`);
};
const endDevFunction = async function () {
  console.log(`---END---`);
  throw new Error("Implemented Error for testing purposes.");
};

// === Interface ===
const catchAsync = require("../utils/catchAsync.js");
module.exports = {
  consoleLog: catchAsync(consoleLog),
  endDevFunction: catchAsync(endDevFunction),
};
