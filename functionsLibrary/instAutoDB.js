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
  // Write the user data to the file
  await fs.writeFile(userDataPath, JSON.stringify(userData, null, 2));

  return userData;
};

const readProfilesData = async function () {
  return JSON.parse(await fs.readFile("./data/instaData/profilesData.json"));
};

const writeProfilesData = async (profilesData) => await fs.writeFile(profilesDataPath(), JSON.stringify(profilesData, null, 2));

const addDueTask = async function (userName, dueTaskObj) {
  console.log(`Adding due task for user: ${userName}`);

  const profilesData = await readProfilesData();

  for (const profile of profilesData) {
    if (profile.userName === `${userName}`) {
      if (!profile.dueTasks) profile.dueTasks = [];
      profile.dueTasks.push(dueTaskObj);
      let typeOfProfile = profile.type;
      profile.dueTasks = utils.removeDuplicates(profile.dueTasks);
      const getDataPath = typeOfProfile === "agent" ? agentsDataPath : scrapersDataPath;
      const dataPath = getDataPath(userName);

      const userData = JSON.parse(await fs.readFile(dataPath));
      userData.dueTasks.push(dueTaskObj);
      userData.dueTasks = utils.removeDuplicates(userData.dueTasks);

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

// === Interface ===
const catchAsync = require("../utils/catchAsync.js");
module.exports = {
  readUserProfileData: catchAsync(readUserProfileData),
  writeUserProfileData: catchAsync(writeUserProfileData),
  readProfilesData: catchAsync(readProfilesData),
  writeProfilesData: catchAsync(writeProfilesData),
  addDueTask: catchAsync(addDueTask),
  removeDueTask: catchAsync(removeDueTask),
};
