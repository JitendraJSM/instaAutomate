# Development Until now -

1. New profile add
   - When ever a new profile added all other profile's get a due Task to follow that new profile
   - And that new profile get due tasks to follow all other agents profiles and scrapers profiles.
2. Follow by Script
   - When ever a follow dueTask is done it will get's removed from profilesData.json from that profile and also from it's own Data file.
   - And pushed to it's own Data file's automatedFollowed array[] as {"userName": "manisha.sen.25","date": "2025-06-15T13:41:57.957Z"}

# To Develop

1. Scraper

# Research / Analaysis

- To scrape all posts and their meta data user must scroll through whole reels / posts page and intercept
  All requests to "https://www.instagram.com/graphql/query" which have
  headers= { ...otherHeaders, "x-fb-friendly-name": "PolarisProfilePostsQuery", ...otherHeaders }
  Or
  headers= { ...otherHeaders, "x-fb-friendly-name": "PolarisProfilePostsTabContentQuery_connection", ...otherHeaders }
- What to Scrape is `res.JSON().data.xdt_api__v1__feed__user_timeline_graphql_connection.edges` is Actually an array of 12 object in which each object contains 2 properties 1. node (i.e. postMetaData) & 2. cursor (i.e. Emply property)
- Reel's URL is : `https://www.instagram.com/${userNameOfAccountOwner}/reel/${node.code}`
- HD Video URL is : `node.video_versions[0].url` or `node.video_versions[1].url` or `node.video_versions[2].url` Each of these 3 must have width=720 && height=1280, Then "\u0026" must be replaced by "&" in the url, (TODO: Also you must check which one of these 3 is highest in Quality)
- To confirm Check `node.user.username` or `node.owner.username`
- TODO: Check other these given below meta data for other posts
  `node.title`
  `node.comment_count`
  `node.like_count`
  `node.view_count`
  `node.media_type`
  `node.clips_metadata`
  `node.comments`
