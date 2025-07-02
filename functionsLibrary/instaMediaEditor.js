// Tasks should be done by this script are as below
// 1. One helper function to find the media that needs to be edited (which are downloaded and not already edited).
//      - 1. get list of all resources and their userDataPath for that
//                - profilesData = db.readProfilesData()
//                - filter profilesData array, profiles that are type = "resource"

const db = require("./db.js");
const path = require("path");

// ---- Main Functions ----
const editPostsBeforeUpload = async function (userName) {
  if (!userName) throw new Error(`editPostsBeforeUpload function needs a userName as argument.`);

  //   1. Read the data to user profile
  const profileData = await db.readUserProfileData(userName);

  //   2. Creating list of posts available to edit
  if (profileData.postsDownloaded === 0) throw new Error(`There are no (0) posts downloaded to edit.`);
  else if (profileData.postsDownloaded === profileData.postsEdited) throw new Error(`All ${profileData.postsDownloaded} posts already downloaded and ${profileData.postsEdited} posts  edited.`);

  const postsToEdit = profileData.posts.filter((post) => !("isEdited" in post) || !post.isEdited);

  //   3. Edit Posts (from postsToEdit) one-by-one
  for (const post of postsToEdit) {
    // 3.1 Loop through all media paths of the post and call the editor function according to the type of media.
    for (const mediaPath of post.mediaPathArr) {
      if (mediaPath.split(".").pop() === "mp4") {
        // Call Video Editor Function and pass mediaPath to that function
        console.log(`According to mediaPath(${mediaPath}) this media is a video.`);
      } else if (mediaPath.split(".").pop() === "webp") {
        // Call WEBP Editor Function and pass mediaPath to that function
        console.log(`According to mediaPath(${mediaPath}) this media is an image of type webp.`);
      } else {
        // Call JPG Editor Function and pass mediaPath to that function
        console.log(`According to mediaPath(${mediaPath}) this media is an image of type jpg.`);
      }
    }

    // 3.2 Update the post in the database
    post.isEdited = true;
  }
  await updateDatabaseAfterEditingPosts(profileData);
};

// ----- Update Data-base with latest information after Editing Posts -----
const updateDatabaseAfterEditingPosts = async function (profileData) {
  const userName = profileData.userName;

  // 1. Calculating how many posts are edited
  profileData.postsEdited = profileData.posts.reduce((acc, post) => acc + (post.isEdited ? 1 : 0), 0);

  // 2. Update allProfilesData.json
  const allProfilesData = await db.readProfilesData();
  const tempMiniProfileData = allProfilesData.find((profile) => profile.userName === userName);
  tempMiniProfileData.postsEdited = profileData.postsEdited;

  tempMiniProfileData.lastMediaEditingDate = new Date().toISOString();
  profileData.lastMediaEditingDate = new Date().toISOString();

  // 3. Update user's Data
  await db.writeUserProfileData(profileData); // Updates the data of user about which post isDownloaded.
  await db.writeProfilesData.call(this, allProfilesData);
  return true;
};

// editPostsBeforeUpload("jitendra_goswami132");
