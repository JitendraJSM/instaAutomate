const fs = require("fs-extra");
const path = require("path");
const utils = require("../utils/utils.js");

// ======= Constants =======
const botWorkShiftHours = 16;

const dayMs = 24 * 60 * 60 * 1000;
const hourMs = 60 * 60 * 1000;
const LOGS_DIR = path.join(__dirname, "../data/logs");

// ==== Task History json ====
const generateFileName = (date) => {
  return `tasksHistory_${date.getDate().toString().padStart(2, "0")}_${(date.getMonth() + 1).toString().padStart(2, "0")}_${date.getFullYear().toString().slice(-2)}.json`;
};

// ==== Task History json ====
const readTaskHistrory = async function (date = new Date()) {
  const fileName = generateFileName(date);

  const filePath = path.join(LOGS_DIR, fileName);

  if (!fs.existsSync(filePath)) throw new Error(`${fileName} does not exist.`);
  const tasksHistory = JSON.parse(await fs.readFile(filePath, "utf8"));
  return tasksHistory;
};

const writeTasksHistory = async function (tasksHistory, overwrite = false) {
  if (!tasksHistory || !Array.isArray(tasksHistory)) {
    throw new Error("tasksHistory must be an array");
  }

  const date = tasksHistory.length > 0 && tasksHistory[0]?.completedAt ? new Date(tasksHistory[0].completedAt) : new Date();

  const fileName = generateFileName(date);
  const filePath = path.join(LOGS_DIR, fileName);

  // Ensure logs directory exists
  await fs.ensureDir(LOGS_DIR);

  if (!overwrite && fs.existsSync(filePath)) {
    throw new Error(`${fileName} already exists.`);
  }

  await fs.writeFile(filePath, JSON.stringify(tasksHistory, null, 2));
  return true;
};

/**
 * Adds one or more completed tasks to the task history log file.
 *
 * Handles both single task objects and arrays of task objects. Ensures the log directory exists,
 * creates a new log file for the date if it doesn't exist, reads the existing task history,
 * appends the new tasks, and writes the updated history back to the file.
 *
 * @async
 * @function
 * @param {Object|Object[]} tasks - A single task object or an array of task objects to be logged as completed.
 * @returns {Promise<boolean>} Resolves to true if tasks are successfully added to the log.
 * @throws {Error} Throws an error if reading or writing the task history fails.
 * @example
 * // Add a single completed task
 * await pushCompletedTask.call(this, { "parentModuleName": "instaAuto", "actionName": "follow", "argumentsString": "kajalmahioffical143","assignedAt": "2025-07-08T13:54:38.178Z" });
 *
 * @example
 * // Add multiple completed tasks
 * await pushCompletedTask.call(this, [
 *   { "parentModuleName": "instaAuto", "actionName": "follow", "argumentsString": "kajalmahioffical143", "assignedAt": "2025-07-08T13:54:38.178Z" },
 *   { "parentModuleName": "instaAuto", "actionName": "follow", "argumentsString": "manisha.sen.25", "assignedAt": "2025-07-08T13:54:38.197Z" }
 * ]);
 */
const pushCompletedTask = async function (tasks) {
  // As task can be an object or array of objects it is not easy to check for task validation
  let tasksArray = !Array.isArray(tasks) ? [tasks] : tasks;
  const date = tasksArray.length > 0 && tasksArray[0]?.completedAt ? new Date(tasksArray[0].completedAt) : new Date();

  const fileName = generateFileName(date);
  const filePath = path.join(LOGS_DIR, fileName);

  // Ensure logs directory exists
  await fs.ensureDir(LOGS_DIR);

  // If file doesn't exist, create it with empty array
  if (!fs.existsSync(filePath)) {
    await writeTasksHistory([], false);
  }

  // Read existing tasks, add new ones, and write back
  try {
    const tasksHistory = await readTaskHistrory(date);

    if (tasksArray.length > 0) tasksArray.forEach((task) => (task.currentProfile = this.state.currentProfile.userName));
    const updatedTasksHistory = [...tasksHistory, ...tasksArray];
    await writeTasksHistory(updatedTasksHistory, true);
    return true;
  } catch (error) {
    console.error(`Error pushing completed tasks: ${error.message}`);
    throw error;
  }
};

// ==== All Profiles Data Functions ====
const readProfilesData = async () => JSON.parse(await fs.readFile("./data/allProfilesData.json"));
readProfilesData.shouldStoreState = "profilesData";

const writeProfilesData = async function (profilesData) {
  if (!profilesData || !Array.isArray(profilesData)) throw new Error(`Invalid profilesData object provided. It must be an array.`);

  // Ensure all profiles have userName, userDataPath properties
  profilesData.forEach((profile) => {
    if (!profile.userName || !profile.userDataPath) throw new Error(`Invalid profile object\n${JSON.stringify(profile)} \n provided. It must contain userName and userDataPath properties.`);

    /* NOTE: 1. For consistency dueTasks must not be mutated anywhere and hence below line is commented. 
       NOTE: 2. Removing duplicates from userData.dueTasks array is does not alters the consistency of dueTasks
       NOTE: 3. "utils.removeDuplicates()" won't work as planning to add properties "assignedAt" & "completedAt" in dueTasks
    if (profile.dueTasks) {
      profile.dueTasks = utils.removeDuplicates(profile.dueTasks);
    }
    */
  });
  if (this.isApp) this.state.profilesData = profilesData; // Update the state if this is an App instance
  await fs.writeFile("./data/allProfilesData.json", JSON.stringify(profilesData, null, 2));
  return true;
};

// ==== Profile Specific Data Functions ====
const getProfileByUserName = async function (userName) {
  const allProfilesData = this?.state?.profilesData || (await readProfilesData());

  const profile = allProfilesData.find((profile) => profile.userName === userName);
  if (!profile) {
    console.log(`Profile with userName: ${userName} not found in allProfilesData.json.`);
    return false;
  }
  return profile;
};

const getUserDataPathByUserName = async function (userName) {
  const profile = await getProfileByUserName.call(this, userName);
  if (!profile) throw new Error(`Profile with userName: ${userName} not found in allProfilesData.json.`);

  const userDataPath = profile.userDataPath;
  if (!userDataPath) throw new Error(`userDataPath property does not exists on ${userName}'s profile in allProfilesData.json.`);

  // Check if file exists
  if (!(await fs.pathExists(userDataPath))) throw new Error(`User data file does not exist for user: ${userName}, at path userDataPath: ${userDataPath}`);

  return userDataPath;
};

/**
 * Reads the user profile data from the corresponding JSON file.
 *
 * @async
 * @function readUserProfileData
 * @param {string} userName - The username of the profile to read data for.
 * @returns {Promise<Object>} The user data object read from the file.
 * @throws {Error} If the userName is not provided or the user data file does not exist.
 *
 * @example
 * const userData = await readUserProfileData.call(this,userName); // "this" is App instance
 */
const readUserProfileData = async function (userName) {
  if (!userName) throw new Error(`userName must be provided to read user profile data.`);

  const userDataPath = await getUserDataPathByUserName.call(this, userName);

  // Read the user data from the file
  const userData = JSON.parse(await fs.readFile(userDataPath));
  console.log(`User data for ${userName} read from ${userDataPath}`);
  return userData;
};

const writeUserProfileData = async function (userData) {
  if (!userData || !userData.userName) throw new Error(`Invalid userData object provided. It must contain userName property.`);

  const storedUserData = await readUserProfileData.call(this, userData.userName);
  // NOTE: lastDataOverwrite doesn't means that the profile is updated, it is for caution so that if any time data get's written accidentally then it can be tracked.
  userData = {
    ...storedUserData,
    ...userData,
    lastDataOverwriteDate: new Date().toISOString(),
  };

  /* NOTE: 1. For consistency dueTasks must not be mutated anywhere and hence below line is commented. 
     NOTE: 2. Removing duplicates from userData.dueTasks array is does not alters the consistency of dueTasks
     NOTE: 3. "utils.removeDuplicates()" won't work as planning to add properties "assignedAt" & "completedAt" in dueTasks
  userData.dueTasks && (userData.dueTasks = utils.removeDuplicates(userData.dueTasks));
  */

  // Write the user data to the file
  await fs.writeFile(userData.userDataPath, JSON.stringify(userData, null, 2));

  return true;
};

// ==== Combined (for Agent / Scraper / Resource) Task Related Data Functions ====
const addNewProfile = async function () {
  let userInput = await this.utils.askUser(`Do you want to add new profile? (y/n): `);
  if (userInput.toLowerCase() !== "y") return false;

  // Create a new profile object
  let newProfile = {};

  newProfile.userName = await this.utils.askUser(`Enter user name: `);
  if (this.state.profilesData.find((profile) => profile.userName == newProfile.userName)) throw new Error(`Profile with user name: ${newProfile.userName} already exists`);

  userInput = await this.utils.askUser("Enter type of profile: 1 for 'agent', 2 for 'scrper' or 3 for 'resource': ");
  if (userInput === "1") newProfile.type = "agent";
  else if (userInput === "2") newProfile.type = "scraper";
  else if (userInput === "3") {
    newProfile.type = "resource";
    const result = await addNewResourceProfile.call(this, newProfile);
    if (!result) throw new Error(`Failed to add new resource profile: ${JSON.stringify(newProfile)}`);
    return false;
  } else throw new Error(`Invalid input, input must be 1 or 2 or 3.`);

  newProfile.password = await this.utils.askUser(`Enter password: `);

  newProfile.profileTarget = await this.utils.askUser("Enter profile target: ");
  if (this.state.profilesData.find((profile) => profile.profileTarget == newProfile.profileTarget)) throw new Error(`Profile with target ${newProfile.profileTarget} already exists`);

  newProfile.userDataPath = `./data/instaProfilesData/${newProfile.type}sData/${newProfile.userName}-data.json`;

  newProfile.dueTasks = [];
  newProfile.automatedFollow = [];
  if (newProfile.type === "agent") newProfile.linkedResourceUserName = "notYetDefined";

  this.state.profilesData.push(newProfile);

  newProfile = this.state.profilesData.at(-1); // Get the last added profile object

  await writeProfilesData.call(this, this.state.profilesData);
  await fs.outputJson(newProfile.userDataPath, newProfile, { spaces: 2 });

  await addDueTask.call(this, newProfile.userName, {
    parentModuleName: "instaAuto",
    actionName: "updateUserData",
    argumentsString: true,
  });

  for (const profile of this.state.profilesData) {
    if (profile.type === "resource") continue; // Skip resource profiles
    if (profile.userName === newProfile.userName) continue; // Skip the newly added profile itself
    // 1. This only writes data in json file does not update the currently running process's memory.
    await addDueTask.call(this, profile.userName, {
      parentModuleName: "instaAuto",
      actionName: "follow",
      argumentsString: `${newProfile.userName}`,
    });

    if (profile.type === "scraper") continue;

    await addDueTask.call(this, newProfile.userName, {
      parentModuleName: "instaAuto",
      actionName: "follow",
      argumentsString: `${profile.userName}`,
    });
  }

  // These two given below commands are unuseful they didn't change anything actually so commented out.
  // await writeProfilesData.call(this, this.state.profilesData);
  // await writeUserProfileData.call(this, newProfile);

  // Read the latest updated Data
  this.state.profilesData = await readProfilesData();
  newProfile = await readUserProfileData.call(this, newProfile.userName);

  this.state.currentProfile = newProfile;
  this.state.profileTarget = newProfile.profileTarget;

  console.log(`New profile added successfully.`);
  return true;
};

const addNewResourceProfile = async function (newProfile) {
  const newResourceProfile = { ...newProfile };
  newResourceProfile.postsCount = 0;
  newResourceProfile.followersCount = 0;
  newResourceProfile.followingsCount = 0;
  newResourceProfile.postsDownloaded = 0;
  newResourceProfile.postsEdited = 0;
  newResourceProfile.postsReadyToUpload = 0;

  newResourceProfile.userDataPath = `./data/instaResourcesData/${newResourceProfile.userName}/${newResourceProfile.userName}-data.json`;
  await fs.outputJson(newResourceProfile.userDataPath, newResourceProfile, {
    spaces: 2,
  });

  this.state.profilesData.push(newResourceProfile);
  await writeProfilesData.call(this, this.state.profilesData);
  await writeUserProfileData.call(this, newResourceProfile);
  return true;
};

// ==== Task's Specific Data Functions ====
const removeDuplicatesFormDueTasksArray = (dueTasksArr) =>
  utils.removeDuplicates(
    dueTasksArr,
    ["parentModuleName", "actionName", "argumentsString"],
    "assignedAt" // If you want to keep the latest assignedAt, otherwise omit this argument
  );

// NOTE: addDueTask() adds due task in the data file of that userName it doesn't update the memory.
const addDueTask = async function (userName, dueTaskObj) {
  console.log(`Adding due task for user: ${userName}, ${JSON.stringify(dueTaskObj)}`);

  const profilesData = await readProfilesData();

  for (const profile of profilesData) {
    if (profile.userName === `${userName}` && profile.type !== "resource") {
      profile.dueTasks.push(dueTaskObj);
      profile.dueTasks = removeDuplicatesFormDueTasksArray(profile.dueTasks);

      const userData = await readUserProfileData.call(this, userName);

      dueTaskObj.assignedAt = new Date().toISOString();
      userData.dueTasks.push(dueTaskObj);
      userData.dueTasks = removeDuplicatesFormDueTasksArray(userData.dueTasks);

      await writeUserProfileData.call(this, userData);
      await writeProfilesData(profilesData);
      console.log(`Added task for user: ${userName}`);
      return true;
    }
  }
};

const removeDueTask = async function (userName, dueTaskObj) {
  console.log(`Removing due task for user: ${userName}, ${JSON.stringify(dueTaskObj)}`);

  const profilesData = await readProfilesData();

  for (const profile of profilesData) {
    if (profile.userName === userName && profile.type !== "resource") {
      profile.dueTasks = removeDuplicatesFormDueTasksArray(profile.dueTasks);

      // 1. find the index of dueTaskObj in profile.dueTasks
      const index = profile.dueTasks.findIndex(
        (task) => task.parentModuleName === dueTaskObj.parentModuleName && task.actionName === dueTaskObj.actionName && task.argumentsString === dueTaskObj.argumentsString
      );
      // 2. If index is -1 then break the loop and throw error that dueTaskObj for userName is not found, else remove it
      if (index === -1) {
        throw new Error(`This particular due task ${JSON.stringify(dueTaskObj)} for user: ${userName} not found in profilesData.`);
      }
      profile.dueTasks.splice(index, 1);

      // 3. Update user-specific data file
      const userData = await readUserProfileData(userName);
      userData.dueTasks = removeDuplicatesFormDueTasksArray(userData.dueTasks);

      const dueTaskIndex = userData.dueTasks.findIndex(
        (task) => task.parentModuleName === dueTaskObj.parentModuleName && task.actionName === dueTaskObj.actionName && task.argumentsString === dueTaskObj.argumentsString
      );
      if (dueTaskIndex === -1) {
        throw new Error(`This particular due task ${JSON.stringify(dueTaskObj)} for user: ${userName} doesn't exists in file ${userData.userDataPath}.`);
      }

      // When the task get completed
      dueTaskObj.completeAt = new Date().toISOString();

      if (!userData?.completedTasks) userData.completedTasks = [];
      userData.completedTasks.push(dueTaskObj);

      userData.dueTasks.splice(dueTaskIndex, 1);

      // 4. Add completed Task to ./data/logs/taskHistory_dd_mm_yy.json
      await pushCompletedTask.call(this, dueTaskObj);

      // 5. Write the updated userData to the file
      await writeUserProfileData.call(this, userData);

      // 6. Write the updated profilesData to the file
      await writeProfilesData(profilesData);

      return true;
    }
  }

  console.log(`Removed task for user: ${userName}`);
};

const removeDuplicatesFormAutomatedFollowArray = (arr) => utils.removeDuplicates(arr, ["userName"], "date");

const updateDatabaseOnFollow = async function (userObject) {
  console.log(`Adding ${JSON.stringify(userObject)} to ${this.state.currentProfile.userName}.automatedFollow: [].`);

  const currentUserData = await readUserProfileData.call(this, this.state.currentProfile.userName);

  // Neccessary Checks
  /* Sometimes in development you manually unfollow a user that was previously automated followed and hence in automatedFollowed array but when script again perform automated follow on that same user it creates a duplicate array element for that same user but with different date so the below is check for that*/
  currentUserData.automatedFollow.push(userObject);

  currentUserData.automatedFollow = removeDuplicatesFormAutomatedFollowArray(currentUserData.automatedFollow);

  await writeUserProfileData.call(this, currentUserData);

  await addDueTask.call(this, this.state.currentProfile.userName, {
    parentModuleName: "instaAuto",
    actionName: "updateUserData",
    argumentsString: true,
  });

  this.state.currentProfile = await readUserProfileData.call(this, this.state.currentProfile.userName);

  // TODO: Just get the task from current Action don't need to use .find() method
  const currentfollowDueTask = this.state.currentProfile.dueTasks.find((task) => task.argumentsString === userObject.userName && task.actionName === "follow");
  if (!currentfollowDueTask) throw new Error(`currentfollowDueTask {"argumentsString"===${userObject.userName}, "actionName" === "follow"} not found in ${JSON.stringify(this.state.currentProfile)}`);
  await removeDueTask.call(this, this.state.currentProfile.userName, currentfollowDueTask);

  console.log(`Adding ${JSON.stringify(userObject)} to ${this.state.currentProfile.userName}.automatedFollow: [].`);
  return true;
};

// ==== Target String Related Functions ====

const readTargetStringsToScrape = async () => JSON.parse(await fs.readFile("./data/instaScrapedData/targetStringsToScrape.json"));
readTargetStringsToScrape.shouldStoreState = "targetStringsToScrape";

const writeTargetStringsToScrape = async function (targetStringsToScrape) {
  if (!Array.isArray(targetStringsToScrape)) throw new Error("targetStringsToScrape must be an array");
  await fs.writeFile("./data/instaScrapedData/targetStringsToScrape.json", JSON.stringify(targetStringsToScrape, null, 2));
  return true;
};

const readTargetStringsAlreadyScraped = async () => JSON.parse(await fs.readFile("./data/instaScrapedData/targetStringsAlreadyScraped.json"));
readTargetStringsAlreadyScraped.shouldStoreState = "targetStringsAlreadyScraped";

const writeTargetStringsAlreadyScraped = async function (targetStringsAlreadyScraped) {
  if (!Array.isArray(targetStringsAlreadyScraped)) throw new Error("targetStringsAlreadyScraped must be an array");
  await fs.writeFile("./data/instaScrapedData/targetStringsAlreadyScraped.json", JSON.stringify(targetStringsAlreadyScraped, null, 2));
  return true;
};

const writeScrapedTarget = async function () {
  const basePath = this.state.targetToScrape.dataPath.replace(/\/[^\/]*$/, "");
  await fs.ensureDir(basePath);
  await fs.writeFile(this.state.targetToScrape.dataPath, JSON.stringify(this.state.targetToScrape, null, 2));
  return true;
};

const addNewTargetString = async function () {
  let userInput = await this.utils.askUser(`Do you want to add new Target to scrape? , 1  or y for 'yes' : `);
  if (!(userInput.toLowerCase().trim() === "1" || userInput === "y")) return false;

  this.state.targetStringsToScrape ||= await readTargetStringsToScrape();
  this.state.targetStringsAlreadyScraped ||= await readTargetStringsAlreadyScraped();

  // Create a new target object
  let newTarget = {};

  newTarget.targetString = await this.utils.askUser(`Enter target string: `);
  newTarget.targetString = newTarget.targetString.toLowerCase().trim();
  if (this.state.targetStringsAlreadyScraped.includes((targetAlreadyScraped) => targetAlreadyScraped.targetString === newTarget.targetString)) {
    console.log(`Profile with user name: ${newTarget.targetString} already exists`);
    return false;
  }

  userInput = undefined;
  userInput = await this.utils.askUser("Enter targetType of Target: 1 for 'teraBox', 2 for 'movies' or 3 for 'other': ");
  if (userInput === "1") newTarget.targetType = "teraBox";
  else if (userInput === "2") newTarget.targetType = "movies";
  else if (userInput === "3") newTarget.targetType = "other";
  else throw new Error(`Invalid input, input must be 1 or 2 or 3.`);

  userInput = undefined;
  userInput = await this.utils.askUser("Target is a Profile, 1  or y for 'yes' : ");
  if (userInput.toLowerCase().trim() === "1" || userInput === "y") newTarget.type = "Profile";
  else newTarget.type = "Post";

  // NOTE: As userName cannot be always scraped from the target string so it is commented here and dataPath is added by instaScraper.
  // newTarget.dataPath = `./data/instaScrapedData/${newTarget.type}TargetsData/${newTarget.userName}-data.json`;

  this.state.targetStringsToScrape.push(newTarget);

  await writeTargetStringsToScrape.call(this, this.state.targetStringsToScrape);

  console.log(`New Target to scrape is added successfully.`);
  return true;
};

const updateScrapedData = async function () {
  if (!this.state.targetToScrape.isScrapingDone) return false;

  // 1. Check and set the dataPath for targetToScrape on the basis of
  //        i  - if this this.state.targetToScrape.type === "Profile"
  //        ii - if this this.state.targetToScrape.type === "Post"
  if (this.state.targetToScrape.type === "Profile") {
    this.state.targetToScrape.dataPath = `./data/instaScrapedData/${this.state.targetToScrape.targetType}TargetsData/${this.state.targetToScrape.userName}-data.json`;
  } else if (this.state.targetToScrape.type === "Post")
    this.state.targetToScrape.dataPath ||= `./data/instaScrapedData/${this.state.targetToScrape.targetType}TargetsData/${this.state.targetToScrape.userName}-${this.state.targetToScrape.postCode}-data.json`;

  // 2. Remove targetToScrape from this.state.targetStringsToScrape
  const indexOfTargetToScrape = this.state.targetStringsToScrape.findIndex((targetToScrape) => targetToScrape.targetString === this.state.targetToScrape.targetString);
  if (indexOfTargetToScrape !== -1) this.state.targetStringsToScrape.splice(indexOfTargetToScrape, 1);

  // 3. Add targetToScrape to this.state.targetStringsAlreadyScraped
  this.state.targetStringsAlreadyScraped ||= await readTargetStringsAlreadyScraped();
  const targetScraped = {
    targetString: this.state.targetToScrape.targetString,
    userName: this.state.targetToScrape.userName,
    type: this.state.targetToScrape.type,
    dataPath: this.state.targetToScrape.dataPath,
    lastScraped: new Date().toLocaleDateString(),
  };
  this.state.targetStringsAlreadyScraped.push(targetScraped);

  // 4. Write the updated targetStringsToScrape and targetStringsAlreadyScraped to their respective files
  await writeTargetStringsToScrape.call(this, this.state.targetStringsToScrape);
  await writeTargetStringsAlreadyScraped.call(this, this.state.targetStringsAlreadyScraped);

  // 5. Write the updated targetToScrape data to its dataPath
  await writeScrapedTarget.call(this);

  return true;
};

// ==== General Purpose / Other Functions ====
const filterProfilesToAutomate = async function () {
  // 1. All Agent Profiles having DueTasks
  this.state.profilesToLoop = this.state.profilesData.filter((profile) => profile.type === "agent" && profile.dueTasks.length !== 0);
  this.state.profilesToLoop.sort((a, b) => b.dueTasks.length - a.dueTasks.length);

  // 2. When agent tasks completed start scraper tasks
  this.state.profilesData
    .filter((profile) => profile.type === "scraper")
    .sort((a, b) => a.dueTasks.length - b.dueTasks.length)
    .forEach((Profile) => this.state.profilesToLoop.push(Profile));

  if (this.state.profilesToLoop.length === 0) throw new Error(`No profiles to loop`);
  return true;
};

// ==== Resource Task Related Data Functions ====

// === Interface ===
const catchAsync = require("../utils/catchAsync.js");
module.exports = {
  readUserProfileData: catchAsync(readUserProfileData),
  writeUserProfileData: catchAsync(writeUserProfileData),
  readProfilesData: catchAsync(readProfilesData),
  writeProfilesData: catchAsync(writeProfilesData),
  addDueTask: catchAsync(addDueTask),
  removeDueTask: catchAsync(removeDueTask),
  updateDatabaseOnFollow: catchAsync(updateDatabaseOnFollow),
  addNewProfile: catchAsync(addNewProfile),
  filterProfilesToAutomate: catchAsync(filterProfilesToAutomate),

  readTargetStringsToScrape: catchAsync(readTargetStringsToScrape),
  writeTargetStringsToScrape: catchAsync(writeTargetStringsToScrape),
  readTargetStringsAlreadyScraped: catchAsync(readTargetStringsAlreadyScraped),
  writeTargetStringsAlreadyScraped: catchAsync(writeTargetStringsAlreadyScraped),
  addNewTargetString: catchAsync(addNewTargetString),
  updateScrapedData: catchAsync(updateScrapedData),

  getProfileByUserName, // Didn't wrap in catchAsync as it is used in other functions that are already wrapped
  readTaskHistrory,
  writeTasksHistory,
  pushCompletedTask,
};

// 1. Imports
// 2. Constants
// 3. Functions
// 3.1. readProfilesData()
