const fs = require("fs-extra");
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

const printNwriteThis = async function () {
  console.log(`=============================================================================================================`);
  // console.log(this);
  console.log(`this written to the file.`);

  await fs.writeFile("./data/thisWritten.json", JSON.stringify(this));

  console.log(`=============================================================================================================`);
};
// === Interface ===
const catchAsync = require("../utils/catchAsync.js");
module.exports = {
  consoleLog: catchAsync(consoleLog),
  endDevFunction: catchAsync(endDevFunction),
  printNwriteThis: catchAsync(printNwriteThis),
};
