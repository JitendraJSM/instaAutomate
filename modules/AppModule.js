/* Notes:- 
1. API functions & data will be stored in app.db
2. automation data will be stored in app.state
3. Browser fuction will be stored in app.browserFunctions
4. properties of actions / functions will have this preference as below:
    - if defined in task.json file then it will be used
    - if defined in that action's / function's file then it will be used
    - if not defined on both places then it will be undefined
*/

// === Base Imports ===
const Monitor = require("./MonitorModule.js");
const executeAction = require("./appExecutor.js");
const appLoggerInit = require("../functionsLibrary/appLogger.js");
const utils = require("../utils/utils.js");
const EventEmitter = require("events");

// === Functions Library Imports ===
const chrome = require("../functionsLibrary/chrome.js");
const devOrTest = require("../functionsLibrary/devOrTest.js");
const instaAuto = require("../functionsLibrary/instaAuto.js");

class App extends EventEmitter {
  constructor() {
    super();
    // == functionsLibraries ==
    this.utils = utils;
    this.chrome = chrome;
    this.devOrTest = devOrTest;
    this.instaAuto = instaAuto;

    // == Modules ==
    this.monitor = new Monitor();
    this.appLogger = {};

    // == Automation data ==
    this.actionList = [];
    this.currentActionIndex = 0;
    this.errorHandler = null;

    // Add shared state object
    this.state = {};
    // console.log(`Your Automation-App (i.e. app) Instanciated.`);
  }

  async init() {
    // Initialize app components
    console.log(`App initialized.`);
  }

  next(error) {
    // console.log(this);
    if (error) {
      // console.log(`The action called ${this.actionList[this.currentActionIndex].callback.name} failed.`);

      if (this.errorHandler == null) {
        console.log(
          `Error Handler is not defined. Please define as: app.addGlobalErrorHandler(error)`
        );
        // console.log(error);
      } else this.errorHandler(error);
    } else if (this.currentActionIndex < this.actionList.length) {
      this.currentActionIndex++;
    }
  }

  async run(task) {
    // this.state.profileTarget = 2;
    // Handle both single task and array of tasks
    this.task = Array.isArray(task) ? task : [task];

    if (process.env.ENVIRONMENT === "development") {
      this.task.push({
        parentModuleName: "devOrTest",
        actionName: "endDevFunction",
      });
    }

    if (this.task.log !== false) appLoggerInit.call(this);

    // Initialize task index
    this.currentActionIndex = 0;

    // Execute tasks while we have valid index
    while (
      this.currentActionIndex >= 0 &&
      this.currentActionIndex < this.task.length
    ) {
      this.currentAction = this.task[this.currentActionIndex];
      // console.log(
      //   `before executing the action: ${this.currentAction.actionName} the currentActionIndex is: ${this.currentActionIndex}`
      // );
      await executeAction.call(this, this.currentAction);
      // console.log(
      //   `After executing the action the currentActionIndex is: ${this.currentActionIndex}`
      // );

      // Default behavior: move to next task
      this.currentActionIndex++;

      // You can add custom flow control here, for example:
      // if (someCondition) this.currentActionIndex--; // Go back
      // if (anotherCondition) this.currentActionIndex += 2; // Skip next task
    }

    console.log(`In the end app.state is as:`);
    console.log(this.state);

    // Logging the state in the end
    this.appLogger.logState();
  }

  async stop() {
    // Cleanup and stop the application
  }

  addAction(callback, ...args) {
    // Add metadata to control state storage
    const shouldStoreState = callback.storeState !== false;

    // Wrap the callback with logging functionality
    const wrappedCallback = async (...callbackArgs) => {
      const actionName = callback.name || "anonymous";
      try {
        const result = await callback.call(this, ...callbackArgs);
        await utils.log(`Action '${actionName}' completed successfully`);
        // Only return result if it should be stored in state
        return shouldStoreState ? result : undefined;
      } catch (error) {
        await utils.log(
          `Action '${actionName}' failed with error: ${error.message}`
        );
        throw error;
      }
    };

    // Add an action to the actionList
    this.actionList.push({ args, callback: wrappedCallback });
  }

  addGlobalErrorHandler(handlerFunction) {
    if (typeof handlerFunction !== "function") {
      throw new Error("Error handlerFunction must be a function");
    }
    this.errorHandler = handlerFunction;
  }
}
module.exports = App;
