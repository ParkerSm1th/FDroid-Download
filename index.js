#!/usr/bin/env node
"use strict";
const rp = require("request-promise");
const cheerio = require("cheerio");
const { exec } = require("child_process");
const express = require("express");
const app = express();
const port = 3000;
var pjson = require("./package.json");
const fs = require("fs");

var ArgumentParser = require("argparse").ArgumentParser;
var parser = new ArgumentParser({
  version: "1.0",
  addHelp: true,
  description: "F-Droid Scraper",
});
parser.addArgument(["-path", "--path"], {
  help: "Path for outputs to go to, do NOT include trailing slash ex: /home/user/Downloads",
  required: true,
});
parser.addArgument(["-s", "--search"], {
  help: "Search term",
  required: true,
});
var args = parser.parseArgs();

console.log("💡 STARTING UP " + pjson.name + " v" + pjson.version + " 💡");
console.log(
  "🔎 Going to try to download APK's related to: " + args.search + "..."
);

function getDownloadFromLink(link) {
  let ogPackage = link.split("https://f-droid.org/en/packages/")[1];
  rp("https://f-droid.org/api/v1/packages/" + ogPackage).then(function (
    apiHTML
  ) {
    let jsonParsed = JSON.parse(apiHTML);
    let downloadLink =
      "https://f-droid.org/repo/" +
      jsonParsed.packageName +
      "_" +
      jsonParsed.suggestedVersionCode +
      ".apk";
    console.log("📥 Downloading " + jsonParsed.packageName);
    if (
      fs.existsSync(
        args.path +
          "/" +
          jsonParsed.packageName +
          "_" +
          jsonParsed.suggestedVersionCode +
          ".apk"
      )
    ) {
      console.log(
        "🗃️  Cancelling download, already exists: " + jsonParsed.packageName
      );
      return;
    }
    exec(
      "cd " + args.path + " && wget " + downloadLink,
      (error, stdout, stderr) => {
        if (error) {
          console.log("❌ Error downloading " + jsonParsed.packageName);
          return;
        }
        if (stderr) {
          if (
            fs.existsSync(
              args.path +
                "/" +
                jsonParsed.packageName +
                "_" +
                jsonParsed.suggestedVersionCode +
                ".apk"
            )
          ) {
            console.log("✅ Downloaded " + jsonParsed.packageName);
          }
          return;
        }
      }
    );
  });
}

function getAPKsFromTerm(term) {
  let keepLooping = true;
  let downloaded = [];
  for (let i = 1; i < 5; i++) {
    if (!keepLooping) return;
    const url = `https://search.f-droid.org/?q=${term}&lang=en&page=${i}`;
    rp(url)
      .then(function (html) {
        //success!
        const $ = cheerio.load(html);
        for (let pack in $("a.package-header", html)) {
          if ($("a.package-header", html)[pack].attribs == undefined) return;
          if (
            downloaded.includes($("a.package-header", html)[pack].attribs.href)
          )
            return;
          downloaded.push($("a.package-header", html)[pack].attribs.href);
          getDownloadFromLink($("a.package-header", html)[pack].attribs.href);
        }
      })
      .catch(function (err) {
        console.log(err);
        keepLooping = false;
      });
  }
}

getAPKsFromTerm(args.search);
