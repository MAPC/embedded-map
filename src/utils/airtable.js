import Airtable from "airtable";

const base = new Airtable({
  apiKey: process.env.REACT_APP_AIRTABLE_TOKEN,
}).base("appuLlZwmGGeG3m9k");

export const fetchProjects = (setProjects) => {
  let tempProjectObject = {};
  base("Greenway Projects")
    .select({
      view: "Grid view",
    })
    .eachPage(
      (records, fetchNextPage) => {
        records.forEach((record) => {
          if (record != null && record.get("Status") === "Published") {
            tempProjectObject[record.get("Name")] = {
              Lat: record.get("Lat"),
              Long: record.get("Long"),
              Description: record.get("Description"),
              Link: record.get("Link"),
            };
          }
        });

        fetchNextPage();
      },
      (err) => {
        if (err) {
          console.error(err);
          return;
        }
        setProjects(tempProjectObject);
      },
    );
};
