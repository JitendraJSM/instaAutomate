class Monitor {
  constructor() {
    this.pollingTasks = {};
  }
  pollingTaskNameGenerator(functionName) {
    if (!functionName) return `anonymous_${Date.now()}`;

    let existingCount = Object.keys(this.pollingTasks).filter((taskName) =>
      taskName.startsWith(`${functionName}_`)
    ).length;

    return `${functionName}_${existingCount + 1}`;
  }

  robustPolling(func, options = {}, ...args) {
    const {
      maxAttempts = 30,
      intervalMs = 1000,
      timeoutMs = 30000,
      retryCondition = () => true,
      rejectOnEnd = true,
      infintiePolling = false,
      waitForFunctionCompletion = false,
    } = options;

    let pollingTaskName = this.pollingTaskNameGenerator(func.name);
    let attempts = 0;
    const startTime = Date.now();
    let isRunning = false;

    const pollingPromise = new Promise((resolve, reject) => {
      const intervalFun = setInterval(async () => {
        // Skip this iteration if previous execution hasn't finished and waitForFunctionCompletion is true
        if (waitForFunctionCompletion && isRunning) {
          return;
        }

        attempts++;
        isRunning = true;

        try {
          const result = await func(...args);

          if (result && retryCondition(result)) {
            clearInterval(intervalFun);
            delete this.pollingTasks[pollingTaskName];
            resolve(result);
            return;
          }
        } catch (err) {
          const errMSG = err.message || "Error msg not defined";
          console.log(
            `Task ${pollingTaskName} - Attempt ${attempts} failed with error:`,
            errMSG
          );
        } finally {
          isRunning = false;
        }

        const shouldStop =
          !infintiePolling &&
          (attempts >= maxAttempts || Date.now() - startTime >= timeoutMs);

        if (shouldStop) {
          clearInterval(intervalFun);
          delete this.pollingTasks[pollingTaskName];
          let endMSG = `Task ${pollingTaskName} failed after ${attempts} attempts.`;
          if (rejectOnEnd) {
            reject(endMSG);
          } else {
            console.log(`Resolving with null, But ${endMSG}`);
            resolve(null);
          }
        }
      }, intervalMs);

      const controller = {
        intervalFun,
        stop: () => {
          clearInterval(intervalFun);
          delete this.pollingTasks[pollingTaskName];
          resolve({ pollingTaskName, stoppedNotResolved: true });
        },
      };
      this.pollingTasks[pollingTaskName] = controller;
    });
    pollingPromise.pollingTaskName = pollingTaskName;
    pollingPromise.stop = () => this.pollingTasks[pollingTaskName]?.stop();
    return pollingPromise;
  }

  stopAll() {
    Object.values(this.pollingTasks).forEach((controller) => {
      controller.stop();
    });
  }

  getActivePollings() {
    return Object.keys(this.pollingTasks);
  }
}

module.exports = Monitor;
