const fs = require("fs-extra");
const utils = require("../utils/utils.js");

// ======= Constants =======
const botWorkShiftHours = 16;

const dayMs = 24 * 60 * 60 * 1000;
const hourMs = 60 * 60 * 1000;

const profilesDataPath = () => `./data/instaData/profilesData.json`;
const agentsDataPath = (userName) => `./data/instaData/agentsData/${userName}-data.json`;
const scrapersDataPath = (userName) => `./data/instaData/scrapersData/${userName}-data.json`;

const readUserProfileData = async (userProfile) => {
  // Determine the path of user profile
  const getDataPath = userProfile.type === "agent" ? agentsDataPath : scrapersDataPath;
  const userDataPath = getDataPath(userProfile.userName);
  // Check if file exists
  const doesfileExist = await fs.pathExists(userDataPath);
  if (!doesfileExist) {
    throw new Error(`User data file does not exist for user: ${userProfile.userName}`);
  }
  // Read the user data from the file
  const userData = JSON.parse(await fs.readFile(userDataPath));
  console.log(`User data for ${userProfile.userName} read from ${userDataPath}`);
  return userData;
};

const writeUserProfileData = async (userData) => {
  if (!userData || !userData.userName || !userData.type) throw new Error(`Invalid userData object provided. It must contain userName and type properties.`);

  //  Determine the path of user profile
  const typeOfProfile = userData.type;
  const getDataPath = typeOfProfile === "agent" ? agentsDataPath : scrapersDataPath;
  const userDataPath = getDataPath(userData.userName);

  // Check if file exists
  const doesfileExist = await fs.pathExists(userDataPath);
  if (doesfileExist) {
    const storedUserData = JSON.parse(await fs.readFile(userDataPath));
    //  if userData exists then combine userData with storedUserData
    userData = { ...storedUserData, ...userData };
  }

  // Remove updateUserData task if exists
  userData.dueTasks && (userData.dueTasks = utils.removeDuplicates(userData.dueTasks));

  // Write the user data to the file
  await fs.writeFile(userDataPath, JSON.stringify(userData, null, 2));

  return userData;
};

const readProfilesData = async function () {
  return JSON.parse(await fs.readFile("./data/instaData/profilesData.json"));
};
readProfilesData.shouldStoreState = "profilesData";

const writeProfilesData = async (profilesData) => {
  if (!profilesData || !Array.isArray(profilesData)) throw new Error(`Invalid profilesData object provided. It must be an array.`);
  // Ensure all profiles have userName, type properties and do not have duplicate objects in dueTasks
  profilesData.forEach((profile) => {
    if (!profile.userName || !profile.type) throw new Error(`Invalid profile object provided. It must contain userName and type properties.`);
    if (profile.dueTasks) {
      profile.dueTasks = utils.removeDuplicates(profile.dueTasks);
    }
  });
  await fs.writeFile(profilesDataPath(), JSON.stringify(profilesData, null, 2));
};

const addDueTask = async function (userName, dueTaskObj) {
  console.log(`Adding due task for user: ${userName}`);

  const profilesData = await readProfilesData();

  for (const profile of profilesData) {
    if (profile.userName === `${userName}`) {
      if (!profile.dueTasks) profile.dueTasks = [];
      profile.dueTasks.push(dueTaskObj);
      let typeOfProfile = profile.type;
      const getDataPath = typeOfProfile === "agent" ? agentsDataPath : scrapersDataPath;
      const dataPath = getDataPath(userName);

      const userData = JSON.parse(await fs.readFile(dataPath));
      userData.dueTasks.push(dueTaskObj);

      await writeUserProfileData.call(this, userData);
    }
  }
  await writeProfilesData(profilesData);
  console.log(`Added task for user: ${userName}`);
};

const removeDueTask = async function (userName, dueTaskObj) {
  const profilesData = await readProfilesData();

  for (const profile of profilesData) {
    if (profile.userName === userName) {
      if (profile.dueTasks) {
        // Remove the task by filtering
        profile.dueTasks = profile.dueTasks.filter((task) => JSON.stringify(task) !== JSON.stringify(dueTaskObj));

        let typeOfProfile = profile.type;
        const getDataPath = typeOfProfile === "agent" ? agentsDataPath : scrapersDataPath;
        const dataPath = getDataPath(userName);

        // Update user-specific data file
        const userData = JSON.parse(await fs.readFile(dataPath));

        if (userData.dueTasks) {
          userData.dueTasks = userData.dueTasks.filter((task) => JSON.stringify(task) !== JSON.stringify(dueTaskObj));

          await writeUserProfileData.call(this, userData);
        }
      }
    }
  }

  await writeProfilesData(profilesData);
  console.log(`Removed task for user: ${userName}`);
};

const updateDatabaseOnFollow = async function (userObject) {
  const tempProfileData = JSON.parse(await fs.readFile(`./data/instaData/${this.state.currentProfile.userName}-data.json`));

  // Neccessary Checks
  /* The creatation of automatedFollow Array is for new user only */
  if (!this.state.currentProfile.automatedFollow) this.state.currentProfile.automatedFollow = [];
  /* Sometimes in development you manullay unfollow a user that was previously automated followed and hence in automatedFollowed array but when script again perform automated follow on that same user it creates a duplicate array element for that same user but with different date so the below is check for that*/
  const index = this.state.currentProfile.automatedFollow.findIndex((profile) => profile.userName === userObject.userName);
  if (index !== -1) {
    this.state.currentProfile.automatedFollow.splice(index, 1);
  }

  this.state.currentProfile.automatedFollow.push(userObject);

  /* The creatation of dueTasks Array is for new user only */
  if (!this.state.currentProfile.dueTasks) this.state.currentProfile.dueTasks = [];
  this.state.currentProfile.dueTasks.push({ parentModuleName: "instaAuto", actionName: "updateUserData", argumentString: true });
  this.state.currentProfile.dueTasks = this.utils.removeDuplicates(this.state.currentProfile.dueTasks);
  await writeUserProfileData.call(this, { ...tempProfileData, ...this.state.currentProfile });

  this.state.profilesData.find((profile) => profile.userName === this.state.currentProfile.userName).dueTasks = this.state.currentProfile.dueTasks;
  await writeProfilesData.call(this, this.state.profilesData);
  // console.log(`updateDatabaseOnFollow function completed.`);
};

const addNewProfile = async function () {
  let userInput = await this.utils.askUser(`Do you want to add new profile? (y/n): `);
  if (userInput.toLowerCase() === "n") {
    return false;
  }

  // Create a new profile object
  const newProfile = {};

  newProfile.profileTarget = await this.utils.askUser("Enter profile target: ");
  if (this.state.profilesData.find((profile) => profile.profileTarget == newProfile.profileTarget)) throw new Error(`Profile with target ${newProfile.profileTarget} already exists`);

  newProfile.userName = await this.utils.askUser(`Enter user name:`);
  if (this.state.profilesData.find((profile) => profile.userName == newProfile.userName)) throw new Error(`Profile with user name: ${newProfile.userName} already exists`);

  newProfile.password = await this.utils.askUser(`Enter password:`);

  userInput = await this.utils.askUser("Enter type of profile: 1 for 'agent', 2 for 'scrper'");
  if (userInput === "1") newProfile.type = "agent";
  else if (userInput === "2") newProfile.type = "scraper";
  else throw new Error(`Invalid input`);

  newProfile.dueTasks = [{ parentModuleName: "instaAuto", actionName: "updateUserData", argumentString: true }];

  for (const profile of this.state.profilesData) {
    // 1. This only writes data in json file does not update the currently running process's memory.
    await addDueTask.call(this, profile.userName, { parentModuleName: "instaAuto", actionName: "follow", argumentString: `${newProfile.userName}` });
    await addDueTask.call(this, newProfile.userName, { parentModuleName: "instaAuto", actionName: "follow", argumentString: `${profile.userName}` });

    // 2. This updates the currently running process's memory.
    // profile.dueTasks.push({ follow: true, userName: `${newProfile.userName}` });
    // newProfile.dueTasks.push({ follow: true, userName: `${profile.userName}` });
    profile.dueTasks.push({ parentModuleName: "instaAuto", actionName: "follow", argumentString: `${newProfile.userName}` });
    newProfile.dueTasks.push({ parentModuleName: "instaAuto", actionName: "follow", argumentString: `${profile.userName}` });
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
  this.state.profilesToLoop = this.state.profilesData.filter((profile) => profile.type === "agent");
  // console.log(this.state.profilesToLoop);
  if (this.state.profilesToLoop.length === 0) throw new Error(`No profiles to loop`);
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
