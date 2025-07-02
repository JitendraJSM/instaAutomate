const fs = require("fs-extra");
const utils = require("../utils/utils.js");

// ======= Constants =======
const botWorkShiftHours = 16;

const dayMs = 24 * 60 * 60 * 1000;
const hourMs = 60 * 60 * 1000;

// ==== All Profiles Data Functions ====
const readProfilesData = async () => JSON.parse(await fs.readFile("./data/allProfilesData.json"));
readProfilesData.shouldStoreState = "profilesData";

const writeProfilesData = async function (profilesData) {
  if (!profilesData || !Array.isArray(profilesData)) throw new Error(`Invalid profilesData object provided. It must be an array.`);

  // Ensure all profiles have userName, userDataPath properties and do not have duplicate objects in dueTasks
  profilesData.forEach((profile) => {
    if (!profile.userName || !profile.userDataPath) throw new Error(`Invalid profile object\n${JSON.stringify(profile)} \n provided. It must contain userName and userDataPath properties.`);
    if (profile.dueTasks) {
      profile.dueTasks = utils.removeDuplicates(profile.dueTasks);
    }
  });
  if (this.isApp) this.state.profilesData = profilesData; // Update the state if this is an App instance
  await fs.writeFile("./data/allProfilesData.json", JSON.stringify(profilesData, null, 2));
  return true;
};

// ==== Profile Specific Data Functions ====
const getProfileByUserName = async function (userName) {
  const allProfilesData = this?.state?.profilesData || (await readProfilesData());

  const profile = allProfilesData.find((profile) => profile.userName === userName);
  if (!profile) throw new Error(`There is no profile in allProfilesData.json by userName : ${userName}.`);
  return profile;
};
const getUserDataPathByUserName = async function (userName) {
  const userDataPath = (await getProfileByUserName(userName))?.userDataPath;
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
 * @param {Object} userProfile - The user profile object. Must contain at least a `userName` property. Optionally, can include a `type` property.
 * @returns {Promise<Object>} The user data object read from the file.
 * @throws {Error} If the userProfile object is invalid or the user data file does not exist.
 *
 * @example
 * const userData = await readUserProfileData(userName);
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
  userData = { ...storedUserData, ...userData, lastDataOverwriteDate: new Date().toISOString() };

  // Remove updateUserData task if exists
  userData.dueTasks && (userData.dueTasks = utils.removeDuplicates(userData.dueTasks));

  // Write the user data to the file
  await fs.writeFile(userData.userDataPath, JSON.stringify(userData, null, 2));

  return true;
};

// ==== Combined (for Agent / Scraper / Resource) Task Related Data Functions ====
const addNewProfile = async function () {
  let userInput = await this.utils.askUser(`Do you want to add new profile? (y/n): `);
  if (userInput.toLowerCase() === "n") {
    return false;
  }

  // Create a new profile object
  let newProfile = {};

  newProfile.userName = await this.utils.askUser(`Enter user name:`);
  if (this.state.profilesData.find((profile) => profile.userName == newProfile.userName)) throw new Error(`Profile with user name: ${newProfile.userName} already exists`);

  userInput = await this.utils.askUser("Enter type of profile: 1 for 'agent', 2 for 'scrper' or 3 for 'resource': ");
  if (userInput === "1") newProfile.type = "agent";
  else if (userInput === "2") newProfile.type = "scraper";
  else if (userInput === "3") {
    newProfile.type = "resource";
    const result = await addNewResourceProfile.call(this, newProfile);
    if (!result) throw new Error(`Failed to add new resource profile: ${JSON.stringify(newProfile)}`);
    return;
  } else throw new Error(`Invalid input`);

  newProfile.password = await this.utils.askUser(`Enter password:`);

  newProfile.profileTarget = await this.utils.askUser("Enter profile target: ");
  if (this.state.profilesData.find((profile) => profile.profileTarget == newProfile.profileTarget)) throw new Error(`Profile with target ${newProfile.profileTarget} already exists`);

  newProfile.userDataPath = `./data/instaProfilesData/${newProfile.type}sData/${newProfile.userName}-data.json`;
  newProfile.dueTasks = [
    {
      parentModuleName: "instaAuto",
      actionName: "updateUserData",
      argumentsString: true,
    },
  ];
  newProfile.automatedFollow = [];

  this.state.profilesData.push(newProfile);

  newProfile = this.state.profilesData.at(-1); // Get the last added profile object

  await writeProfilesData.call(this, this.state.profilesData);
  await fs.outputJson(newProfile.userDataPath, newProfile, { spaces: 2 });

  for (const profile of this.state.profilesData) {
    if (profile.type === "resource") continue; // Skip resource profiles
    if (profile.userName === newProfile.userName) continue; // Skip the newly added profile itself
    // 1. This only writes data in json file does not update the currently running process's memory.
    await addDueTask.call(this, profile.userName, {
      parentModuleName: "instaAuto",
      actionName: "follow",
      argumentsString: `${newProfile.userName}`,
    });
    await addDueTask.call(this, newProfile.userName, {
      parentModuleName: "instaAuto",
      actionName: "follow",
      argumentsString: `${profile.userName}`,
    });

    // 2. This updates the currently running process's memory.
    profile.dueTasks.push({
      parentModuleName: "instaAuto",
      actionName: "follow",
      argumentsString: `${newProfile.userName}`,
    });
    newProfile.dueTasks.push({
      parentModuleName: "instaAuto",
      actionName: "follow",
      argumentsString: `${profile.userName}`,
    });
  }

  await writeProfilesData.call(this, this.state.profilesData);
  await writeUserProfileData.call(this, newProfile);

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
  await fs.outputJson(newResourceProfile.userDataPath, newResourceProfile, { spaces: 2 });

  this.state.profilesData.push(newResourceProfile);
  await writeProfilesData.call(this, this.state.profilesData);
  await writeUserProfileData.call(this, newResourceProfile);
  return true;
};

// ==== Task's Specific Data Functions ====
// NOTE: addDueTask() adds due task in the data file of that userName it doesn't update the memory.
const addDueTask = async function (userName, dueTaskObj) {
  console.log(`Adding due task for user: ${userName}, ${JSON.stringify(dueTaskObj)}`);

  const profilesData = await readProfilesData();

  for (const profile of profilesData) {
    if (profile.userName === `${userName}` && profile.type !== "resource") {
      profile.dueTasks.push(dueTaskObj);

      const userData = await readUserProfileData.call(this, userName);

      userData.dueTasks.push(dueTaskObj);

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
      // 1. find the index of dueTaskObj in profile.dueTasks
      const index = profile.dueTasks.findIndex((task) => JSON.stringify(task) === JSON.stringify(dueTaskObj));
      // 2. If index is -1 then break the loop and throw error that dueTaskObj for userName is not found, else remove it
      if (index === -1) {
        throw new Error(`This particular due task ${JSON.stringify(dueTaskObj)} for user: ${userName} not found in profilesData.`);
      }
      profile.dueTasks.splice(index, 1);

      // 3. Update user-specific data file
      const userData = await readUserProfileData(userName);

      const dueTaskIndex = userData.dueTasks.findIndex((task) => JSON.stringify(task) === JSON.stringify(dueTaskObj));
      if (dueTaskIndex === -1) {
        throw new Error(`This particular due task ${JSON.stringify(dueTaskObj)} for user: ${userName} doesn't exists in file ${dataPath}.`);
      }
      userData.dueTasks.splice(dueTaskIndex, 1);

      // 4. Write the updated userData to the file
      await writeUserProfileData.call(this, userData);
      // 5. Write the updated profilesData to the file
      await writeProfilesData(profilesData);

      return true;
    }
  }

  console.log(`Removed task for user: ${userName}`);
};

const removeDuplicatesFormAutomatedFollowArray = function (arr) {
  const map = new Map();
  for (const item of arr) {
    const d = new Date(item.date);
    const entry = map.get(item.userName);
    if (!entry || d > entry[1]) map.set(item.userName, [item, d]);
  }
  arr = Array.from(map.values(), ([item]) => item);
  return arr;
};

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

  // To update the running process's memory
  this.state.currentProfile.dueTasks = utils.removeDuplicates(this.state.currentProfile.dueTasks);

  const currentfollowDueTask = this.state.currentProfile.dueTasks.find((task) => task.argumentsString === userObject.userName && task.actionName === "follow");
  if (!currentfollowDueTask) throw new Error(`currentfollowDueTask {"argumentsString"===${userObject.userName}, "actionName" === "follow"} not found in ${JSON.stringify(this.state.currentProfile)}`);
  await removeDueTask.call(this, this.state.currentProfile.userName, currentfollowDueTask);

  console.log(`Adding ${JSON.stringify(userObject)} to ${this.state.currentProfile.userName}.automatedFollow: [].`);
  return true;
};

// ==== General Purpose / Other Functions ====
const filterProfilesToAutomate = async function () {
  // As agent's dueTasks are more important than scraper's dueTasks.
  console.log(`Before this.state.profilesToLoop`);
  console.log(this.state.profilesToLoop);

  // 1. All Agent Profiles having DueTasks
  // this.state.profilesToLoop = this.state.profilesData.filter((profile) => profile.type === "agent");
  this.state.profilesToLoop = this.state.profilesData.filter((profile) => profile.type === "agent" && profile.dueTasks.length !== 0);

  // 2. When agent tasks completed start scraper tasks
  if (this.state.profilesToLoop.length === 0) this.state.profilesToLoop = this.state.profilesData.filter((profile) => profile.type === "scraper" && profile.dueTasks.length !== 0);
  console.log(`Before this.state.profilesToLoop`);
  console.log(this.state.profilesToLoop);

  if (this.state.profilesToLoop.length === 0) throw new Error(`No profiles to loop`);
  return true;
};

// ==== Resource Task Related Data Functions ====

// (async () => {
//   try {
//     // const profilesData = await readProfilesData();
//     // console.log(`Profiles data read successfully:`, profilesData.length, `profiles found.`);
//     // console.log(profilesData);
//     const userDataPath = await getUserDataPathByUserName("its_cute_girl__85");
//     console.log(`Resource data path for user 'its_cute_girl__85':`, userDataPath);
//     // const userData = await readUserProfileData("its_cute_girl__85");
//     // console.log(`User data for "its_cute_girl__85" is as Below: `);
//     // console.log(userData);
//     /*
//     const userData = {
//       userName: "its_cute_girl__85",
//       userDataPath: "./data/instaResourcesData/its_cute_girl__85/its_cute_girl__85-data.json",
//       posts: [
//         {
//           postId: "1",
//           postUrl: "https://www.instagram.com/p/1/",
//           postType: "image",
//           postDate: "2025-06-17T12:00:00Z",
//           likesCount: 951,
//           commentsCount: 7,
//           caption: "Cute",
//         },
//         {
//           postId: "2",
//           postUrl: "https://www.instagram.com/p/2/",
//           postType: "video",
//           postDate: "2025-06-22T12:00:00Z",
//           likesCount: 754,
//           commentsCount: 84,
//           caption: "Cute video",
//         },
//       ],
//       followers: [],
//       followings: [],
//       tempProp: "testVal",
//     };
// */
//     const res = await writeUserProfileData.call(this, userData);
//     console.log(`User data written or not  res is as: ${res}.`);
//   } catch (err) {
//     console.error("Error in IIFE:", err);
//   }
// })();

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
};

// 1. Imports
// 2. Constants
// 3. Functions
// 3.1. readProfilesData()
