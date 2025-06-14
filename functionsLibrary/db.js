const fs = require("fs-extra");
const utils = require("../utils/utils.js");

// ======= Constants =======
const botWorkShiftHours = 16;

const dayMs = 24 * 60 * 60 * 1000;
const hourMs = 60 * 60 * 1000;

// ==== Profiles Data Functions ====
const readProfilesData = async () =>
  JSON.parse(await fs.readFile("./data/instaData/profilesData.json"));
readProfilesData.shouldStoreState = "profilesData";

const writeProfilesData = async (profilesData) => {
  if (!profilesData || !Array.isArray(profilesData))
    throw new Error(
      `Invalid profilesData object provided. It must be an array.`
    );

  // Ensure all profiles have userName, userDataPath properties and do not have duplicate objects in dueTasks
  profilesData.forEach((profile) => {
    if (!profile.userName || !profile.userDataPath)
      throw new Error(
        `Invalid profile object provided. It must contain userName and userDataPath properties.`
      );
    if (profile.dueTasks) {
      profile.dueTasks = utils.removeDuplicates(profile.dueTasks);
    }
  });

  await fs.writeFile(
    "./data/instaData/profilesData.json",
    JSON.stringify(profilesData, null, 2)
  );
  return true;
};

// ==== User Data Functions ====
const getUserDataPathByUserName = async function (userName) {
  const tempAllProfilesData =
    this?.state?.profilesData || (await readProfilesData());

  const userDataPath = tempAllProfilesData.find(
    (profile) => profile.userName === userName
  )?.userDataPath;
  if (!userDataPath)
    throw new Error(
      `User profile with userName: ${userName} not found in profilesData.`
    );

  // Check if file exists
  if (!(await fs.pathExists(userDataPath)))
    throw new Error(
      `User data file does not exist for user: ${userProfile.userName}, at path userDataPath: ${userDataPath}`
    );

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
 * const userData = await readUserProfileData({ userName: "john_doe", type: "agent" });
 */
const readUserProfileData = async (userName) => {
  if (!userName)
    throw new Error(`userName must be provided to read user profile data.`);

  const userDataPath = await getUserDataPathByUserName.call(this, userName);

  // Read the user data from the file
  const userData = JSON.parse(await fs.readFile(userDataPath));
  console.log(`User data for ${userName} read from ${userDataPath}`);
  return userData;
};

const writeUserProfileData = async (userData) => {
  if (!userData || !userData.userName)
    throw new Error(
      `Invalid userData object provided. It must contain userName property.`
    );

  const storedUserData = await readUserProfileData.call(
    this,
    userData.userName
  );
  userData = { ...storedUserData, ...userData };

  // Remove updateUserData task if exists
  userData.dueTasks &&
    (userData.dueTasks = utils.removeDuplicates(userData.dueTasks));

  // Write the user data to the file
  await fs.writeFile(userData.userDataPath, JSON.stringify(userData, null, 2));

  return true;
};

// Refactored until this line 14-06-2025

const addDueTask = async function (userName, dueTaskObj) {
  console.log(`Adding due task for user: ${userName}`);

  const profilesData = await readProfilesData();

  for (const profile of profilesData) {
    if (profile.userName === `${userName}`) {
      profile.dueTasks.push(dueTaskObj);

      const userData = JSON.parse(
        await readUserProfileData.call(this, userName)
      );
      userData.dueTasks.push(dueTaskObj);
      // Refactored until this line 14-06-2025

      await writeUserProfileData.call(this, userData);
    } else
      throw new Error(
        `User profile with userName: ${userName} not found in profilesData.`
      );
  }
  await writeProfilesData(profilesData);
  console.log(`Added task for user: ${userName}`);
};

const removeDueTask = async function (userName, dueTaskObj) {
  const profilesData = await readProfilesData();

  for (const profile of profilesData) {
    if (profile.userName === userName) {
      if (profile.dueTasks) {
        // 1. find the index of dueTaskObj in profile.dueTasks
        const index = profile.dueTasks.findIndex(
          (task) => JSON.stringify(task) === JSON.stringify(dueTaskObj)
        );
        // 2. If index is -1 then break the loop and throw error that dueTaskObj for userName is not found, else remove it
        if (index === -1) {
          console.error(
            `This particular due task ${JSON.stringify(
              dueTaskObj
            )} for user: ${userName} not found in profilesData.`
          );
          break;
        }
        profile.dueTasks.splice(index, 1);

        // 3. Write the updated profile data to the file
        let typeOfProfile = profile.type;
        const getDataPath =
          typeOfProfile === "agent" ? agentsDataPath : scrapersDataPath;
        const dataPath = getDataPath(userName);

        // 4. Update user-specific data file
        const userData = JSON.parse(await fs.readFile(dataPath));
        if (!userData.dueTasks) {
          console.error(
            `Due tasks for user: ${userName} doesn't exists in file ${dataPath}.`
          );
          break;
        }

        const dueTaskIndex = userData.dueTasks.findIndex(
          (task) => JSON.stringify(task) === JSON.stringify(dueTaskObj)
        );
        if (dueTaskIndex === -1) {
          console.error(
            `This particular due task ${JSON.stringify(
              dueTaskObj
            )} for user: ${userName} doesn't exists in file ${dataPath}.`
          );
          break;
        }
        userData.dueTasks.splice(dueTaskIndex, 1);
        // 5. Write the updated userData to the file
        await writeUserProfileData.call(this, userData);
        // 6. Write the updated profilesData to the file
        await writeProfilesData(profilesData);
      }
    }
  }

  console.log(`Removed task for user: ${userName}`);
};

const updateDatabaseOnFollow = async function (userObject) {
  const tempProfileData = await readUserProfileData(this.state.currentProfile);

  // Neccessary Checks
  /* The creatation of automatedFollow Array is for new user only */
  if (!this.state.currentProfile.automatedFollow)
    this.state.currentProfile.automatedFollow = [];
  /* Sometimes in development you manullay unfollow a user that was previously automated followed and hence in automatedFollowed array but when script again perform automated follow on that same user it creates a duplicate array element for that same user but with different date so the below is check for that*/
  const index = this.state.currentProfile.automatedFollow.findIndex(
    (profile) => profile.userName === userObject.userName
  );
  if (index !== -1) {
    this.state.currentProfile.automatedFollow.splice(index, 1);
    console.log(
      `User ${userObject.userName} already exists in automatedFollow array, removing the old entry.`
    );
  }

  this.state.currentProfile.automatedFollow.push(userObject);
  await writeUserProfileData(this.state.currentProfile);

  /* The creatation of dueTasks Array is for new user only */
  if (!this.state.currentProfile.dueTasks)
    this.state.currentProfile.dueTasks = [];

  await addDueTask.call(this, this.state.currentProfile.userName, {
    parentModuleName: "instaAuto",
    actionName: "updateUserData",
    argumentsString: true,
  });
  this.state.currentProfile.dueTasks = this.utils.removeDuplicates(
    this.state.currentProfile.dueTasks
  );
  const currentfollowDueTask = this.state.currentProfile.dueTasks.find(
    (task) =>
      task.argumentsString === userObject.userName &&
      task.actionName === "follow"
  );
  await removeDueTask.call(
    this,
    this.state.currentProfile.userName,
    currentfollowDueTask
  );
  console.log(`updateDatabaseOnFollow function completed.`);
};

const addNewProfile = async function () {
  let userInput = await this.utils.askUser(
    `Do you want to add new profile? (y/n): `
  );
  if (userInput.toLowerCase() === "n") {
    return false;
  }

  // Create a new profile object
  const newProfile = {};

  newProfile.profileTarget = await this.utils.askUser("Enter profile target: ");
  if (
    this.state.profilesData.find(
      (profile) => profile.profileTarget == newProfile.profileTarget
    )
  )
    throw new Error(
      `Profile with target ${newProfile.profileTarget} already exists`
    );

  newProfile.userName = await this.utils.askUser(`Enter user name:`);
  if (
    this.state.profilesData.find(
      (profile) => profile.userName == newProfile.userName
    )
  )
    throw new Error(
      `Profile with user name: ${newProfile.userName} already exists`
    );

  newProfile.password = await this.utils.askUser(`Enter password:`);

  userInput = await this.utils.askUser(
    "Enter type of profile: 1 for 'agent', 2 for 'scrper'"
  );
  if (userInput === "1") newProfile.type = "agent";
  else if (userInput === "2") newProfile.type = "scraper";
  else throw new Error(`Invalid input`);

  newProfile.dueTasks = [
    {
      parentModuleName: "instaAuto",
      actionName: "updateUserData",
      argumentsString: true,
    },
  ];

  for (const profile of this.state.profilesData) {
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
    // profile.dueTasks.push({ follow: true, userName: `${newProfile.userName}` });
    // newProfile.dueTasks.push({ follow: true, userName: `${profile.userName}` });
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
  this.state.profilesData.push(newProfile);

  await writeProfilesData(this.state.profilesData);
  await writeUserProfileData(newProfile);

  this.state.currentProfile = newProfile;
  this.state.profileTarget = newProfile.profileTarget;

  console.log(`New profile added successfully.`);

  return true;
};

const filterProfilesToAutomate = async function () {
  // As agent's dueTasks are more important than scraper's dueTasks.
  this.state.profilesToLoop = this.state.profilesData.filter(
    (profile) => profile.type === "agent"
  );
  // console.log(this.state.profilesToLoop);
  if (this.state.profilesToLoop.length === 0)
    throw new Error(`No profiles to loop`);
};

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
