// NOTE: this module is independent from other modules means it can be run without app the example usage without app is given in the last of script.

const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const db = require("./db.js");

/**
 * Download a file from a URL to a local path.
 */
async function downloadFile(url, dest) {
  const writer = fs.createWriteStream(dest);
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
    timeout: 30000,
  });
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

/**
 * Infer file extension from URL or default to .jpg/.mp4
 */
function getExtension(url, fallback) {
  const ext = path.extname(url.split("?")[0]);
  if (ext && ext.length <= 5) return ext;
  return fallback;
}

/**
 * Main function to download all media for a user.
 * @param {string} userName
 * @param {object} options { stopOnError: boolean }
 */
async function downloadUserMedia(userName) {
  options = { stopOnError: true };
  if (!userName) {
    console.error("No userName provided.");
    return;
  }
  const profileData = await db.readUserProfileData(userName);
  if (!profileData || !profileData.posts || !("postsDownloaded" in profileData)) {
    console.error("Profile data or posts Array not found for user:", userName);
    return;
  }

  const posts = profileData.posts;
  const total = posts.length;
  const userDir = profileData.userDataPath.replace(/\/[^\/]*$/, "");
  const userMediaDir = path.join(userDir, "media");
  console.log(`-----`);

  await fs.ensureDir(userMediaDir);

  let processed = 0;
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    try {
      let filesToDownload = [];
      if (post.product_type === "carousel_container" && Array.isArray(post.carousel_media)) {
        for (const media of post.carousel_media) {
          const ext = getExtension(media.url, ".jpg");
          const filename = `${post.code}_${media.imgIndex}${ext}`;
          filesToDownload.push({ url: media.url, filename });
        }
      } else if (post.product_type === "clips" && post.video_versions) {
        const ext = getExtension(post.video_versions, ".mp4");
        const filename = `${post.code}${ext}`;
        filesToDownload.push({ url: post.video_versions, filename });
      } else if (post.product_type === "feed" && post.image_versions2) {
        const ext = getExtension(post.image_versions2, ".jpg");
        const filename = `${post.code}${ext}`;
        filesToDownload.push({ url: post.image_versions2, filename });
      } else {
        console.log(`Unknown or unsupported post type for code: ${post.code}`);
      }
      const mediaPathArr = [];
      for (const file of filesToDownload) {
        const mediaPath = path.join(userMediaDir, file.filename);
        mediaPathArr.push(mediaPath);
        if (profileData.posts[i].isDownloaded || fs.existsSync(mediaPath)) {
          console.log(`[SKIP] ${file.filename} already exists.`);
          continue;
        }
        console.log(`[DOWNLOAD] ${file.filename} ...`);
        await downloadFile(file.url, mediaPath);
        console.log(`[DONE] ${file.filename}`);
        await new Promise((res) => setTimeout(res, 1000));
      }

      if (!profileData.posts[i].isDownloaded) {
        profileData.posts[i].isDownloaded = true;
        profileData.posts[i].downloadDate = new Date().toISOString();
      }
      profileData.posts[i].mediaPathArr = [...new Set(mediaPathArr)];
    } catch (err) {
      console.error(`[ERROR] Processing post ${post.code}:`, err.message);
      if (options.stopOnError) {
        console.log("Stopping due to error.");
        break;
      }
    }
    processed++;
    console.log(`Progress: ${processed}/${total} processed, ${total - processed} remaining.`);
  }
  await updateDatabaseAfterDownloadingPosts(profileData);
  console.log(`All posts processed & user data is updated.`);
}
// ----- Update Data-base with latest information after Downloading profile -----
const updateDatabaseAfterDownloadingPosts = async function (profileData) {
  const userName = profileData.userName;

  // 1. Calculating how many posts are downloaded
  profileData.postsDownloaded = profileData.posts.reduce((acc, post) => acc + (post.isDownloaded ? 1 : 0), 0);

  // 2. Update allProfilesData.json
  const allProfilesData = await db.readProfilesData();
  const tempMiniProfileData = allProfilesData.find((profile) => profile.userName === userName);
  tempMiniProfileData.postsDownloaded = profileData.postsDownloaded;
  tempMiniProfileData.lastMediaDownloadDate = new Date().toISOString();

  tempMiniProfileData.lastMediaDownloadDate = new Date().toISOString();
  profileData.lastMediaDownloadDate = new Date().toISOString();

  // 3. Update user's Data
  await db.writeUserProfileData(profileData); // Updates the data of user about which post isDownloaded.
  await db.writeProfilesData.call(this, allProfilesData);
  return true;
};

// Example usage:
// downloadUserMedia('ashu.samota.1612');
downloadUserMedia("jitendra_goswami132");

module.exports = { downloadUserMedia };
