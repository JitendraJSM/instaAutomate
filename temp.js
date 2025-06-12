const fs = require("fs").promises;

/*
let arr = [1, 2, 3, 4, 5, 9, 10];
let i = 0;
while (i < arr.length) {
  console.log(`At index  ${i} the value is : ${arr[i]}.`);
  if (arr[i] === 5) {
    arr.splice(i + 1, 0, 6, 7, 8); // insert elements at index i
    // i += 4; // move past the inserted elements and the original 5
    // continue;
  }
  i++;
}
console.log("--- Loop finished ---");
console.log("Final array:", arr);
*/
// =====================================
async function tempFunction(arguments) {
  console.log(`Executing tempFunction with arguments`);
  console.log(arguments);
}

async function main() {
  const path = "./data/instaData/agentsData/kajalmahioffical143-data.json";

  try {
    const data = JSON.parse(await fs.readFile(path, "utf-8"));
    console.log(data.dueTasks[0]);
    delete data.dueTasks[0].actionName;
    console.log(data.dueTasks[0]);
    console.log(`Function to execute: ${functionName}`);
    // const args = data.dueTasks[0].delete("actionName")
    // console.log()
    //     await eval(`${functionName}(${JSON.stringify(args)})`);
  } catch (err) {
    console.error("Error reading JSON file:", err);
  }
}

main();
