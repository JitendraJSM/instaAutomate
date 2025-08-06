class Database {
  constructor() {
    // Using Map as an in-memory database to store collections of documents
    // Each collection is stored as a key-value pair where:
    // - key: collection name
    // - value: array of documents
    this.collections = new Map();
  }

  // Create a new collection
  createCollection(collectionName) {
    if (!this.collections.has(collectionName)) {
      this.collections.set(collectionName, []);
      return true;
    }
    return false;
  }

  // Insert document into collection
  insert(collectionName, document) {
    if (!this.collections.has(collectionName)) {
      return false;
    }
    this.collections.get(collectionName).push(document);
    return true;
  }

  // Find documents in collection
  find(collectionName, query = {}) {
    if (!this.collections.has(collectionName)) {
      return [];
    }
    const collection = this.collections.get(collectionName);
    if (Object.keys(query).length === 0) {
      return collection;
    }
    return collection.filter((doc) =>
      Object.entries(query).every(([key, value]) => doc[key] === value)
    );
  }

  // Update documents in collection
  update(collectionName, query, newData) {
    if (!this.collections.has(collectionName)) {
      return false;
    }
    const collection = this.collections.get(collectionName);
    collection.forEach((doc, index) => {
      if (Object.entries(query).every(([key, value]) => doc[key] === value)) {
        collection[index] = { ...doc, ...newData };
      }
    });
    return true;
  }

  // Delete documents from collection
  delete(collectionName, query) {
    if (!this.collections.has(collectionName)) {
      return false;
    }
    const collection = this.collections.get(collectionName);
    this.collections.set(
      collectionName,
      collection.filter(
        (doc) =>
          !Object.entries(query).every(([key, value]) => doc[key] === value)
      )
    );
    return true;
  }
}
// mainList = [{uniqueProperty:value, creationDateProperty: dateString, lastUpdateDateProperty: dateString, dataPath: pathString},........];
//  readMainList = async () => JSON.parse(await fs.readFile(db[`${mainList}Path`]));
//  writeMainList = async (dataToWrite) => await fs.writeFile(db[`${mainList}Path`], JSON.stringify(dataToWrite, null, 2));
// findInMainList = (query) => {
// if query is an string (means that is an uniqueProperty's value) so then we search for that in the mainList
//   findInMainList = mainList.find((element) => element.uniqueProperty === uniquePropertyValue);
// }

// To understand what methods are needed on the database instance (let's call it db), let's write down the operations we want to perform on it:
// 1. this.state.allProfilesData = await db.readAllProfilesData()
// const readAllProfilesData = async () => JSON.parse(await fs.readFile("./data/allProfilesData.json"));
// readAllProfilesData.shouldStoreState = "profilesData";
// 2. await db.writeAllProfilesData(this.state.profilesData)
// const writeAllProfilesData = async (dataToWrite) => await fs.writeFile("./data/allProfilesData.json", JSON.stringify(dataToWrite, null, 2));
// 3. const checkPofileExistsOrNot = (query) => {
//   if (typeof query === "string") {
//     const index = allProfilesData.findIndex(element => element.uniqueProperty === query);
//     isPofileExists = index !== -1;
//     return { exists: isPofileExists, index: index };
//   }
//   if (typeof query === "object") {
//     const index = allProfilesData.findIndex(element => Object.entries(query).every(([key, value]) => element[key] === value));
//     isPofileExists = index !== -1;
//     return { exists: isPofileExists, index: index };
//   }
// };

// Create a class name of dataList
//  -  this dataList class's instance are actually array of objects
//  -  but these arrays have some methods to perform operations on them
//  -  these objects are some what similar to then given object:
//        {uniqueProperty:value, dataPath: pathString,creationDateProperty: dateString, lastUpdateDateProperty: dateString, ...otherProperties}
//  Suppose we created a new instance of dataList class as given below line
// const allProfilesData = new DataList("./data/allProfilesData.json","uniquePropertyName");
// and called it as "allProfilesData", then allProfilesData is actually an array of objects and what operations / methods we need on it are as below:
// 1. this.state.allProfilesData = await allProfilesData.read()
// 2. await allProfilesData.write(this.state.allProfilesData)
// 3. allProfilesData.checkElementExistsOrNot = (query) => {
//   if (typeof query === "string") {
//     const index = allProfilesData.findIndex(element => element.uniqueProperty === query);
//   if (index === -1) {
//   console.log(`Element does exists with ${uniqueProperty} = ${data[uniqueProperty]}`);
//   return false;
// }
//     else return index;
//   }
//   if (typeof query === "object") {
//     const index = allProfilesData.findIndex(element => Object.entries(query).every(([key, value]) => element[key] === value));
//     if(index === -1) return false;
//     else return index;
//   }
// };
// 4. allProfilesData.insert = (data) => {
//         - check if data is already exists or not
//          const isElementExists = allProfilesData.checkElementExistsOrNot(data[uniqueProperty]);
//          if (isElementExists) return false;
//         - if not exists then insert it
//          allProfilesData.push(data);
//         - write the updated allProfilesData to the file
//          await allProfilesData.write(allProfilesData);
//          return true;
// }
// 5. allProfilesData.update = (query, newData) => {
//         - check if data is already exists or not
//          const isElementExists = allProfilesData.checkElementExistsOrNot(query);
//          if (!isElementExists) return false;
//         - if exists then update it
//          allProfilesData[isElementExists] = {...allProfilesData[isElementExists],...newData };
//         - write the updated allProfilesData to the file
//          await allProfilesData.write(allProfilesData);
//          return true;
// }
// 6. allProfilesData.delete = (query) => {
//         - check if data is already exists or not
//          const isElementExists = allProfilesData.checkElementExistsOrNot(query);
//          if (!isElementExists)  return false;
//         - if exists then delete it from the allProfilesData
//          allProfilesData.splice(isElementExists, 1);
//         - write the updated allProfilesData to the file
//          await allProfilesData.write(allProfilesData);
//          return true;
// }
// 7. allProfilesData.find = (query) => {
//         - check if data is already exists or not
//          const isElementExists = allProfilesData.checkElementExistsOrNot(query);
//          if (!isElementExists) return false;
//         - if exists then return it
//          return allProfilesData[isElementExists];
// }

// --------------------------------------------------------------------------------------
// Create a class name of tasksList (may be extends dataList)
//  -  this tasksList class's instance are actually 2 dataLists
//  -  one for tasks that are not completed and another for tasks that are completed.
//  -  these objects are some what similar to then given object:
//  Suppose we created a new instance of tasksList class and called it as "targetStrings", then targetStrings object is actually 2 dataLists and what operations / methods we need on it are as below:
//
