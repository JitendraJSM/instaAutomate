// req-res scraping is not applicable on Post page as i can find the right request and i think that is actually in the first request whose response is actually html content
//  There are more than one type of post page so first is to identity that then apply scraping for that
const postAndCommentsScraperAlgo = async function (url) {
  // 1. Check current page url if not then navigate to that page
  // 2. Get metaData form meta tag
  //            $('meta[name="description"]')
  //           <meta name="description" content="2,233 likes, 91 comments - chandani144__ on July 12, 2025">
  //    - This gives number of likes, number of comments, post owner username and date of posting
  //    - To extract this data use regular expression for example before string "likes" there is number that is likesCount and so on similar if you have any other better idea then use that.
  // 3. Get post's media id from
  //            $('meta[property="al:ios:url"]')
  //            <meta property="al:ios:url" content="instagram://media?id=3675173274767425015">
  //    - Here media id is "3675173274767425015"
  //    - using this media id create a request as given in the End as commented, that gives video link as video version
  // ---- Above this everything is same for all type of posts pages
  // 4. using let commentsArray = $$("._a9zj._a9zl").map(el=>el.innerText) you can get the available comments as below:
  //        - commentsArray = ["monuprajapati4262\n😍😍😍\n2d1 likeReply","monuprajapati4262\n😍😍😍\n2d1 likeReply","davinder.singh.mani\n😮😍🔥🔥🔥🔥😮😮😍😍😍😍\n2d1 likeReply","gdhuware123kd\n❤️❤️❤️❤️❤️❤️❤️❤️❤️❤️❤️❤️❤️❤️❤️Hiiii\n2d3 likesReply","kumars881061\nहमको पता हॉं\n2d2 likesReply\nSee translation","sarvesh_6037\nHhekhnxxxxxx😂😂😮😮😮😮\n2d2 likesReply"]
  //        - form this array you can scrape all available comments as object
  //        commentObj = {userName, commentText}
  //        - userName & commentText are separated by \n
  //        - then create a loop to scroll down so that more comments get loaded until commentsCount get equal to commentsArray.length using below function
  // const scrollDownInCommentsDataBox = () => {
  //     let container = document.querySelector("._a9z6._a9z9._a9za");
  //     container.scrollTop = container.scrollHeight;
  // };
  // then if more comments loaded after networkIdle scrpe then and then do same, but if not loaded then click
  // let getMoreCommentsBTN = $('svg[aria-label="Load more comments"]');
  //   and scrape again and do on so...
  // in the end return commentsArray which have all the comments
  //   some notable things are as that no duplicat comments should scraped
};

const postAndCommentsScraper = async function (url) {
  // Check if we're on the correct page, if not navigate to it
  if (window.location.href !== url) {
    await page.goto(url, { waitUntil: "networkidle0" });
  }

  // Extract post metadata from meta tags
  const extractPostMetadata = async () => {
    const descriptionMeta = document.querySelector('meta[name="description"]');
    const metaContent = descriptionMeta ? descriptionMeta.getAttribute("content") : "";

    // Parse metadata using regex
    const likesMatch = metaContent.match(/(\d+(?:,\d+)*) likes/);
    const commentsMatch = metaContent.match(/(\d+(?:,\d+)*) comments/);
    const usernameMatch = metaContent.match(/- ([\w._]+) on/);
    const dateMatch = metaContent.match(/on ([\w\s,]+)/);

    return {
      likesCount: likesMatch ? parseInt(likesMatch[1].replace(/,/g, "")) : 0,
      commentsCount: commentsMatch ? parseInt(commentsMatch[1].replace(/,/g, "")) : 0,
      username: usernameMatch ? usernameMatch[1] : "",
      postDate: dateMatch ? dateMatch[1] : "",
    };
  };

  // Extract media ID for potential video content
  const getMediaId = () => {
    const mediaMetaTag = document.querySelector('meta[property="al:ios:url"]');
    if (!mediaMetaTag) return null;

    const mediaContent = mediaMetaTag.getAttribute("content");
    const mediaIdMatch = mediaContent.match(/id=(\d+)/);
    return mediaIdMatch ? mediaIdMatch[1] : null;
  };

  // Function to scroll down in comments container
  const scrollDownInCommentsDataBox = () => {
    const container = document.querySelector("._a9z6._a9z9._a9za");
    if (container) {
      container.scrollTop = container.scrollHeight;
      return true;
    }
    return false;
  };

  // Function to click "Load more comments" button if available
  const clickLoadMoreComments = () => {
    const loadMoreButton = document.querySelector('svg[aria-label="Load more comments"]');
    if (loadMoreButton && loadMoreButton.parentElement) {
      loadMoreButton.parentElement.click();
      return true;
    }
    return false;
  };

  // Function to extract comments from DOM
  const extractComments = () => {
    const commentElements = document.querySelectorAll("._a9zj._a9zl");
    const commentsArray = Array.from(commentElements).map((el) => el.innerText);

    // Parse comments into structured objects
    return commentsArray
      .map((comment) => {
        const parts = comment.split("\n");
        if (parts.length >= 2) {
          return {
            username: parts[0],
            text: parts[1],
            metadata: parts.slice(2).join(" "), // Time, likes, reply info
          };
        }
        return null;
      })
      .filter(Boolean); // Remove any null entries
  };

  // Main execution
  try {
    // Get post metadata
    const metadata = await extractPostMetadata();
    const mediaId = getMediaId();

    // Initialize comments collection with deduplication
    const uniqueComments = new Map();
    let previousCommentsCount = 0;
    let loadAttempts = 0;
    const MAX_LOAD_ATTEMPTS = 20; // Prevent infinite loops

    // First extraction of available comments
    let currentComments = extractComments();
    currentComments.forEach((comment) => {
      uniqueComments.set(comment.username + "|" + comment.text, comment);
    });

    // Continue loading comments until we have all or reach max attempts
    while (uniqueComments.size < metadata.commentsCount && loadAttempts < MAX_LOAD_ATTEMPTS && uniqueComments.size > previousCommentsCount) {
      previousCommentsCount = uniqueComments.size;

      // Try scrolling down first
      const scrolled = scrollDownInCommentsDataBox();

      // Wait for potential new comments to load
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // If scrolling didn't work or we're at the bottom, try clicking "Load more"
      if (!scrolled || uniqueComments.size === previousCommentsCount) {
        const clicked = clickLoadMoreComments();
        if (!clicked) break; // No more comments to load
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      // Extract newly loaded comments
      currentComments = extractComments();
      currentComments.forEach((comment) => {
        uniqueComments.set(comment.username + "|" + comment.text, comment);
      });

      loadAttempts++;
    }

    // Prepare final result
    return {
      postMetadata: metadata,
      mediaId,
      comments: Array.from(uniqueComments.values()),
      totalCommentsScraped: uniqueComments.size,
    };
  } catch (error) {
    console.error("Error scraping post and comments:", error);
    return { error: error.message };
  }
};

module.exports = { postAndCommentsScraper };

// ========================================================================
// fetch("https://www.instagram.com/api/v1/media/3675173274767425015/info/", {
//   headers: {
//     accept: "*/*",
//     "accept-language": "en-US,en;q=0.9",
//     priority: "u=1, i",
//     "sec-ch-prefers-color-scheme": "light",
//     "sec-ch-ua": '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
//     "sec-ch-ua-full-version-list": '"Not)A;Brand";v="8.0.0.0", "Chromium";v="138.0.7204.101", "Google Chrome";v="138.0.7204.101"',
//     "sec-ch-ua-mobile": "?0",
//     "sec-ch-ua-model": '""',
//     "sec-ch-ua-platform": '"Windows"',
//     "sec-ch-ua-platform-version": '"10.0.0"',
//     "sec-fetch-dest": "empty",
//     "sec-fetch-mode": "cors",
//     "sec-fetch-site": "same-origin",
//     "x-asbd-id": "359341",
//     "x-csrftoken": "usvvW4eoQz52KNXPpOB1e9",
//     "x-ig-app-id": "936619743392459",
//     "x-ig-www-claim": "0",
//     "x-requested-with": "XMLHttpRequest",
//     "x-web-session-id": "n0pdu6:fj6p26:r8y53d",
//     cookie:
//       "csrftoken=usvvW4eoQz52KNXPpOB1e9; ps_l=1; ps_n=1; mid=aDcY-AALAAHecj0sENg3Y-dI0bgS; ig_did=23BCD5E4-5B81-4419-8806-F1F79AF0D917; ig_nrcb=1; datr=9Rg3aLqDHunf0CHSq1zEmUYp; ds_user_id=64724107848; dpr=1.25; sessionid=64724107848%3Axcvhu1wtGLtK0c%3A8%3AAYepXhGS2kB4gnTknv1YcKxV-BK03xedyQeCnyWiIQ0; wd=767x703",
//     Referer: "https://www.instagram.com/chandani144__/reel/DMA1p8ahX33/",
//   },
//   body: null,
//   method: "GET",
// });
// ========================================================================
